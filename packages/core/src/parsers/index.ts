import type { LyricsLine } from "../types.js";
import { parseLrc } from "./lrc-parser.js";
import { parseSrt } from "./srt-parser.js";

export { parseLrc } from "./lrc-parser.js";
export { parseSrt } from "./srt-parser.js";

/** Auto-detect format by file extension and parse */
export function parseLyrics(
  content: string,
  filePath: string,
): LyricsLine[] {
  const ext = filePath.toLowerCase().split(".").pop();

  switch (ext) {
    case "lrc":
      return parseLrc(content);
    case "srt":
      return parseSrt(content);
    default:
      throw new Error(`Unsupported lyrics format: .${ext}`);
  }
}
