import React from "react";
import { AbsoluteFill } from "remotion";
import type { LyricsLine, StyleConfig } from "@lyrics-studio/core";
import { BackgroundLayer } from "../components/background-layer.js";
import { AudioPlayer } from "../components/audio-player.js";
import { WordHighlight } from "../components/word-highlight.js";
import { LyricsLineDisplay } from "../components/lyrics-line.js";
import { useTimedLyrics } from "../hooks/use-timed-lyrics.js";
import { defaultTheme } from "../styles/default-theme.js";

export interface KaraokeHighlightProps {
  title: string;
  audioSrc: string;
  backgroundSrc?: string;
  lyrics: LyricsLine[];
  style?: Partial<StyleConfig>;
}

/**
 * Style 4: Karaoke Highlight
 * Word-by-word highlighting synced to audio.
 * Falls back to line-level highlight if no word timing.
 */
export const KaraokeHighlight: React.FC<KaraokeHighlightProps> = ({
  audioSrc,
  backgroundSrc,
  lyrics,
  style,
}) => {
  const { currentLine, currentLineIndex } = useTimedLyrics(lyrics);

  const bgType = backgroundSrc
    ? backgroundSrc.match(/\.(mp4|webm|mov)$/i) ? "video" : "image"
    : "gradient";

  // Next line preview
  const nextLine = currentLineIndex < lyrics.length - 1 ? lyrics[currentLineIndex + 1] : null;

  return (
    <AbsoluteFill>
      <BackgroundLayer type={bgType as "gradient" | "image" | "video"} src={backgroundSrc} blur={3} />
      <AbsoluteFill style={{ backgroundColor: defaultTheme.overlayColor }} />
      <AudioPlayer src={audioSrc} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 80px",
        }}
      >
        {currentLine && (
          <div style={{ textAlign: "center" }}>
            {/* Word-level highlight if available, otherwise line-level */}
            {currentLine.words && currentLine.words.length > 0 ? (
              <WordHighlight
                words={currentLine.words}
                fontSize={style?.fontSize ?? defaultTheme.fontSize}
                highlightColor={style?.highlightColor ?? defaultTheme.highlightColor}
              />
            ) : (
              <LyricsLineDisplay
                text={currentLine.text}
                isActive={true}
                fontSize={style?.fontSize ?? defaultTheme.fontSize}
                activeColor={style?.highlightColor ?? defaultTheme.highlightColor}
              />
            )}

            {/* Next line preview (dimmed) */}
            {nextLine && (
              <div style={{ marginTop: "24px" }}>
                <LyricsLineDisplay
                  text={nextLine.text}
                  isActive={false}
                  fontSize={(style?.fontSize ?? defaultTheme.fontSize) * 0.7}
                />
              </div>
            )}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
