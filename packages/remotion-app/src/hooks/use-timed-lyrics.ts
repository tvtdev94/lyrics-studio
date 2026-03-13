import { useCurrentFrame, useVideoConfig } from "remotion";
import type { LyricsLine, LyricsWord } from "@lyrics-studio/core";

export interface TimedLyricsState {
  currentLine: LyricsLine | null;
  currentLineIndex: number;
  currentWord: LyricsWord | null;
  currentWordIndex: number;
  /** Progress within current line (0-1) */
  lineProgress: number;
  /** Progress within current word (0-1) */
  wordProgress: number;
}

/**
 * Hook: determine which lyrics line/word is active at current frame.
 * Pre-calculates frame ranges for efficient lookup.
 */
export function useTimedLyrics(lyrics: LyricsLine[]): TimedLyricsState {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  let currentLine: LyricsLine | null = null;
  let currentLineIndex = -1;
  let currentWord: LyricsWord | null = null;
  let currentWordIndex = -1;
  let lineProgress = 0;
  let wordProgress = 0;

  // Find active line
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    if (currentTime >= line.start && currentTime < line.end) {
      currentLine = line;
      currentLineIndex = i;
      const lineDuration = line.end - line.start;
      lineProgress = lineDuration > 0 ? (currentTime - line.start) / lineDuration : 0;
      break;
    }
  }

  // Find active word within current line
  if (currentLine?.words) {
    for (let i = 0; i < currentLine.words.length; i++) {
      const word = currentLine.words[i];
      if (currentTime >= word.start && currentTime < word.end) {
        currentWord = word;
        currentWordIndex = i;
        const wordDuration = word.end - word.start;
        wordProgress = wordDuration > 0 ? (currentTime - word.start) / wordDuration : 0;
        break;
      }
    }
  }

  return {
    currentLine,
    currentLineIndex,
    currentWord,
    currentWordIndex,
    lineProgress,
    wordProgress,
  };
}
