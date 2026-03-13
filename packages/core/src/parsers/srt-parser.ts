import type { LyricsLine } from "../types.js";
import { parseTimestamp } from "../utils/time-utils.js";

const TIMESTAMP_REGEX =
  /(\d{1,2}:\d{2}:\d{2}[,.]\d{2,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{2,3})/;

/**
 * Parse SRT file content into LyricsLine array.
 * Handles numbered blocks with --> timestamp separator.
 */
export function parseSrt(content: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const blockLines = block.trim().split("\n");
    if (blockLines.length < 2) continue;

    // Find the timestamp line (skip the sequence number)
    let timestampLine = "";
    let textStartIdx = 0;

    for (let i = 0; i < blockLines.length; i++) {
      if (TIMESTAMP_REGEX.test(blockLines[i])) {
        timestampLine = blockLines[i];
        textStartIdx = i + 1;
        break;
      }
    }

    if (!timestampLine) continue;

    const match = timestampLine.match(TIMESTAMP_REGEX);
    if (!match) continue;

    const [, startStr, endStr] = match;
    const text = blockLines
      .slice(textStartIdx)
      .join(" ")
      .replace(/<[^>]+>/g, "") // Strip HTML tags
      .trim();

    if (!text) continue;

    lines.push({
      start: parseTimestamp(startStr),
      end: parseTimestamp(endStr),
      text,
    });
  }

  return lines;
}
