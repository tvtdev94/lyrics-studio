import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { LyricsLine, StyleConfig } from "@lyrics-studio/core";
import { BackgroundLayer } from "../components/background-layer.js";
import { AudioPlayer } from "../components/audio-player.js";
import { LyricsLineDisplay } from "../components/lyrics-line.js";
import { useTimedLyrics } from "../hooks/use-timed-lyrics.js";
import { defaultTheme } from "../styles/default-theme.js";

export interface VideoBackgroundProps {
  title: string;
  audioSrc: string;
  backgroundSrc: string;
  lyrics: LyricsLine[];
  style?: Partial<StyleConfig>;
}

/**
 * Style 3: Video Background
 * Video file as background with lyrics overlay on semi-transparent bar.
 */
export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  audioSrc,
  backgroundSrc,
  lyrics,
  style,
}) => {
  const { currentLine, currentLineIndex } = useTimedLyrics(lyrics);

  // Show previous line dimmed + current line bright
  const prevLine = currentLineIndex > 0 ? lyrics[currentLineIndex - 1] : null;

  return (
    <AbsoluteFill>
      <BackgroundLayer type="video" src={backgroundSrc} />
      <AudioPlayer src={audioSrc} />

      {/* Bottom bar overlay */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            padding: "24px 60px",
            minHeight: "120px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {prevLine && (
            <LyricsLineDisplay
              text={prevLine.text}
              isActive={false}
              fontSize={(style?.fontSize ?? 48) * 0.75}
            />
          )}
          {currentLine && (
            <LyricsLineDisplay
              text={currentLine.text}
              isActive={true}
              fontSize={style?.fontSize ?? 48}
            />
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
