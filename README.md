# Lyrics Studio

Hybrid pipeline tool for creating YouTube lyrics videos and re-uploading TikTok/Douyin clips using **Remotion** (React-based video rendering) and **FFmpeg** (video processing).

## Features

- **LRC/SRT parsing** — parse timestamped lyrics into structured data
- **4 video styles** — Simple, Kinetic Typography, Video Background, Karaoke Highlight
- **ASS subtitle conversion** — convert lyrics to styled ASS format
- **Subtitle burn/soft embed** — hardcode or embed subtitle tracks via FFmpeg
- **Subtitle replacement** — cover burned-in subs and burn new ones on top
- **Reup pipeline** — all-in-one tool for TikTok/Douyin video re-uploading
- **Watermark removal** — remove Douyin/TikTok logos via blur or solid cover
- **Anti-detection transforms** — speed, mirror, brightness, contrast, saturation adjustments
- **Aspect ratio conversion** — 9:16 ↔ 16:9 with blur background padding
- **Metadata stripping** — remove original encoder/title/artist metadata
- **Template system** — save/load JSON presets for reuse across videos
- **Preview mode** — render single frame before full video processing
- **CLI interface** — all features accessible from the terminal
- **Remotion Studio** — live preview and edit compositions in the browser

## Monorepo Structure

```
packages/
├── core/           # Shared parsers, types, converters
├── cli/            # CLI tool (Commander.js)
└── remotion-app/   # Remotion compositions & renderer

scripts/
└── ffmpeg-overlay/ # Python FFmpeg scripts (overlay, replace-sub, reup pipeline)

samples/            # Test audio, video, and lyrics files
```

## Prerequisites

- **Node.js** >= 18
- **pnpm** (package manager)
- **FFmpeg** (for all video processing)
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

---

## CLI Commands

### `parse` — Parse lyrics files

Parse LRC/SRT files and output as JSON or summary.

```bash
# Output as JSON
lyrics-studio parse samples/test-lyrics.lrc

# Output as summary
lyrics-studio parse samples/test-lyrics.srt --format summary
```

| Option | Description | Default |
|--------|-------------|---------|
| `<file>` | Lyrics file path (LRC or SRT) | required |
| `--format <fmt>` | Output format: `json` or `summary` | `json` |

---

### `create` — Create lyrics video

Create a new lyrics video from audio + lyrics file using Remotion.

```bash
lyrics-studio create \
  --audio samples/test-audio.mp3 \
  --lyrics samples/test-lyrics.lrc \
  --style simple \
  --output output/my-video.mp4
```

| Option | Description | Default |
|--------|-------------|---------|
| `--audio <path>` | Audio file path | required |
| `--lyrics <path>` | Lyrics file (LRC or SRT) | required |
| `--style <style>` | Video style (see table below) | `simple` |
| `--output <path>` | Output file path | `output.mp4` |
| `--background <path>` | Background image/video | — |
| `--config <path>` | Style config JSON file | — |
| `-v, --verbose` | Verbose output | — |

#### Video Styles

| Style | ID | Description |
|---|---|---|
| Simple | `simple` | Clean text on gradient/image background |
| Kinetic Typography | `kinetic` | Animated text with motion effects |
| Video Background | `video-bg` | Lyrics overlaid on a background video |
| Karaoke Highlight | `karaoke` | Word-by-word highlight synced to audio |

---

### `subtitle` — Add subtitles to video

Add subtitles to an existing video (burn or soft embed).

```bash
# Burn subtitles into video
lyrics-studio subtitle \
  --video input.mp4 \
  --lyrics sub.lrc \
  --mode burn \
  --output output.mp4

# Soft subtitles (multiple languages)
lyrics-studio subtitle \
  --video input.mp4 \
  --lyrics vi.lrc en.srt \
  --lang vi en \
  --mode soft \
  --output output.mp4
```

| Option | Description | Default |
|--------|-------------|---------|
| `--video <path>` | Input video | required |
| `--lyrics <paths...>` | Subtitle files (LRC, SRT, ASS) | required |
| `--lang <codes...>` | Language codes per subtitle | `vi` |
| `--mode <mode>` | `burn` (hardcode) or `soft` (embed track) | `burn` |
| `--output <path>` | Output video path | `output.mp4` |
| `--font-dir <path>` | Custom font directory | — |

---

### `replace-sub` — Replace burned-in subtitles

Cover existing burned-in subtitles with an overlay, then burn new subtitles on top.

```bash
lyrics-studio replace-sub \
  --video tiktok-clip.mp4 \
  --lyrics new-sub.lrc \
  --cover-position bottom \
  --cover-height 120 \
  --cover-method solid \
  --output output.mp4
```

