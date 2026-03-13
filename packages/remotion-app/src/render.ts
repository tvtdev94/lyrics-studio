import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

interface RenderOptions {
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputPath: string;
  codec?: "h264" | "h265";
}

/**
 * Programmatic render: bundle → select composition → render to MP4.
 */
export async function renderVideo(options: RenderOptions): Promise<string> {
  const {
    compositionId,
    inputProps,
    outputPath,
    codec = "h264",
  } = options;

  const entryPoint = path.resolve(import.meta.dirname, "index.ts");

  console.log(`Bundling Remotion project...`);
  const bundled = await bundle({ entryPoint });

  console.log(`Selecting composition: ${compositionId}`);
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps,
  });

  console.log(`Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps...`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec,
    outputLocation: outputPath,
    inputProps,
  });

  console.log(`Render complete: ${outputPath}`);
  return outputPath;
}
