# Code Review: lyrics-studio Initial Codebase

## Scope
- Files: 34 source files (21 TS/TSX, 3 Python, 10 JSON)
- LOC: ~1,100 (TS/TSX ~800, Python ~300)
- Focus: Full codebase review -- type safety, security, error handling, code quality

## Overall Assessment

Solid initial scaffold. Clean separation across monorepo packages with well-defined types. Key concerns: **command injection vulnerability** in subprocess spawning, several **error handling gaps**, and a few **logic bugs** in parsers.

---

## Critical Issues

### C1. Command Injection via `shell: true` in spawn-process.ts

**File:** `packages/cli/src/utils/spawn-process.ts:23`

```ts
const child = spawn(cmd, args, {
  cwd,
  stdio: verbose ? "inherit" : "pipe",
  shell: true, // <-- DANGEROUS
});
```

**Impact:** `shell: true` passes `cmd` and `args` through the system shell. User-supplied file paths (from `--audio`, `--lyrics`, `--output`, `--video` options) flow directly into args without sanitization. A filename like `; rm -rf /` or `$(malicious)` triggers arbitrary command execution.

**Fix:** Remove `shell: true`. Node's `spawn()` without shell already handles arguments safely as an array. If `npx` resolution is needed on Windows, use `cross-spawn` or `npm-run-path` instead.

```ts
const child = spawn(cmd, args, {
  cwd,
  stdio: verbose ? "inherit" : "pipe",
  // NO shell: true
});
```

### C2. JSON.stringify of user props passed as CLI arg (potential injection)

**File:** `packages/cli/src/commands/create.ts:63`

```ts
args: [
  "remotion", "render",
  compositionId,
  opts.output,
  "--props", JSON.stringify(inputProps),  // user paths embedded
],
```

Combined with `shell: true`, the JSON-stringified props containing user paths can break shell quoting. Even without shell, extremely long props may exceed OS arg limits.

**Fix:** Write inputProps to a temp JSON file and pass `--props ./tmp-props.json` instead.

---

## High Priority

### H1. LRC parser: last word end time uses wrong fallback

**File:** `packages/core/src/parsers/lrc-parser.ts:68`

```ts
words[i].end =
  i < words.length - 1 ? words[i + 1].start : words[0].start + 5;
//                                              ^^^^^^^^^ BUG
```

**Impact:** Last word's end time = first word's start + 5s. Should be relative to the last word's own start. For a line at 3:00 with first word at 0:05, last word end = 10s (nonsensical).

**Fix:**
```ts
words[i].end =
  i < words.length - 1 ? words[i + 1].start : words[i].start + 0.5;
```

### H2. SRT parser: 2-digit milliseconds not normalized

**File:** `packages/core/src/parsers/srt-parser.ts:46` and `scripts/ffmpeg-overlay/convert-lrc.py:43`

The TS SRT parser passes millisecond string directly to `parseTimestamp()` which handles normalization. OK.

But the Python `parse_srt()` at line 43 does:
```python
start = int(h1) * 3600 + int(m1) * 60 + int(s1) + int(ms1) / 1000
```

For 2-digit ms (e.g., `01:02:03,50`), `int("50") / 1000 = 0.05` instead of `0.5`. The TS parser handles this correctly via `msNorm`, but Python does not.

**Fix (Python):**
```python
ms_val = int(ms1) * 10 if len(ms1) == 2 else int(ms1)
start = int(h1) * 3600 + int(m1) * 60 + int(s1) + ms_val / 1000
```

### H3. parse command crashes on empty file

**File:** `packages/cli/src/commands/parse.ts:15`

```ts
console.log(`Duration: ${lines[0]?.start.toFixed(2)}s -- ${lines[lines.length - 1]?.end.toFixed(2)}s`);
```

If `lines` is empty (no valid lyrics found), `lines[0]?.start.toFixed(2)` returns `undefined.toFixed(2)` which throws. The `?.` stops at `undefined` but then `.toFixed()` is called on `undefined`.

Wait -- actually `lines[0]?.start` returns `undefined` if `lines[0]` is undefined, and then `.toFixed(2)` on `undefined` throws TypeError.

**Fix:** Guard empty array:
```ts
if (lines.length === 0) {
  console.log("No lyrics lines found.");
  return;
}
```

### H4. secondsToAssTime can produce `100` centiseconds

**File:** `packages/core/src/utils/time-utils.ts:32`

```ts
const cs = Math.round((seconds % 1) * 100);
```

When `seconds` fractional part is 0.999..., `Math.round` produces `100`, giving `0:01:30.100` (invalid ASS).

**Fix:**
```ts
const totalCs = Math.round(seconds * 100);
const h = Math.floor(totalCs / 360000);
const m = Math.floor((totalCs % 360000) / 6000);
const s = Math.floor((totalCs % 6000) / 100);
const cs = totalCs % 100;
```

### H5. No error handling for readFileSync calls

**Files:** `create.ts:29`, `create.ts:38`, `parse.ts:10`, `subtitle.ts:33`

All `readFileSync` calls have no try-catch. File not found, permission denied, or encoding errors will produce unhandled exceptions with ugly stack traces.

**Fix:** Wrap in try-catch with user-friendly error messages:
```ts
let content: string;
try {
  content = readFileSync(file, "utf-8");
} catch (err) {
  console.error(`Cannot read file: ${file} -- ${(err as Error).message}`);
  process.exit(1);
}
```

---

## Medium Priority

### M1. Duplicated parser logic between TS and Python

