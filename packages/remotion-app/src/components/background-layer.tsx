import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";
import { defaultTheme } from "../styles/default-theme.js";

interface BackgroundLayerProps {
  type: "gradient" | "image" | "video";
  src?: string;
  blur?: number;
  opacity?: number;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  type,
  src,
  blur = 0,
  opacity = 1,
}) => {
  const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;
  const resolvedSrc = src && !src.startsWith("http") && !src.startsWith("/") ? staticFile(src) : src;

  if (type === "gradient" || !src) {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${defaultTheme.gradientStart}, ${defaultTheme.gradientEnd})`,
          opacity,
        }}
      />
    );
  }

  if (type === "image") {
    return (
      <AbsoluteFill style={{ opacity }}>
        <Img
          src={resolvedSrc!}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: filterStyle,
          }}
        />
      </AbsoluteFill>
    );
  }

  // type === "video"
  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: filterStyle,
        }}
      />
    </AbsoluteFill>
  );
};
