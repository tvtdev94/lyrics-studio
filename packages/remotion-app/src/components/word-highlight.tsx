import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { LyricsWord } from "@lyrics-studio/core";
import { defaultTheme } from "../styles/default-theme.js";

interface WordHighlightProps {
  words: LyricsWord[];
  fontSize?: number;
  baseColor?: string;
  highlightColor?: string;
}

export const WordHighlight: React.FC<WordHighlightProps> = ({
  words,
  fontSize = defaultTheme.fontSize,
  baseColor = defaultTheme.dimColor,
  highlightColor = defaultTheme.highlightColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "4px",
        padding: "8px 16px",
      }}
    >
      {words.map((word, i) => {
        const isActive = currentTime >= word.start && currentTime < word.end;
        const isPast = currentTime >= word.end;
        const wordDuration = word.end - word.start;
        const progress =
          isActive && wordDuration > 0
            ? (currentTime - word.start) / wordDuration
            : isPast
              ? 1
              : 0;

        const scale = isActive
          ? interpolate(progress, [0, 0.5, 1], [1, 1.1, 1])
          : 1;

        return (
          <span
            key={i}
            style={{
              fontSize,
              fontFamily: defaultTheme.fontFamily,
              color: isPast || isActive ? highlightColor : baseColor,
              transform: `scale(${scale})`,
              display: "inline-block",
              textShadow:
                isActive
                  ? `0 0 20px ${highlightColor}40`
                  : "none",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