The LRC/SRT parsers exist in both `packages/core/` (TS) and `scripts/ffmpeg-overlay/convert-lrc.py` (Python). Behavior differences exist (H2 above). The CLI `subtitle` command already converts via the TS parser + `toAss()`, making the Python `convert-lrc.py` partially redundant.

**Recommendation:** Document when to use each. Consider having the CLI always handle conversion, so Python scripts only deal with ASS input.

### M2. `toRemotionProps` spreads `project.config` into style without validation

**File:** `packages/core/src/converters/to-remotion-props.ts:53`

```ts
style: {
  ...DEFAULT_STYLE,
  ...project.config, // unknown fields pass through
},
```

If `project.config` has unexpected fields (e.g., `__proto__`, or non-string values for color fields), they pass through unchecked.

**Fix:** Pick only known fields:
```ts
const { fontFamily, fontSize, textColor, highlightColor, backgroundColor, backgroundOpacity } = project.config ?? {};
```

### M3. `subtitle.ts` args spread is incorrect syntax

**File:** `packages/cli/src/commands/subtitle.ts:70`

```ts
const args = [
  path.join(scriptsDir, "overlay.py"),
  "soft",
  "--video", path.resolve(opts.video),
  "--subtitles", ...assFiles,  // spread in array literal is fine
  "--languages", ...opts.lang,
  "--output", path.resolve(opts.output),
];
```

This compiles, but `--subtitles file1 file2 --languages vi en` only works because Python argparse `nargs="+"` is greedy. However, if a subtitle file path starts with `--`, it will be misinterpreted as a flag. Low likelihood but worth noting.

### M4. Unused `frame` variable

**File:** `packages/remotion-app/src/compositions/kinetic-typography.tsx:33`

```ts
const frame = useCurrentFrame();  // declared but unused in outer component
```

The inner `KineticLine` component has its own `frame`. The outer one is dead code.

### M5. `Composition` cast to `any`

**File:** `packages/remotion-app/src/root.tsx:18`

```ts
const C = Composition as React.FC<any>;
```

This bypasses all type checking on Composition props. If Remotion's type API changed, this would silently pass.

**Recommendation:** Use proper generic types or `@ts-expect-error` with a comment explaining the version-specific workaround.

### M6. No `.gitignore` visible for temp files

The `subtitle` command writes temp ASS files to `os.tmpdir()/lyrics-studio/` but never cleans them up. Over time this accumulates stale files.

**Fix:** Clean up temp files after render completes, or use `tmp` package with auto-cleanup.

---

## Low Priority

### L1. `chalk` dependency declared but never imported

**File:** `packages/cli/package.json` lists `chalk: 5.4.1` but no source file imports it.

### L2. `pnpm-workspace.yaml` not reviewed

Not provided but expected at root for pnpm workspaces to function.

### L3. Missing `"files"` field in package.json

None of the 3 packages specify `"files"` in package.json, meaning `dist/`, `src/`, and config files all get included if published.

---

## Edge Cases Found

1. **LRC files with metadata tags** like `[ti:Title]`, `[ar:Artist]` -- these don't match `LRC_LINE_REGEX` and are silently skipped (correct behavior, but no metadata extraction).

2. **SRT with Windows CRLF** -- `content.split("\n")` handles `\r\n` lines but `\r` remains at end of text. The LRC parser's `trim()` handles this; SRT parser also trims. OK.

3. **Empty text after HTML strip** in SRT parser -- handled correctly (skips via `if (!text) continue`).

4. **Overlapping timestamp lines** in SRT -- parser takes first match, reasonable behavior.

5. **Concurrent temp file writes** -- multiple `subtitle` invocations write to same `lyrics-studio` temp dir. Filenames are based on input basename, so parallel runs with same-named inputs would overwrite each other.

6. **`video-bg` style without backgroundSrc** -- `VideoBackgroundProps` declares `backgroundSrc: string` (required), but `root.tsx` defaultProps has `backgroundSrc: ""`, causing `OffthreadVideo` to receive empty src. Would crash at render time.

---

## Positive Observations

- Clean type definitions with discriminated union for style
- Proper `as const` usage in theme and style arrays
- Well-structured monorepo with clear package boundaries
- Python scripts have proper argparse, type hints, and error handling
- `useTimedLyrics` hook is well-designed with memoization-ready structure
- SRT parser correctly handles sequence number-less blocks
- ASS converter properly implements `\kf` karaoke tags

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Remove `shell: true` from `spawn-process.ts` -- command injection risk
2. **[CRITICAL]** Fix LRC parser last word end time bug (H1)
3. **[HIGH]** Fix `secondsToAssTime` centisecond overflow (H4)
4. **[HIGH]** Fix Python SRT 2-digit ms normalization (H2)
5. **[HIGH]** Add empty-array guard in parse command (H3)
6. **[HIGH]** Add try-catch around all `readFileSync` calls (H5)
7. **[MEDIUM]** Write inputProps to temp file instead of CLI arg (C2)
8. **[MEDIUM]** Clean up temp ASS files after subtitle command (M6)
9. **[MEDIUM]** Remove unused `frame` variable in kinetic-typography (M4)
10. **[LOW]** Remove unused `chalk` dependency (L1)

## Metrics

- Type Coverage: ~85% (one `any` cast in root.tsx, missing return types on some functions)
- Test Coverage: 0% (no tests found)
- Linting Issues: ~3 (unused var, any cast, unused dependency)

## Unresolved Questions

1. Is `pnpm-workspace.yaml` present? (not listed in file tree but required for workspace protocol)
2. Should Python scripts be standalone or always invoked via CLI? Affects whether to fix Python parsers or deprecate them.
3. What is the intended deployment model -- npm publish or local monorepo only? Affects `"files"` field need.
