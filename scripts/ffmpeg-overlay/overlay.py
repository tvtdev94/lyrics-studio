"""Burn ASS subtitles into video or add soft subtitle tracks using FFmpeg."""

import argparse
import subprocess
import sys
from pathlib import Path


def burn_subtitle(
    video_path: str,
    subtitle_path: str,
    output_path: str,
    font_dir: str | None = None,
) -> None:
    """Burn ASS subtitle into video (hardcoded)."""
    # FFmpeg filter requires forward slashes and escaped colons/backslashes
    # For Windows: C:\path → C\\:/path (escape backslash, then colon)
    sub_escaped = subtitle_path.replace("\\", "/")
    # Escape colons (but handle drive letter: only escape after position 1)
    if len(sub_escaped) > 1 and sub_escaped[1] == ":":
        sub_escaped = sub_escaped[0] + "\\:" + sub_escaped[2:]

    vf = f"ass='{sub_escaped}'"
    if font_dir:
        font_escaped = font_dir.replace("\\", "/")
        vf += f":fontsdir='{font_escaped}'"

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


def add_soft_subs(
    video_path: str,
    subtitle_files: list[str],
    languages: list[str],
    output_path: str,
) -> None:
    """Add multiple soft subtitle tracks with language metadata."""
    cmd = ["ffmpeg", "-y", "-i", video_path]

    for sub_file in subtitle_files:
        cmd.extend(["-i", sub_file])

    # Map video + audio from first input
    cmd.extend(["-map", "0:v", "-map", "0:a?"])

    # Map each subtitle input
    for i in range(len(subtitle_files)):
        cmd.extend(["-map", str(i + 1)])

    # Set codec and language metadata
    cmd.extend(["-c:v", "copy", "-c:a", "copy", "-c:s", "ass"])
    for i, lang in enumerate(languages):
        cmd.extend([f"-metadata:s:s:{i}", f"language={lang}"])

    cmd.append(output_path)

    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, check=True, timeout=600)
    print(f"Output: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="FFmpeg subtitle overlay tool")
    sub = parser.add_subparsers(dest="command", required=True)

    # burn command
    burn = sub.add_parser("burn", help="Burn subtitle into video")
    burn.add_argument("--video", required=True, help="Input video path")
    burn.add_argument("--subtitle", required=True, help="ASS subtitle path")
    burn.add_argument("--output", required=True, help="Output video path")
    burn.add_argument("--font-dir", help="Font directory for custom fonts")

    # soft command
    soft = sub.add_parser("soft", help="Add soft subtitle tracks")
    soft.add_argument("--video", required=True, help="Input video path")
    soft.add_argument("--subtitles", nargs="+", required=True, help="Subtitle files")
    soft.add_argument("--languages", nargs="+", required=True, help="Language codes")
    soft.add_argument("--output", required=True, help="Output video path")

    args = parser.parse_args()

    if args.command == "burn":
        burn_subtitle(args.video, args.subtitle, args.output, args.font_dir)
    elif args.command == "soft":
        if len(args.subtitles) != len(args.languages):
            print("Error: number of subtitles must match number of languages", file=sys.stderr)
            sys.exit(1)
        add_soft_subs(args.video, args.subtitles, args.languages, args.output)


if __name__ == "__main__":
    main()
