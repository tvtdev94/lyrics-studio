/**
 * Parse timestamp string to seconds.
 * Supports: MM:SS.ms, HH:MM:SS,ms, HH:MM:SS.ms
 */
export function parseTimestamp(str: string): number {
  // HH:MM:SS,ms or HH:MM:SS.ms
  const longMatch = str.match(
    /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{2,3})/,
  );
  if (longMatch) {
    const [, h, m, s, ms] = longMatch;
    const msNorm = ms.length === 2 ? Number(ms) * 10 : Number(ms);
    return Number(h) * 3600 + Number(m) * 60 + Number(s) + msNorm / 1000;
  }

  // MM:SS.ms (LRC format)
  const shortMatch = str.match(/(\d{1,2}):(\d{2})[.](\d{2,3})/);
  if (shortMatch) {
    const [, m, s, ms] = shortMatch;
    const msNorm = ms.length === 2 ? Number(ms) * 10 : Number(ms);
    return Number(m) * 60 + Number(s) + msNorm / 1000;
  }

  throw new Error(`Invalid timestamp format: ${str}`);
}

/** Convert seconds to ASS time format: H:MM:SS.cc */
export function secondsToAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.min(99, Math.round((seconds % 1) * 100));
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Convert seconds to frame number at given fps */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}
