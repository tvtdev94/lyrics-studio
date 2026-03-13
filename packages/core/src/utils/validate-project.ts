import type { LyricsProject } from "../types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a LyricsProject for required fields and timing consistency */
export function validateProject(project: LyricsProject): ValidationResult {
  const errors: string[] = [];

  if (!project.title) errors.push("Missing title");
  if (!project.audio) errors.push("Missing audio path");
  if (!project.style) errors.push("Missing style");

  const validStyles = ["simple", "kinetic", "video-bg", "karaoke"];
  if (project.style && !validStyles.includes(project.style)) {
    errors.push(`Invalid style: ${project.style}. Must be one of: ${validStyles.join(", ")}`);
  }

  if (!project.lyrics || project.lyrics.length === 0) {
    errors.push("No lyrics lines provided");
  } else {
    // Check timing consistency
    for (let i = 0; i < project.lyrics.length; i++) {
      const line = project.lyrics[i];
      if (line.start < 0) errors.push(`Line ${i}: negative start time`);
      if (line.end <= line.start) errors.push(`Line ${i}: end <= start`);

      if (i > 0 && line.start < project.lyrics[i - 1].start) {
        errors.push(`Line ${i}: start time before previous line`);
      }
    }

    // Karaoke style requires word-level timing
    if (project.style === "karaoke") {
      const hasWords = project.lyrics.some((l) => l.words && l.words.length > 0);
      if (!hasWords) {
        errors.push("Karaoke style requires word-level timing in at least some lines");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
