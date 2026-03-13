import { registerRoot } from "remotion";
import { RemotionRoot } from "./root.js";

registerRoot(RemotionRoot);

export { RemotionRoot } from "./root.js";
// render.ts is Node.js-only, import it directly: import { renderVideo } from "@lyrics-studio/remotion-app/render"
export { SimpleLyrics } from "./compositions/simple-lyrics.js";
export { KineticTypography } from "./compositions/kinetic-typography.js";
export { VideoBackground } from "./compositions/video-background.js";
export { KaraokeHighlight } from "./compositions/karaoke-highlight.js";
