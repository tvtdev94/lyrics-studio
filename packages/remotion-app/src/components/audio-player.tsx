import React from "react";
import { Audio, staticFile } from "remotion";

interface AudioPlayerProps {
  src: string;
  volume?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  volume = 1,
}) => {
  // Use staticFile() for relative paths (from public dir)
  const resolvedSrc = src.startsWith("http") || src.startsWith("/") ? src : staticFile(src);
  return <Audio src={resolvedSrc} volume={volume} />;
};
