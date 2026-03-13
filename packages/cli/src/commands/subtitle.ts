import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { parseLyrics, toAss } from "@lyrics-studio/core";
import { spawnProcess } from "../utils/spawn-process.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const subtitleCommand = new Command("subtitle")
  .description("Add subtitles to an existing video")
  .requiredOption("--video <path>", "Input video file path")
  .requiredOption("--lyrics <paths...>", "Lyrics file paths (LRC, SRT, or ASS)")
  .option("--lang <codes...>", "Language codes for each subtitle", ["vi"])
  .option("--mode <mode>", "Subtitle mode: burn or soft", "burn")
  .option("--output <path>", "Output video path", "output.mp4")
  .option("--font-dir <path>", "Font directory for custom fonts")
  .option("-v, --verbose", "Verbose output")
  .action(async (opts) => {
    const scriptsDir = path.resolve(__dirname, "../../../../scripts/ffmpeg-overlay");

    // Convert non-ASS files to ASS format
    const assFiles: string[] = [];
    const tmpDir = path.join(tmpdir(), "lyrics-studio");
    mkdirSync(tmpDir, { recursive: true });

    for (const lyricsPath of opts.lyrics) {
      if (lyricsPath.endsWith(".ass")) {
        assFiles.push(path.resolve(lyricsPath));
      } else {
        // Parse and convert to ASS
        const content = readFileSync(lyricsPath, "utf-8");
        const lines = parseLyrics(content, lyricsPath);
        const assContent = toAss(lines);
        const assPath = path.join(tmpDir, `${path.basename(lyricsPath, path.extname(lyricsPath))}.ass`);
        writeFileSync(assPath, assContent, "utf-8");
        assFiles.push(assPath);
      }
    }

    console.log(`Subtitling video: ${opts.video}`);
    console.log(`  Mode: ${opts.mode}`);
    console.log(`  Subtitles: ${assFiles.length} file(s)`);

    if (opts.mode === "burn") {
      // Burn first subtitle into video
      const args = [
        path.join(scriptsDir, "overlay.py"),
        "burn",
        "--video", path.resolve(opts.video),
        "--subtitle", assFiles[0],
        "--output", path.resolve(opts.output),
      ];
      if (opts.fontDir) args.push("--font-dir", opts.fontDir);

      const exitCode = await spawnProcess({
        cmd: "python",
        args,
        verbose: opts.verbose,
      });

      if (exitCode !== 0) process.exit(exitCode);
    } else {
      // Soft subtitles
      const args = [
        path.join(scriptsDir, "overlay.py"),
        "soft",
        "--video", path.resolve(opts.video),
        "--subtitles", ...assFiles,
        "--languages", ...opts.lang,
        "--output", path.resolve(opts.output),
      ];

      const exitCode = await spawnProcess({
        cmd: "python",
        args,
        verbose: opts.verbose,
      });

      if (exitCode !== 0) process.exit(exitCode);
    }

    console.log(`Done: ${opts.output}`);
  });
