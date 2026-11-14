import "server-only";
import { spawn } from "node:child_process";

function getBundledFfmpeg(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("ffmpeg-static");
    return typeof mod === "string" ? mod : mod?.default || null;
  } catch {
    return null;
  }
}

/**
 * Run ffmpeg with audio in and audio out through pipes. Nothing touches the
 * disk, so there is no uploaded file to clean up afterwards.
 *
 * Binary: FFMPEG_PATH if set, else the one bundled by ffmpeg-static.
 */
export function ffmpegPath(): string {
  const path = process.env.FFMPEG_PATH || getBundledFfmpeg();
  if (!path) throw new Error("ffmpeg not found. Set FFMPEG_PATH or reinstall ffmpeg-static.");
  return path;
}

export class FfmpegError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FfmpegError";
  }
}

const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

export function runFfmpeg(
  args: string[],
  input: Uint8Array,
  { timeoutMs = 30_000 }: { timeoutMs?: number } = {},
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), ["-hide_banner", "-loglevel", "error", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const chunks: Buffer[] = [];
    let size = 0;
    let stderr = "";
    let settled = false;

    const finish = (error: Error | null, output?: Uint8Array) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        child.kill("SIGKILL");
        reject(error);
      } else {
        resolve(output!);
      }
    };

    const timer = setTimeout(() => finish(new FfmpegError("ffmpeg timed out")), timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) return finish(new FfmpegError("ffmpeg output too large"));
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 4000) stderr += chunk.toString();
    });
    child.on("error", (error) =>
      finish(new FfmpegError(`ffmpeg failed to start: ${error.message}`)),
    );
    child.on("close", (code) => {
      if (code === 0) finish(null, new Uint8Array(Buffer.concat(chunks)));
      else
        finish(new FfmpegError(`ffmpeg exited with code ${code}: ${stderr.trim().slice(0, 500)}`));
    });

    // ffmpeg may stop reading early (for example with -t); ignore the broken pipe.
    child.stdin.on("error", () => {});
    child.stdin.end(Buffer.from(input));
  });
}
