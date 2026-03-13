import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { parseLyrics, toAss } from "@lyrics-studio/core";
import { spawnProcess } from "../utils/spawn-process.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALID_POSITIONS = ["top", "center", "bottom"] as const;
const VALID_METHODS = ["solid", "blur", "gradient"] as const;

export const replaceSubCommand = new Command("replace-sub")
  .description("Replace burned-in subtitles: cover old subs then burn new ones")
  .requiredOption("--video <path>", "Input video file path")
  .requiredOption("--lyrics <path>", "New subtitle file (LRC, SRT, or ASS)")
  .option("--cover-position <pos>", "Position of old subs: top|center|bottom", "bottom")
  .option("--cover-height <px>", "Height of cover area in pixels", "120")
  .option("--cover-offset <px>", "Custom Y offset from top (overrides position)")
  .option("--cover-method <method>", "Cover method: solid|blur|gradient", "solid")
  .option("--cover-color <hex>", "Cover color for solid/gradient", "#000000")
  .option("--cover-opacity <n>", "Cover opacity 0.0-1.0", "1.0")
  .option("--font-dir <path>", "Font directory for custom fonts")
  .option("--output <path>", "Output video path", "output.mp4")
  .option("-v, --verbose", "Verbose output")
  .action(async (opts) => {
    // Validate options
    if (!VALID_POSITIONS.includes(opts.coverPosition)) {
      console.error(`Invalid position: ${opts.coverPosition}. Must be: ${VALID_POSITIONS.join(", ")}`);
      process.exit(1);
    }
    if (!VALID_METHODS.includes(opts.coverMethod)) {
      console.error(`Invalid method: ${opts.coverMethod}. Must be: ${VALID_METHODS.join(", ")}`);
      process.exit(1);
    }

    const scriptsDir = path.resolve(__dirname, "../../../../scripts/ffmpeg-overlay");
    const tmpDir = path.join(tmpdir(), "lyrics-studio");
    mkdirSync(tmpDir, { recursive: true });

    // Convert lyrics to ASS if needed
    let assPath: string;
    if (opts.lyrics.endsWith(".ass")) {
      assPath = path.resolve(opts.lyrics);
    } else {
      const content = readFileSync(opts.lyrics, "utf-8");
      const lines = parseLyrics(content, opts.lyrics);
      const assContent = toAss(lines);
      assPath = path.join(tmpDir, `${path.basename(opts.lyrics, path.extname(opts.lyrics))}.ass`);
      writeFileSync(assPath, assContent, "utf-8");
    }

    console.log(`Replacing subtitles in: ${opts.video}`);
    console.log(`  Cover: ${opts.coverMethod} at ${opts.coverPosition} (${opts.coverHeight}px)`);
    console.log(`  New subtitle: ${opts.lyrics}`);
    console.log(`  Output: ${opts.output}`);

    const args = [
      path.join(scriptsDir, "replace-sub.py"),
      "--video", path.resolve(opts.video),
      "--subtitle", assPath,
      "--output", path.resolve(opts.output),
      "--cover-position", opts.coverPosition,
      "--cover-height", opts.coverHeight,
      "--cover-method", opts.coverMethod,
      "--cover-color", opts.coverColor,
      "--cover-opacity", opts.coverOpacity,
    ];

    if (opts.coverOffset) {
      args.push("--cover-offset", opts.coverOffset);
    }
    if (opts.fontDir) {
      args.push("--font-dir", opts.fontDir);
    }

    const exitCode = await spawnProcess({
      cmd: "python",
      args,
      verbose: opts.verbose,
    });

    if (exitCode !== 0) {
      console.error("Subtitle replacement failed");
      process.exit(exitCode);
    }

    console.log(`Done: ${opts.output}`);
  });
