import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { parseLyrics, toAss } from "@lyrics-studio/core";
import { spawnProcess } from "../utils/spawn-process.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const reupCommand = new Command("reup")
  .description("Full reup pipeline: watermark removal, sub replacement, transforms, metadata cleanup")
  .requiredOption("--video <path>", "Input video file path")
  .option("--lyrics <path>", "New subtitle file (LRC, SRT, or ASS)")
  .option("--sub-preset <preset>", "Subtitle position preset", "douyin-bottom")
  .option("--cover-method <method>", "Cover method: solid|gradient", "solid")
  .option("--cover-color <hex>", "Cover color", "#000000")
  .option("--cover-opacity <n>", "Cover opacity 0.0-1.0", "0.9")
  .option("--cover-height <px>", "Override cover height in pixels")
  .option("--cover-offset <px>", "Custom Y offset from top")
  .option("--watermark <preset>", "Watermark preset: douyin|tiktok|none", "none")
  .option("--watermark-method <method>", "Watermark removal: blur|solid", "blur")
  .option("--speed <n>", "Playback speed multiplier", "1.0")
  .option("--mirror", "Horizontal flip")
  .option("--brightness <n>", "Brightness -1.0 to 1.0", "0")
  .option("--contrast <n>", "Contrast multiplier", "1.0")
  .option("--saturation <n>", "Saturation multiplier", "1.0")
  .option("--randomize", "Apply subtle random transforms for anti-detection")
  .option("--ratio <ratio>", "Target aspect ratio: 16:9 or 9:16")
  .option("--keep-metadata", "Keep original metadata")
  .option("--preview", "Render single frame preview only")
  .option("--preview-time <time>", "Preview timestamp", "00:00:05")
  .option("--save-template <path>", "Save settings to JSON template")
  .option("--load-template <path>", "Load settings from JSON template")
  .option("--font-dir <path>", "Font directory for custom fonts")
  .option("--output <path>", "Output video path", "output/reup.mp4")
  .option("-v, --verbose", "Verbose output")
  .action(async (opts) => {
    const scriptsDir = path.resolve(__dirname, "../../../../scripts/ffmpeg-overlay");

    // Convert lyrics to ASS if needed
    let subtitlePath: string | undefined;
    if (opts.lyrics) {
      if (opts.lyrics.endsWith(".ass")) {
        subtitlePath = path.resolve(opts.lyrics);
      } else {
        const tmpDir = path.join(tmpdir(), "lyrics-studio");
        mkdirSync(tmpDir, { recursive: true });
        const content = readFileSync(opts.lyrics, "utf-8");
        const lines = parseLyrics(content, opts.lyrics);
        const assContent = toAss(lines);
        const assPath = path.join(tmpDir, `${path.basename(opts.lyrics, path.extname(opts.lyrics))}.ass`);
        writeFileSync(assPath, assContent, "utf-8");
        subtitlePath = assPath;
      }
    }

    // Ensure output directory exists
    mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });

    const args = [
      path.join(scriptsDir, "reup-pipeline.py"),
      "--video", path.resolve(opts.video),
      "--output", path.resolve(opts.output),
      "--sub-preset", opts.subPreset,
      "--cover-method", opts.coverMethod,
      "--cover-color", opts.coverColor,
      "--cover-opacity", opts.coverOpacity,
      "--speed", opts.speed,
      "--brightness", opts.brightness,
      "--contrast", opts.contrast,
      "--saturation", opts.saturation,
      "--watermark", opts.watermark,
      "--watermark-method", opts.watermarkMethod,
      "--preview-time", opts.previewTime,
    ];

    if (subtitlePath) args.push("--subtitle", subtitlePath);
    if (opts.coverHeight) args.push("--cover-height", opts.coverHeight);
    if (opts.coverOffset) args.push("--cover-offset", opts.coverOffset);
    if (opts.mirror) args.push("--mirror");
    if (opts.randomize) args.push("--randomize");
    if (opts.ratio) args.push("--ratio", opts.ratio);
    if (opts.keepMetadata) args.push("--keep-metadata");
    if (opts.preview) args.push("--preview");
    if (opts.fontDir) args.push("--font-dir", opts.fontDir);
    if (opts.saveTemplate) args.push("--save-template", path.resolve(opts.saveTemplate));
    if (opts.loadTemplate) args.push("--load-template", path.resolve(opts.loadTemplate));

    console.log("Reup pipeline starting...");

    const exitCode = await spawnProcess({
      cmd: "python",
      args,
      verbose: opts.verbose,
    });

    if (exitCode !== 0) {
      console.error("Reup pipeline failed");
      process.exit(exitCode);
    }
  });
