import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultTheme } from "../styles/default-theme.js";

interface LyricsLineProps {
  text: string;
  isActive: boolean;
  fontSize?: number;
  color?: string;
  activeColor?: string;
}

export const LyricsLineDisplay: React.FC<LyricsLineProps> = ({
  text,
  isActive,
  fontSize = defaultTheme.fontSize,
  color = defaultTheme.dimColor,
  activeColor = defaultTheme.textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = isActive
    ? spring({ frame, fps, config: { damping: 20 } })
    : interpolate(frame, [0, 10], [0.4, 0.4], { extrapolateRight: "clamp" });

  const scale = isActive
    ? interpolate(
        spring({ frame, fps, config: { damping: 15, mass: 0.5 } }),
        [0, 1],
        [0.95, 1],
      )
    : 0.9;

  return (
    <div
      style={{
        fontSize,
        fontFamily: defaultTheme.fontFamily,
        color: isActive ? activeColor : color,
        opacity,
        transform: `scale(${scale})`,
        textAlign: "center",
        padding: "8px 16px",
        transition: "color 0.2s ease",
        textShadow: isActive ? "0 2px 8px rgba(0,0,0,0.5)" : "none",
      }}
    >
      {text}
    </div>
  );
};
