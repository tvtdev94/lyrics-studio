// Types
export type {
  LyricsProject,
  LyricsLine,
  LyricsWord,
  StyleConfig,
} from "./types.js";

// Parsers
export { parseLrc } from "./parsers/lrc-parser.js";
export { parseSrt } from "./parsers/srt-parser.js";
export { parseLyrics } from "./parsers/index.js";

// Converters
export { toAss } from "./converters/to-ass.js";
export { toRemotionProps } from "./converters/to-remotion-props.js";
export type { RemotionInputProps } from "./converters/to-remotion-props.js";

// Utils
export { parseTimestamp, secondsToAssTime, secondsToFrames } from "./utils/time-utils.js";
export { validateProject } from "./utils/validate-project.js";
export type { ValidationResult } from "./utils/validate-project.js";
