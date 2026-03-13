import { spawn } from "node:child_process";

interface SpawnOptions {
  cmd: string;
  args: string[];
  cwd?: string;
  verbose?: boolean;
}

/** Spawn a subprocess and stream output. Returns exit code. */
export function spawnProcess(options: SpawnOptions): Promise<number> {
  const { cmd, args, cwd, verbose = false } = options;

  if (verbose) {
    console.log(`> ${cmd} ${args.join(" ")}`);
  }

  return new Promise((resolve, reject) => {
    // Windows needs shell: true for .cmd executables (npx, pnpm, etc.)
    const isWindows = process.platform === "win32";

    const child = spawn(cmd, args, {
      cwd,
      stdio: verbose ? "inherit" : "pipe",
      shell: isWindows,
    });

    if (!verbose && child.stdout) {
      child.stdout.on("data", (data: Buffer) => process.stdout.write(data));
    }
    if (!verbose && child.stderr) {
      child.stderr.on("data", (data: Buffer) => process.stderr.write(data));
    }

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}
