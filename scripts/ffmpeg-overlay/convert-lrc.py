"""Convert LRC/SRT files to ASS format with optional karaoke tags."""

import argparse
import json
import re
import sys
from pathlib import Path


def parse_lrc(content: str) -> list[dict]:
    """Parse LRC content to list of {start, end, text} dicts."""
    lines = []
    pattern = re.compile(r"\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.+)")

    for raw in content.splitlines():
        m = pattern.match(raw.strip())
        if not m:
            continue
        mins, secs, ms_str, text = m.groups()
        ms = int(ms_str) * 10 if len(ms_str) == 2 else int(ms_str)
        start = int(mins) * 60 + int(secs) + ms / 1000
        lines.append({"start": start, "end": 0.0, "text": text.strip()})

    # Calculate end times
    for i in range(len(lines)):
        lines[i]["end"] = lines[i + 1]["start"] if i < len(lines) - 1 else lines[i]["start"] + 5

    return lines


def parse_srt(content: str) -> list[dict]:
    """Parse SRT content to list of {start, end, text} dicts."""
    lines = []
    blocks = re.split(r"\n\s*\n", content.strip())
    ts_pattern = re.compile(r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{2,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{2,3})")

    for block in blocks:
        block_lines = block.strip().splitlines()
        for i, line in enumerate(block_lines):
            m = ts_pattern.search(line)
            if m:
                h1, m1, s1, ms1, h2, m2, s2, ms2 = m.groups()
                ms1_norm = int(ms1) * 10 if len(ms1) == 2 else int(ms1)
                ms2_norm = int(ms2) * 10 if len(ms2) == 2 else int(ms2)
                start = int(h1) * 3600 + int(m1) * 60 + int(s1) + ms1_norm / 1000
                end = int(h2) * 3600 + int(m2) * 60 + int(s2) + ms2_norm / 1000
                text = " ".join(block_lines[i + 1:]).strip()
                text = re.sub(r"<[^>]+>", "", text)  # Strip HTML tags
                if text:
                    lines.append({"start": start, "end": end, "text": text})
                break

    return lines


def seconds_to_ass_time(seconds: float) -> str:
    """Convert seconds to ASS time format H:MM:SS.cc"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = round((seconds % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def to_ass(
    lines: list[dict],
    font: str = "Noto Sans",
    font_size: int = 24,
    primary_color: str = "&H00FFFFFF",
    outline_color: str = "&H80000000",
) -> str:
    """Convert parsed lyrics to ASS format string."""
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{font_size},{primary_color},&H0000FFFF,{outline_color},&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,20,20,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    dialogues = []
    for line in lines:
        start = seconds_to_ass_time(line["start"])
        end = seconds_to_ass_time(line["end"])
        dialogues.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{line['text']}")

    return header + "\n".join(dialogues) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert LRC/SRT to ASS subtitle format")
    parser.add_argument("input", help="Input LRC or SRT file path")
    parser.add_argument("-o", "--output", help="Output ASS file path (default: stdout)")
    parser.add_argument("--font", default="Noto Sans", help="Font family")
    parser.add_argument("--font-size", type=int, default=24, help="Font size")
    parser.add_argument("--json", action="store_true", help="Output parsed JSON instead of ASS")

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    content = input_path.read_text(encoding="utf-8")
    ext = input_path.suffix.lower()

    if ext == ".lrc":
        lines = parse_lrc(content)
    elif ext == ".srt":
        lines = parse_srt(content)
    else:
        print(f"Error: unsupported format: {ext}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        output = json.dumps(lines, ensure_ascii=False, indent=2)
    else:
        output = to_ass(lines, font=args.font, font_size=args.font_size)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Written: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
