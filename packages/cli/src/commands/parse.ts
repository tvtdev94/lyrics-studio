import { Command } from "commander";
import { readFileSync } from "node:fs";
import { parseLyrics } from "@lyrics-studio/core";

export const parseCommand = new Command("parse")
  .description("Parse LRC/SRT file and preview as JSON")
  .argument("<file>", "Lyrics file path (LRC or SRT)")
  .option("--format <fmt>", "Output format: json or summary", "json")
  .action((file, opts) => {
    const content = readFileSync(file, "utf-8");
    const lines = parseLyrics(content, file);

    if (opts.format === "summary") {
      console.log(`Parsed: ${lines.length} lines`);
      if (lines.length === 0) return;
      console.log(`Duration: ${lines[0].start.toFixed(2)}s — ${lines[lines.length - 1].end.toFixed(2)}s`);
      for (const line of lines.slice(0, 5)) {
        console.log(`  [${line.start.toFixed(2)}–${line.end.toFixed(2)}] ${line.text}`);
      }
      if (lines.length > 5) console.log(`  ... and ${lines.length - 5} more`);
    } else {
      console.log(JSON.stringify(lines, null, 2));
    }
  });
