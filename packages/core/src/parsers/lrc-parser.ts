import type { LyricsLine, LyricsWord } from "../types.js";
import { parseTimestamp } from "../utils/time-utils.js";

const LRC_LINE_REGEX = /\[(\d{1,2}:\d{2}\.\d{2,3})\](.+)/;
const ENHANCED_WORD_REGEX = /<(\d{1,2}:\d{2}\.\d{2,3})>([^<]*)/g;

/**
 * Parse LRC file content into LyricsLine array.
 * Supports basic LRC and enhanced LRC (word-level timing).
 */
export function parseLrc(content: string): LyricsLine[] {
  const lines: LyricsLine[] = [];

  for (const raw of content.split("\n")) {
    const trimmed = raw.trim();
    const match = trimmed.match(LRC_LINE_REGEX);
    if (!match) continue;

    const [, timestamp, text] = match;
    const start = parseTimestamp(timestamp);

    // Check for enhanced LRC word-level timing: <MM:SS.ms>word
    const words = parseEnhancedWords(text, start);

    lines.push({
      start,
      end: 0, // Will be calculated after all lines are parsed
      text: words ? words.map((w) => w.text).join("") : text,
      ...(words && { words }),
    });
  }

  // Calculate end times: each line ends when the next begins
  for (let i = 0; i < lines.length; i++) {
    lines[i].end =
      i < lines.length - 1 ? lines[i + 1].start : lines[i].start + 5;
  }

  return lines;
}

function parseEnhancedWords(
  text: string,
  lineStart: number,
): LyricsWord[] | null {
  const words: LyricsWord[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  ENHANCED_WORD_REGEX.lastIndex = 0;

  while ((match = ENHANCED_WORD_REGEX.exec(text)) !== null) {
    const [, timestamp, word] = match;
    if (word.trim()) {
      words.push({
        start: parseTimestamp(timestamp),
        end: 0, // Will be set below
        text: word,
      });
    }
  }

  if (words.length === 0) return null;

  // Calculate word end times
  for (let i = 0; i < words.length; i++) {
    words[i].end =
      i < words.length - 1 ? words[i + 1].start : words[i].start + 0.5;
  }

  // Use lineStart for the first word if no explicit timing
  if (words.length > 0 && words[0].start === 0) {
    words[0].start = lineStart;
  }

  return words;
}
