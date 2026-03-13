import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { LyricsLine, StyleConfig } from "@lyrics-studio/core";
import { BackgroundLayer } from "../components/background-layer.js";
import { AudioPlayer } from "../components/audio-player.js";
import { LyricsLineDisplay } from "../components/lyrics-line.js";
import { useTimedLyrics } from "../hooks/use-timed-lyrics.js";
import { defaultTheme } from "../styles/default-theme.js";

export interface SimpleLyricsProps {
  title: string;
  audioSrc: string;
  backgroundSrc?: string;
  lyrics: LyricsLine[];
  style?: Partial<StyleConfig>;
}

/**
 * Style 1: Simple Lyrics
 * Text on gradient/image background, line-by-line sync, fade transitions.
 */
export const SimpleLyrics: React.FC<SimpleLyricsProps> = ({
  audioSrc,
  backgroundSrc,
  lyrics,
  style,
}) => {
  const { fps } = useVideoConfig();
  const { currentLineIndex } = useTimedLyrics(lyrics);

  const bgType = backgroundSrc
    ? backgroundSrc.match(/\.(mp4|webm|mov)$/i)
      ? "video"
      : "image"
    : "gradient";

  // Show current line + 1 before + 1 after for context
  const visibleRange = 3;
  const startIdx = Math.max(0, currentLineIndex - 1);
  const endIdx = Math.min(lyrics.length, startIdx + visibleRange);
  const visibleLines = lyrics.slice(startIdx, endIdx);

  return (
    <AbsoluteFill>
      <BackgroundLayer type={bgType as "gradient" | "image" | "video"} src={backgroundSrc} blur={bgType === "video" ? 5 : 0} />

      {/* Dark overlay for readability */}
      <AbsoluteFill style={{ backgroundColor: defaultTheme.overlayColor }} />

      <Audio audioSrc={audioSrc} />

      {/* Lyrics display */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 120px",
        }}
      >
        {visibleLines.map((line, i) => {
          const globalIdx = startIdx + i;
          return (
            <Sequence
              key={globalIdx}
              from={Math.round(line.start * fps)}
              durationInFrames={Math.round((line.end - line.start) * fps)}
              layout="none"
            >
              <LyricsLineDisplay
                text={line.text}
                isActive={globalIdx === currentLineIndex}
                fontSize={style?.fontSize ?? defaultTheme.fontSize}
              />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Helper to render audio — avoids import in JSX directly */
const Audio: React.FC<{ audioSrc: string }> = ({ audioSrc }) => (
  <AudioPlayer src={audioSrc} />
);
