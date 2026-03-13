# Lyrics Studio

Hybrid pipeline tool for creating YouTube lyrics videos using **Remotion** (React-based video rendering) and **FFmpeg** (subtitle overlay).

## Features

- **LRC/SRT parsing** — parse timestamped lyrics into structured data
- **4 video styles** — Simple, Kinetic Typography, Video Background, Karaoke Highlight
- **ASS subtitle conversion** — convert lyrics to styled ASS format
- **Subtitle burn/soft embed** — hardcode or embed subtitle tracks via FFmpeg
- **CLI interface** — create videos, parse lyrics, add subtitles from the terminal
- **Remotion Studio** — live preview and edit compositions in the browser

## Monorepo Structure

```
packages/
├── core/           # Shared parsers, types, converters
├── cli/            # CLI tool (Commander.js)
└── remotion-app/   # Remotion compositions & renderer

scripts/
└── ffmpeg-overlay/ # Python scripts for FFmpeg subtitle operations

samples/            # Test audio, video, and lyrics files
```

## Prerequisites

- **Node.js** >= 18
- **pnpm** (package manager)
- **FFmpeg** (for subtitle burn/soft embed)
- **Python** 3.10+ (for FFmpeg overlay scripts)

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Open Remotion Studio (live preview)
pnpm studio
```

## CLI Usage

```bash
# Parse a lyrics file to JSON
lyrics-studio parse samples/test-lyrics.lrc
lyrics-studio parse samples/test-lyrics.srt --format summary

# Create a lyrics video
lyrics-studio create \
  --audio samples/test-audio.mp3 \
  --lyrics samples/test-lyrics.lrc \
  --style simple \
  --output output/my-video.mp4

# Add subtitles to an existing video
lyrics-studio subtitle \
  --video samples/test-video.mp4 \
  --lyrics samples/test-lyrics.lrc \
  --mode burn \
  --output output/subtitled.mp4
```

### Video Styles

| Style | ID | Description |
|---|---|---|
| Simple | `simple` | Clean text on gradient/image background |
| Kinetic Typography | `kinetic` | Animated text with motion effects |
| Video Background | `video-bg` | Lyrics overlaid on a background video |
| Karaoke Highlight | `karaoke` | Word-by-word highlight synced to audio |

## Core API

```typescript
import { parseLyrics, toAss, toRemotionProps } from "@lyrics-studio/core";

// Parse LRC or SRT content
const lines = parseLyrics(fileContent, "song.lrc");

// Convert to ASS subtitle format
const assContent = toAss(lines);

// Convert to Remotion composition props
const props = toRemotionProps({ title: "My Song", lyrics: lines });
```

## FFmpeg Scripts

```bash
# Burn subtitles into video
python scripts/ffmpeg-overlay/overlay.py burn \
  --video input.mp4 --subtitle lyrics.ass --output output.mp4

# Add soft subtitle tracks
python scripts/ffmpeg-overlay/overlay.py soft \
  --video input.mp4 --subtitles vi.ass en.ass --languages vi en --output output.mp4

# Batch process multiple videos
python scripts/ffmpeg-overlay/batch-process.py --config config.json
```

## Development

```bash
# Type-check all packages
pnpm lint

# Run Remotion dev server
pnpm dev

# Render a specific composition
pnpm --filter remotion-app render -- SimpleLyrics output.mp4
```

## Tech Stack

- **TypeScript** — type-safe codebase
- **Remotion 4** — React-based video rendering (1920x1080 @ 30fps)
- **Commander.js** — CLI framework
- **FFmpeg** — video processing & subtitle overlay
- **pnpm workspaces** — monorepo management

## License

Private project.
