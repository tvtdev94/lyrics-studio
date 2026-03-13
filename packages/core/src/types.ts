export interface LyricsProject {
  title: string;
  audio: string;
  style: "simple" | "kinetic" | "video-bg" | "karaoke";
  background?: string;
  config?: StyleConfig;
  lyrics: LyricsLine[];
  languages?: string[];
}

export interface LyricsLine {
  start: number;
  end: number;
  text: string;
  words?: LyricsWord[];
  lang?: string;
}

export interface LyricsWord {
  start: number;
  end: number;
  text: string;
}

export interface StyleConfig {
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  highlightColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
}
