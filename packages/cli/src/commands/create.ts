import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { parseLyrics } from "@lyrics-studio/core";
import { spawnProcess } from "../utils/spawn-process.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALID_STYLES = ["simple", "kinetic", "video-bg", "karaoke"] as const;

export const createCommand = new Command("create")
  .description("Create a new lyrics video from audio + lyrics file")
  .requiredOption("--audio <path>", "Audio file path")
  .requiredOption("--lyrics <path>", "Lyrics file path (LRC or SRT)")
  .option("--style <style>", "Video style", "simple")
  .option("--output <path>", "Output file path", "output.mp4")
  .option("--background <path>", "Background image/video path")
  .option("--config <path>", "Style config JSON file")
  .option("-v, --verbose", "Verbose output")
  .action(async (opts) => {
    const style = opts.style as (typeof VALID_STYLES)[number];
    if (!VALID_STYLES.includes(style)) {
      console.error(`Invalid style: ${style}. Must be one of: ${VALID_STYLES.join(", ")}`);
      process.exit(1);
    }

    const lyricsContent = readFileSync(opts.lyrics, "utf-8");
    const lyrics = parseLyrics(lyricsContent, opts.lyrics);

    const compositionMap: Record<string, string> = {
      simple: "simple-lyrics",
      kinetic: "kinetic-typography",
      "video-bg": "video-background",
      karaoke: "karaoke-highlight",
    };

    const compositionId = compositionMap[style];
    const remotionAppDir = path.resolve(__dirname, "../../../remotion-app");

    // Copy assets to Remotion public dir so staticFile() can find them
    const publicDir = path.join(remotionAppDir, "public");
    mkdirSync(publicDir, { recursive: true });

    const audioFileName = path.basename(opts.audio);
    copyFileSync(path.resolve(opts.audio), path.join(publicDir, audioFileName));

    let bgFileName: string | undefined;
    if (opts.background) {
      bgFileName = path.basename(opts.background);
      copyFileSync(path.resolve(opts.background), path.join(publicDir, bgFileName));
    }

    const inputProps = {
      title: path.basename(opts.audio, path.extname(opts.audio)),
      audioSrc: audioFileName,
      backgroundSrc: bgFileName,
      lyrics,
      style: opts.config ? JSON.parse(readFileSync(opts.config, "utf-8")) : undefined,
    };

    // Write props to temp file to avoid shell quoting issues
    const tmpDir = path.join(tmpdir(), "lyrics-studio");
    mkdirSync(tmpDir, { recursive: true });
    const propsFile = path.join(tmpDir, "render-props.json");
    writeFileSync(propsFile, JSON.stringify(inputProps), "utf-8");

    console.log(`Creating ${style} lyrics video...`);
    console.log(`  Audio: ${opts.audio}`);
    console.log(`  Lyrics: ${opts.lyrics} (${lyrics.length} lines)`);
    console.log(`  Output: ${opts.output}`);

    const exitCode = await spawnProcess({
      cmd: "npx",
      args: [
        "remotion", "render",
        "--entry-point", path.join(remotionAppDir, "src/entry.ts"),
        compositionId,
        path.resolve(opts.output),
        "--props", propsFile,
      ],
      cwd: remotionAppDir,
      verbose: opts.verbose,
    });

    if (exitCode !== 0) {
      console.error("Render failed");
      process.exit(exitCode);
    }

    console.log(`Done: ${opts.output}`);
  });