| Option | Description | Default |
|--------|-------------|---------|
| `--video <path>` | Input video | required |
| `--lyrics <path>` | New subtitle file (LRC, SRT, ASS) | required |
| `--cover-position` | `top`, `center`, `bottom` | `bottom` |
| `--cover-height <px>` | Cover area height in pixels | `120` |
| `--cover-offset <px>` | Custom Y offset from top (overrides position) | — |
| `--cover-method` | `solid`, `blur`, `gradient` | `solid` |
| `--cover-color <hex>` | Cover color for solid/gradient | `#000000` |
| `--cover-opacity <n>` | Opacity 0.0–1.0 | `1.0` |
| `--output <path>` | Output video path | `output.mp4` |
| `--font-dir <path>` | Custom font directory | — |

---

### `reup` — Full reup pipeline

All-in-one pipeline for re-uploading TikTok/Douyin videos. Combines watermark removal, subtitle replacement, anti-detection transforms, aspect ratio conversion, and metadata stripping.

```bash
# Basic: replace sub + remove watermark + strip metadata
lyrics-studio reup \
  --video clip.mp4 \
  --lyrics sub-moi.lrc \
  --watermark douyin

# Full anti-detection with random transforms
lyrics-studio reup \
  --video clip.mp4 \
  --lyrics sub.ass \
  --watermark douyin \
  --randomize

# Preview before full render
lyrics-studio reup \
  --video clip.mp4 \
  --lyrics sub.ass \
  --watermark douyin \
  --preview

# Convert 9:16 to 16:9 with blur padding
lyrics-studio reup \
  --video clip.mp4 \
  --ratio 16:9

# Save settings as template
lyrics-studio reup \
  --video clip.mp4 \
  --watermark douyin \
  --randomize \
  --save-template my-preset.json

# Reuse template on another video
lyrics-studio reup \
  --video clip2.mp4 \
  --load-template my-preset.json
```

#### Subtitle Options

| Option | Description | Default |
|--------|-------------|---------|
| `--lyrics <path>` | New subtitle file (LRC, SRT, ASS) | — |
| `--sub-preset` | `douyin-bottom`, `douyin-center`, `tiktok-bottom`, `custom` | `douyin-bottom` |
| `--cover-method` | `solid`, `gradient` | `solid` |
| `--cover-color <hex>` | Cover color | `#000000` |
| `--cover-opacity <n>` | Cover opacity 0.0–1.0 | `0.9` |
| `--cover-height <px>` | Override cover height | preset |
| `--cover-offset <px>` | Custom Y offset | — |

#### Watermark Removal

| Option | Description | Default |
|--------|-------------|---------|
| `--watermark` | `douyin`, `tiktok`, `none` | `none` |
| `--watermark-method` | `blur` (delogo) or `solid` (black box) | `blur` |

#### Anti-Detection Transforms

| Option | Description | Default |
|--------|-------------|---------|
| `--speed <n>` | Playback speed (e.g., `1.03`) | `1.0` |
| `--mirror` | Horizontal flip | off |
| `--brightness <n>` | -1.0 to 1.0 | `0` |
| `--contrast <n>` | Multiplier | `1.0` |
| `--saturation <n>` | Multiplier | `1.0` |
| `--randomize` | Auto-apply subtle random values for all transforms | off |

#### Aspect Ratio & Output

| Option | Description | Default |
|--------|-------------|---------|
| `--ratio` | `16:9` or `9:16` (with blur background padding) | — |
| `--keep-metadata` | Keep original video metadata | strip |
| `--preview` | Render single frame preview (JPG) | off |
| `--preview-time` | Timestamp for preview frame | `00:00:05` |
| `--save-template <path>` | Save current settings to JSON | — |
| `--load-template <path>` | Load settings from JSON template | — |
| `--output <path>` | Output video path | `output/reup.mp4` |

---

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

---

## FFmpeg Scripts (Direct Usage)

The Python scripts can be used directly without the CLI:

```bash
# Burn subtitles
python scripts/ffmpeg-overlay/overlay.py burn \
  --video input.mp4 --subtitle lyrics.ass --output output.mp4

# Soft subtitle tracks
python scripts/ffmpeg-overlay/overlay.py soft \
  --video input.mp4 --subtitles vi.ass en.ass --languages vi en --output output.mp4

# Replace burned-in subtitles
python scripts/ffmpeg-overlay/replace-sub.py \
  --video input.mp4 --subtitle new.ass --output output.mp4 \
  --cover-method blur --cover-height 100

# Full reup pipeline
python scripts/ffmpeg-overlay/reup-pipeline.py \
  --video input.mp4 --subtitle new.ass --watermark douyin --randomize --output output.mp4

# Batch process
python scripts/ffmpeg-overlay/batch-process.py --config config.json
```

---

## Development

```bash
# Type-check all packages
pnpm lint

# Run Remotion dev server
pnpm dev

# Build all packages
pnpm build
```

## Tech Stack

- **TypeScript** — type-safe codebase
- **Remotion 4** — React-based video rendering (1920x1080 @ 30fps)
- **Commander.js** — CLI framework
- **FFmpeg** — video processing & subtitle overlay
- **Python** — FFmpeg pipeline scripts
- **pnpm workspaces** — monorepo management

## License

Private project.
