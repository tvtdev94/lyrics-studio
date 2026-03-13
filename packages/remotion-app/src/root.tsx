import React from "react";
import { Composition } from "remotion";
import type { LyricsLine } from "@lyrics-studio/core";
import { SimpleLyrics } from "./compositions/simple-lyrics.js";
import { KineticTypography } from "./compositions/kinetic-typography.js";
import { VideoBackground } from "./compositions/video-background.js";
import { KaraokeHighlight } from "./compositions/karaoke-highlight.js";

const FPS = 30;

function calculateDuration(lyrics: LyricsLine[]): number {
  if (lyrics.length === 0) return FPS * 10;
  const lastLine = lyrics[lyrics.length - 1];
  return Math.ceil((lastLine.end + 3) * FPS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = Composition as React.FC<any>;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <C
        id="simple-lyrics"
        component={SimpleLyrics}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ title: "Sample", audioSrc: "", lyrics: [] }}
        calculateMetadata={({ props }: { props: { lyrics: LyricsLine[] } }) => ({
          durationInFrames: calculateDuration(props.lyrics),
        })}
      />
      <C
        id="kinetic-typography"
        component={KineticTypography}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ title: "Sample", audioSrc: "", lyrics: [] }}
        calculateMetadata={({ props }: { props: { lyrics: LyricsLine[] } }) => ({
          durationInFrames: calculateDuration(props.lyrics),
        })}
      />
      <C
        id="video-background"
        component={VideoBackground}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ title: "Sample", audioSrc: "", backgroundSrc: "", lyrics: [] }}
        calculateMetadata={({ props }: { props: { lyrics: LyricsLine[] } }) => ({
          durationInFrames: calculateDuration(props.lyrics),
        })}
      />
      <C
        id="karaoke-highlight"
        component={KaraokeHighlight}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ title: "Sample", audioSrc: "", lyrics: [] }}
        calculateMetadata={({ props }: { props: { lyrics: LyricsLine[] } }) => ({
          durationInFrames: calculateDuration(props.lyrics),
        })}
      />
    </>
  );
};
