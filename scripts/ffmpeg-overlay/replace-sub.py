"""Replace burned-in subtitles: cover old subs with overlay, then burn new ASS subtitle."""

import argparse
import subprocess
import sys
from pathlib import Path


def build_cover_filter(method: str, position: str, height: int,
                       offset: int | None, color: str, opacity: float,
                       video_height: int | None = None) -> str:
    """Build FFmpeg filter string to cover the subtitle region."""
    # Calculate Y position based on position preset or custom offset
    if offset is not None:
        y_expr = str(offset)
    elif position == "bottom":
        y_expr = f"ih-{height}"
    elif position == "top":
        y_expr = "0"
    elif position == "center":
        y_expr = f"(ih-{height})/2"
    else:
        y_expr = f"ih-{height}"

    if method == "solid":
        # Parse hex color and apply opacity
        hex_color = color.lstrip("#")
        return f"drawbox=x=0:y={y_expr}:w=iw:h={height}:color=0x{hex_color}@{opacity}:t=fill"

    elif method == "blur":
        # Crop the region, blur it heavily, overlay back at same position
        # overlay uses main_h (height of main input) to compute Y
        return (
            f"[0:v]split[main][bg];"
            f"[bg]crop=iw:{height}:0:{y_expr},boxblur=20:5[blurred];"
            f"[main][blurred]overlay=0:H-{height}[covered]"
        )

    elif method == "gradient":
        # Gradient: solid box with lower opacity for smoother blend
        hex_color = color.lstrip("#")
        fade_h = min(height // 3, 30)
        # Two-pass: semi-transparent box + feathered edges
        return (
            f"drawbox=x=0:y={y_expr}:w=iw:h={height}:color=0x{hex_color}@{opacity * 0.7}:t=fill,"
            f"drawbox=x=0:y={y_expr}:w=iw:h={fade_h}:color=0x{hex_color}@{opacity * 0.3}:t=fill"
        )

    else:
        print(f"Error: unknown cover method '{method}'", file=sys.stderr)
        sys.exit(1)


def escape_ass_path(path: str) -> str:
    """Escape ASS subtitle path for FFmpeg filter on Windows."""
    escaped = path.replace("\\", "/")
    if len(escaped) > 1 and escaped[1] == ":":
        escaped = escaped[0] + "\\:" + escaped[2:]
    return escaped


def replace_subtitle(
    video_path: str,
    subtitle_path: str,
    output_path: str,
    cover_position: str = "bottom",
    cover_height: int = 120,
    cover_offset: int | None = None,
    cover_method: str = "solid",
    cover_color: str = "#000000",
    cover_opacity: float = 1.0,
    font_dir: str | None = None,
) -> None:
    """Cover existing subtitle region and burn new ASS subtitle."""
    # Build the cover filter
    cover_vf = build_cover_filter(
        method=cover_method,
        position=cover_position,
        height=cover_height,
        offset=cover_offset,
        color=cover_color,
        opacity=cover_opacity,
    )

    # Build the ASS subtitle filter
    sub_escaped = escape_ass_path(subtitle_path)
    ass_vf = f"ass='{sub_escaped}'"
    if font_dir:
        font_escaped = font_dir.replace("\\", "/")
        ass_vf += f":fontsdir='{font_escaped}'"

    # Build ffmpeg command based on filter complexity
    is_complex = ";" in cover_vf
    if is_complex:
        # Complex filtergraph (blur): use -filter_complex
        # cover_vf outputs [covered], then chain ASS and output [out]
        filtergraph = f"{cover_vf};[covered]{ass_vf}[out]"
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-filter_complex", filtergraph,
            "-map", "[out]", "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-c:a", "copy",
            output_path,
        ]
    else:
        # Simple filter chain: use -vf
        vf = f"{cover_vf},{ass_vf}"
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-c:a", "copy",
            output_path,
        ]

    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, check=True, timeout=600)
    print(f"Output: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Replace burned-in subtitles in a video"
    )
    parser.add_argument("--video", required=True, help="Input video path")
    parser.add_argument("--subtitle", required=True, help="New ASS subtitle path")
    parser.add_argument("--output", required=True, help="Output video path")

    # Cover options
    parser.add_argument(
        "--cover-position", default="bottom",
        choices=["top", "center", "bottom"],
        help="Position of existing subtitle to cover (default: bottom)"
    )
    parser.add_argument(
        "--cover-height", type=int, default=120,
        help="Height in pixels of cover area (default: 120)"
    )
    parser.add_argument(
        "--cover-offset", type=int, default=None,
        help="Custom Y offset from top (overrides --cover-position)"
    )
    parser.add_argument(
        "--cover-method", default="solid",
        choices=["solid", "blur", "gradient"],
        help="Cover method (default: solid)"
    )
    parser.add_argument(
        "--cover-color", default="#000000",
        help="Cover color hex for solid/gradient (default: #000000)"
    )
    parser.add_argument(
        "--cover-opacity", type=float, default=1.0,
        help="Cover opacity 0.0-1.0 (default: 1.0)"
    )
    parser.add_argument(
        "--font-dir", help="Font directory for custom fonts"
    )

    args = parser.parse_args()
    replace_subtitle(
        video_path=args.video,
        subtitle_path=args.subtitle,
        output_path=args.output,
        cover_position=args.cover_position,
        cover_height=args.cover_height,
        cover_offset=args.cover_offset,
        cover_method=args.cover_method,
        cover_color=args.cover_color,
        cover_opacity=args.cover_opacity,
        font_dir=args.font_dir,
    )


if __name__ == "__main__":
    main()
