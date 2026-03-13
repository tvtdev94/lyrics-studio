import type { LyricsProject } from "../types.js";

/** Remotion-compatible props (JSON-serializable) */
export interface RemotionInputProps {
  title: string;
  audioSrc: string;
  backgroundSrc?: string;
  lyrics: Array<{
    start: number;
    end: number;
    text: string;
    words?: Array<{ start: number; end: number; text: string }>;
  }>;
  style: {
    fontFamily: string;
    fontSize: number;
    textColor: string;
    highlightColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
  };
}

const DEFAULT_STYLE = {
  fontFamily: "Noto Sans",
  fontSize: 64,
  textColor: "#FFFFFF",
  highlightColor: "#FFD700",
  backgroundColor: "#000000",
  backgroundOpacity: 0.7,
};

/** Convert LyricsProject to Remotion-compatible inputProps */
export function toRemotionProps(project: LyricsProject): RemotionInputProps {
  return {
    title: project.title,
    audioSrc: project.audio,
    backgroundSrc: project.background,
    lyrics: project.lyrics.map((line) => ({
      start: line.start,
      end: line.end,
      text: line.text,
      ...(line.words && {
        words: line.words.map((w) => ({
          start: w.start,
          end: w.end,
          text: w.text,
        })),
      }),
    })),
    style: {
      ...DEFAULT_STYLE,
      ...project.config,
    },
  };
}
