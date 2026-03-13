"""Reup pipeline: watermark removal, sub replacement, metadata cleanup, transforms."""

import argparse
import json
import subprocess
import sys
import random
from pathlib import Path


def probe_video(video_path: str) -> dict:
    """Get video info using ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams", "-show_format",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout)


def get_video_dimensions(video_path: str) -> tuple[int, int]:
    """Return (width, height) of the video."""
    info = probe_video(video_path)
    for stream in info.get("streams", []):
        if stream["codec_type"] == "video":
            return int(stream["width"]), int(stream["height"])
    raise ValueError(f"No video stream found in {video_path}")


# --- Subtitle region presets for common TikTok/Douyin layouts ---
SUBTITLE_PRESETS = {
    "douyin-bottom": {"position": "bottom", "height": 120, "offset": None},
    "douyin-center": {"position": "center", "height": 100, "offset": None},
    "tiktok-bottom": {"position": "bottom", "height": 100, "offset": None},
    "custom": {"position": "bottom", "height": 120, "offset": None},
}

# --- Watermark presets for common TikTok/Douyin logos ---
WATERMARK_PRESETS = {
    "douyin": [
        # Douyin logo top-right corner (relative offsets resolved at runtime)
        {"rx": -200, "ry": 20, "w": 180, "h": 50},
        # Douyin username bottom-left
        {"rx": 20, "ry": -180, "w": 250, "h": 40},
    ],
    "tiktok": [
        # TikTok logo bottom-right
        {"rx": -140, "ry": -220, "w": 120, "h": 120},
        # TikTok username bottom-left
        {"rx": 20, "ry": -110, "w": 200, "h": 30},
    ],
    "none": [],
}


def resolve_watermark_regions(preset: str, video_w: int, video_h: int) -> list[dict]:
    """Resolve relative watermark positions to absolute pixel values."""
    raw = WATERMARK_PRESETS.get(preset, [])
    resolved = []
    for r in raw:
        x = r["rx"] if r["rx"] >= 0 else video_w + r["rx"]
        y = r["ry"] if r["ry"] >= 0 else video_h + r["ry"]
        resolved.append({"x": max(0, x), "y": max(0, y), "w": r["w"], "h": r["h"]})
    return resolved


def build_watermark_filter(regions: list[dict], method: str = "blur") -> str:
    """Build FFmpeg filter to remove watermark regions."""
    if not regions:
        return ""

    filters = []
    for r in regions:
        if method == "blur":
            filters.append(
                f"delogo=x={r['x']}:y={r['y']}:w={r['w']}:h={r['h']}:show=0"
            )
        elif method == "solid":
            filters.append(
                f"drawbox=x={r['x']}:y={r['y']}:w={r['w']}:h={r['h']}:color=black:t=fill"
            )

    return ",".join(filters)


def build_transform_filter(
    speed: float = 1.0,
    mirror: bool = False,
    brightness: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
) -> str:
    """Build FFmpeg filter for subtle video transforms to avoid hash detection."""
    filters = []

    if mirror:
        filters.append("hflip")

    # Color adjustments (eq filter)
    if brightness != 0.0 or contrast != 1.0 or saturation != 1.0:
        filters.append(
            f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}"
        )

    # Speed change applied via setpts (video) - audio handled separately
    if speed != 1.0:
        pts_factor = 1.0 / speed
        filters.append(f"setpts={pts_factor:.4f}*PTS")

    return ",".join(filters)


def build_aspect_ratio_filter(
    src_w: int, src_h: int,
    target_ratio: str,
) -> str:
    """Build filter to convert aspect ratio with blur background padding."""
    if target_ratio == "16:9":
        target_w, target_h = 1920, 1080
    elif target_ratio == "9:16":
        target_w, target_h = 1080, 1920
    else:
        return ""

    src_ratio = src_w / src_h
    target_r = target_w / target_h

    if abs(src_ratio - target_r) < 0.05:
        # Already close to target ratio, just scale
        return f"scale={target_w}:{target_h}"

    # Create blurred background + centered original
    return (
        f"split[original][bg];"
        f"[bg]scale={target_w}:{target_h}:force_original_aspect_ratio=increase,"
        f"crop={target_w}:{target_h},boxblur=25:5[blurred];"
        f"[original]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease[scaled];"
        f"[blurred][scaled]overlay=(W-w)/2:(H-h)/2"
    )


def build_preview_command(video_path: str, filters: str, output_path: str,
                          timestamp: str = "00:00:05") -> list[str]:
    """Build ffmpeg command to extract a single frame preview."""
    cmd = ["ffmpeg", "-y", "-ss", timestamp, "-i", video_path]
    if ";" in filters:
        cmd.extend(["-filter_complex", filters, "-frames:v", "1", output_path])
    else:
        cmd.extend(["-vf", filters, "-frames:v", "1", output_path])
    return cmd


def run_pipeline(
    video_path: str,
    output_path: str,
    # Subtitle replacement
    subtitle_path: str | None = None,
    sub_preset: str = "douyin-bottom",
    cover_method: str = "solid",
    cover_color: str = "#000000",
    cover_opacity: float = 0.9,
    cover_height: int | None = None,
    cover_offset: int | None = None,
    # Watermark removal
    watermark_preset: str = "none",
    watermark_method: str = "blur",
    # Transforms
    speed: float = 1.0,
    mirror: bool = False,
    brightness: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    # Aspect ratio
    target_ratio: str | None = None,
    # Metadata
    strip_metadata: bool = True,
    # Preview
    preview_only: bool = False,
    preview_time: str = "00:00:05",
    # Font
    font_dir: str | None = None,
) -> None:
    """Run the full reup pipeline."""
    src_w, src_h = get_video_dimensions(video_path)
    print(f"Input: {video_path} ({src_w}x{src_h})")

    # Collect all simple filters (non-complex, no stream splits)
    simple_filters: list[str] = []
    complex_filter: str | None = None

    # 1. Watermark removal
    wm_regions = resolve_watermark_regions(watermark_preset, src_w, src_h)
    wm_filter = build_watermark_filter(wm_regions, watermark_method)
    if wm_filter:
        simple_filters.append(wm_filter)

    # 2. Subtitle cover + burn
    if subtitle_path:
        preset = SUBTITLE_PRESETS.get(sub_preset, SUBTITLE_PRESETS["douyin-bottom"])
        h = cover_height or preset["height"]
        offset = cover_offset if cover_offset is not None else preset.get("offset")

        # Y position
        pos = preset["position"]
        if offset is not None:
            y_expr = str(offset)
        elif pos == "bottom":
            y_expr = f"ih-{h}"
        elif pos == "top":
            y_expr = "0"
        elif pos == "center":
            y_expr = f"(ih-{h})/2"
        else:
            y_expr = f"ih-{h}"

        hex_color = cover_color.lstrip("#")

        if cover_method == "solid":
            simple_filters.append(
                f"drawbox=x=0:y={y_expr}:w=iw:h={h}:color=0x{hex_color}@{cover_opacity}:t=fill"
            )
        elif cover_method == "gradient":
            fade_h = min(h // 3, 30)
            simple_filters.append(
                f"drawbox=x=0:y={y_expr}:w=iw:h={h}:color=0x{hex_color}@{cover_opacity * 0.7}:t=fill,"
                f"drawbox=x=0:y={y_expr}:w=iw:h={fade_h}:color=0x{hex_color}@{cover_opacity * 0.3}:t=fill"
            )
        # blur cover handled later as complex filter

        # Burn new subtitle
        sub_escaped = subtitle_path.replace("\\", "/")
        if len(sub_escaped) > 1 and sub_escaped[1] == ":":
            sub_escaped = sub_escaped[0] + "\\:" + sub_escaped[2:]
        ass_filter = f"ass='{sub_escaped}'"
        if font_dir:
            font_escaped = font_dir.replace("\\", "/")
            ass_filter += f":fontsdir='{font_escaped}'"
        simple_filters.append(ass_filter)

    # 3. Video transforms
    transform = build_transform_filter(speed, mirror, brightness, contrast, saturation)
    if transform:
        simple_filters.append(transform)

    # 4. Aspect ratio conversion (complex filter if needed)
    if target_ratio:
        ar_filter = build_aspect_ratio_filter(src_w, src_h, target_ratio)
        if ";" in ar_filter:
            # Complex filter - needs special handling
            # Prepend simple filters before the split
            if simple_filters:
                complex_filter = ",".join(simple_filters) + "," + ar_filter
            else:
                complex_filter = ar_filter
            simple_filters = []
        elif ar_filter:
            simple_filters.append(ar_filter)

    # Build ffmpeg command
    vf = ",".join(simple_filters) if simple_filters else None
    is_complex = complex_filter is not None

    if preview_only:
        # Preview: render single frame
        preview_out = output_path.rsplit(".", 1)[0] + "-preview.jpg"
        total_filter = complex_filter or vf or ""
        cmd = build_preview_command(video_path, total_filter, preview_out, preview_time)
        print(f"Preview: {preview_out}")
        subprocess.run(cmd, check=True, timeout=30)
        print(f"Done: {preview_out}")
        return

    # Full render
    cmd = ["ffmpeg", "-y", "-i", video_path]

    if is_complex:
        # Handle output label for complex filter
        cf = complex_filter
        if not cf.endswith("]"):
            cf += "[out]"
            cmd.extend(["-filter_complex", cf, "-map", "[out]", "-map", "0:a?"])
        else:
            cmd.extend(["-filter_complex", cf, "-map", "0:a?"])
    elif vf:
        cmd.extend(["-vf", vf])

    # Audio speed adjustment
    if speed != 1.0:
        cmd.extend(["-af", f"atempo={speed}"])

    # Video codec
    cmd.extend(["-c:v", "libx264", "-preset", "medium", "-crf", "18"])

    # Audio codec
    if speed != 1.0:
        cmd.extend(["-c:a", "aac", "-b:a", "192k"])
    else:
        cmd.extend(["-c:a", "copy"])

    # Strip metadata
    if strip_metadata:
        cmd.extend(["-map_metadata", "-1", "-metadata", "encoder="])

    cmd.append(output_path)

    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, check=True, timeout=600)
    print(f"Output: {output_path}")


def save_template(args: argparse.Namespace, template_path: str) -> None:
    """Save current args as a reusable JSON template."""
    config = {k: v for k, v in vars(args).items()
              if k not in ("video", "output", "save_template", "load_template",
                           "preview", "preview_time")}
    Path(template_path).write_text(json.dumps(config, indent=2), encoding="utf-8")
    print(f"Template saved: {template_path}")


def load_template(template_path: str) -> dict:
    """Load a JSON template."""
    return json.loads(Path(template_path).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Reup pipeline for TikTok/Douyin videos")
    parser.add_argument("--video", required=True, help="Input video path")
    parser.add_argument("--output", default="output/reup.mp4", help="Output video path")

    # Subtitle replacement
    sub_group = parser.add_argument_group("Subtitle replacement")
    sub_group.add_argument("--subtitle", help="New subtitle file (ASS/SRT/LRC)")
    sub_group.add_argument("--sub-preset", default="douyin-bottom",
                           choices=list(SUBTITLE_PRESETS.keys()),
                           help="Subtitle position preset (default: douyin-bottom)")
    sub_group.add_argument("--cover-method", default="solid",
                           choices=["solid", "gradient"],
                           help="Cover method (default: solid)")
    sub_group.add_argument("--cover-color", default="#000000", help="Cover color hex")
    sub_group.add_argument("--cover-opacity", type=float, default=0.9, help="Cover opacity")
    sub_group.add_argument("--cover-height", type=int, help="Override cover height (px)")
    sub_group.add_argument("--cover-offset", type=int, help="Custom Y offset from top")

    # Watermark removal
    wm_group = parser.add_argument_group("Watermark removal")
    wm_group.add_argument("--watermark", default="none",
                          choices=list(WATERMARK_PRESETS.keys()),
                          help="Watermark preset (default: none)")
    wm_group.add_argument("--watermark-method", default="blur",
                          choices=["blur", "solid"],
                          help="Watermark removal method (default: blur)")

    # Transforms
    tf_group = parser.add_argument_group("Video transforms (anti-detection)")
    tf_group.add_argument("--speed", type=float, default=1.0,
                          help="Playback speed multiplier (default: 1.0)")
    tf_group.add_argument("--mirror", action="store_true", help="Horizontal flip")
    tf_group.add_argument("--brightness", type=float, default=0.0,
                          help="Brightness adjustment -1.0 to 1.0 (default: 0)")
    tf_group.add_argument("--contrast", type=float, default=1.0,
                          help="Contrast multiplier (default: 1.0)")
    tf_group.add_argument("--saturation", type=float, default=1.0,
                          help="Saturation multiplier (default: 1.0)")
    tf_group.add_argument("--randomize", action="store_true",
                          help="Apply subtle random transforms automatically")

    # Aspect ratio
    ar_group = parser.add_argument_group("Aspect ratio")
    ar_group.add_argument("--ratio", choices=["16:9", "9:16"],
                          help="Convert to target aspect ratio with blur padding")

    # Metadata
    parser.add_argument("--keep-metadata", action="store_true",
                        help="Keep original metadata (default: strip)")

    # Preview
    parser.add_argument("--preview", action="store_true",
                        help="Render single frame preview instead of full video")
    parser.add_argument("--preview-time", default="00:00:05",
                        help="Timestamp for preview frame (default: 00:00:05)")

    # Template
    parser.add_argument("--save-template", help="Save settings to JSON template file")
    parser.add_argument("--load-template", help="Load settings from JSON template file")

    # Font
    parser.add_argument("--font-dir", help="Font directory for custom fonts")

    args = parser.parse_args()

    # Load template if provided (override defaults, but CLI args take precedence)
    if args.load_template:
        template = load_template(args.load_template)
        for key, val in template.items():
            if getattr(args, key, None) == parser.get_default(key):
                setattr(args, key, val)
        print(f"Loaded template: {args.load_template}")

    # Randomize subtle transforms
    if args.randomize:
        args.speed = round(random.uniform(1.01, 1.04), 3)
        args.brightness = round(random.uniform(-0.03, 0.03), 3)
        args.contrast = round(random.uniform(0.98, 1.02), 3)
        args.saturation = round(random.uniform(0.97, 1.03), 3)
        print(f"  Randomized: speed={args.speed}, brightness={args.brightness}, "
              f"contrast={args.contrast}, saturation={args.saturation}")

    # Save template if requested
    if args.save_template:
        save_template(args, args.save_template)

    run_pipeline(
        video_path=args.video,
        output_path=args.output,
        subtitle_path=args.subtitle,
        sub_preset=args.sub_preset,
        cover_method=args.cover_method,
        cover_color=args.cover_color,
        cover_opacity=args.cover_opacity,
        cover_height=args.cover_height,
        cover_offset=args.cover_offset,
        watermark_preset=args.watermark,
        watermark_method=args.watermark_method,
        speed=args.speed,
        mirror=args.mirror,
        brightness=args.brightness,
        contrast=args.contrast,
        saturation=args.saturation,
        target_ratio=args.ratio,
        strip_metadata=not args.keep_metadata,
        preview_only=args.preview,
        preview_time=args.preview_time,
        font_dir=args.font_dir,
    )


if __name__ == "__main__":
    main()
