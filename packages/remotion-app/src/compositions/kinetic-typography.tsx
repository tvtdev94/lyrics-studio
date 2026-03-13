import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LyricsLine, StyleConfig } from "@lyrics-studio/core";
import { BackgroundLayer } from "../components/background-layer.js";
import { AudioPlayer } from "../components/audio-player.js";
import { useTimedLyrics } from "../hooks/use-timed-lyrics.js";
import { defaultTheme } from "../styles/default-theme.js";

export interface KineticTypographyProps {
  title: string;
  audioSrc: string;
  backgroundSrc?: string;
  lyrics: LyricsLine[];
  style?: Partial<StyleConfig>;
}

/**
 * Style 2: Kinetic Typography
 * Spring-based text animations, words fly in with scale + rotation.
 */
export const KineticTypography: React.FC<KineticTypographyProps> = ({
  audioSrc,
  backgroundSrc,
  lyrics,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { currentLine, currentLineIndex, lineProgress } = useTimedLyrics(lyrics);

  return (
    <AbsoluteFill>
      <BackgroundLayer type={backgroundSrc ? "image" : "gradient"} src={backgroundSrc} />
      <AbsoluteFill style={{ backgroundColor: defaultTheme.overlayColor }} />
      <AudioPlayer src={audioSrc} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 100px",
        }}
      >
        {currentLine && (
          <KineticLine
            key={currentLineIndex}
            text={currentLine.text}
            progress={lineProgress}
            fontSize={style?.fontSize ?? 72}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const KineticLine: React.FC<{
  text: string;
  progress: number;
  fontSize: number;
}> = ({ text, progress, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "12px",
      }}
    >
      {words.map((word, i) => {
        const delay = i * 3; // Stagger each word by 3 frames
        const s = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, mass: 0.8, stiffness: 100 },
        });

        const translateY = interpolate(s, [0, 1], [40, 0]);
        const opacity = interpolate(s, [0, 1], [0, 1]);
        const rotate = interpolate(s, [0, 1], [-5, 0]);

        // Exit animation
        const exitProgress = Math.max(0, progress - 0.8) / 0.2;
        const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
        const exitScale = interpolate(exitProgress, [0, 1], [1, 0.8]);

        return (
          <span
            key={i}
            style={{
              fontSize,
              fontFamily: defaultTheme.fontFamily,
              fontWeight: 700,
              color: defaultTheme.textColor,
              transform: `translateY(${translateY}px) rotate(${rotate}deg) scale(${exitScale})`,
              opacity: opacity * exitOpacity,
              display: "inline-block",
              textShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
