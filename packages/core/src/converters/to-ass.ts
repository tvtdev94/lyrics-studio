import type { LyricsLine, StyleConfig } from "../types.js";
import { secondsToAssTime } from "../utils/time-utils.js";

const DEFAULT_STYLE: Required<StyleConfig> = {
  fontFamily: "Arial",
  fontSize: 58,
  textColor: "&H00FFFFFF",
  highlightColor: "&H0000FFFF",
  backgroundColor: "&H40000000",
  backgroundOpacity: 0.5,
};

/**
 * Convert LyricsLine[] to ASS subtitle format string.
 * Supports karaoke \kf tags when word-level timing is available.
 */
export function toAss(
  lyrics: LyricsLine[],
  config?: StyleConfig,
): string {
  const style = { ...DEFAULT_STYLE, ...config };

  const scriptInfo = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1920",
    "PlayResY: 1080",
    "WrapStyle: 0",
    "",
  ].join("\n");

  const styles = [
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${style.fontFamily},${style.fontSize},${style.textColor},${style.highlightColor},${style.backgroundColor},&H00000000,-1,0,0,0,100,100,0,0,1,3,1,2,30,30,40,1`,
    "",
  ].join("\n");

  const eventsHeader = [
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const dialogues = lyrics.map((line) => {
    const start = secondsToAssTime(line.start);
    const end = secondsToAssTime(line.end);
    const text = formatLineText(line);
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });

  return [scriptInfo, styles, eventsHeader, ...dialogues, ""].join("\n");
}

/** Format line text with optional karaoke \kf tags */
function formatLineText(line: LyricsLine): string {
  if (!line.words || line.words.length === 0) {
    return line.text;
  }

  // Use \kf (fill from left to right) for smooth karaoke effect
  return line.words
    .map((word) => {
      const durationCs = Math.round((word.end - word.start) * 100);
      return `{\\kf${durationCs}}${word.text}`;
    })
    .join("");
}
