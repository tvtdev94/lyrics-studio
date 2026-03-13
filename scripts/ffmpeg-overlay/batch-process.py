"""Batch process multiple video + subtitle pairs."""

import argparse
import sys
from multiprocessing import Pool
from pathlib import Path

from overlay import burn_subtitle


def find_pairs(input_dir: str, sub_ext: str = ".ass") -> list[tuple[str, str]]:
    """Find video + subtitle pairs matched by filename stem."""
    video_exts = {".mp4", ".mkv", ".avi", ".mov", ".webm"}
    input_path = Path(input_dir)
    pairs = []

    for video in input_path.iterdir():
        if video.suffix.lower() not in video_exts:
            continue
        sub = video.with_suffix(sub_ext)
        if sub.exists():
            pairs.append((str(video), str(sub)))

    return pairs


def process_one(args: tuple[str, str, str, str | None]) -> str:
    """Process a single video + subtitle pair."""
    video, subtitle, output_dir, font_dir = args
    video_path = Path(video)
    output = str(Path(output_dir) / f"{video_path.stem}_subbed{video_path.suffix}")

    try:
        burn_subtitle(video, subtitle, output, font_dir)
        return f"OK: {video_path.name}"
    except Exception as e:
        return f"FAIL: {video_path.name} — {e}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch subtitle overlay")
    parser.add_argument("input_dir", help="Directory with video + subtitle files")
    parser.add_argument("-o", "--output-dir", required=True, help="Output directory")
    parser.add_argument("--sub-ext", default=".ass", help="Subtitle extension (default: .ass)")
    parser.add_argument("--font-dir", help="Font directory")
    parser.add_argument("--workers", type=int, default=2, help="Parallel workers")

    args = parser.parse_args()

    output_path = Path(args.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    pairs = find_pairs(args.input_dir, args.sub_ext)
    if not pairs:
        print("No video + subtitle pairs found.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(pairs)} pairs to process")

    tasks = [(v, s, args.output_dir, args.font_dir) for v, s in pairs]

    with Pool(args.workers) as pool:
        results = pool.map(process_one, tasks)

    for r in results:
        print(r)

    failed = sum(1 for r in results if r.startswith("FAIL"))
    print(f"\nDone: {len(results) - failed}/{len(results)} succeeded")


if __name__ == "__main__":
    main()
