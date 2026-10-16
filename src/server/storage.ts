import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { env } from "./env";
import { AppError } from "./errors";

// Private local storage. Files live outside /public and are only served through
// an authorised route that checks workspace membership. Swap for S3/GCS by
// implementing the same three functions.

const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "video/webm": "webm", // MediaRecorder in some browsers
};
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Verify content by magic bytes rather than trusting the declared type. */
export function sniffType(buf: Buffer): string | null {
  const hex = buf.subarray(0, 12).toString("hex");
  const ascii = buf.subarray(0, 12).toString("latin1");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE") return "audio/wav";
  if (ascii.startsWith("OggS")) return "audio/ogg";
  if (hex.startsWith("1a45dfa3")) return "audio/webm";
  if (ascii.startsWith("ID3") || hex.startsWith("fffb") || hex.startsWith("fff3") || hex.startsWith("fff2")) return "audio/mpeg";
  if (ascii.slice(4, 8) === "ftyp") return "audio/mp4";
  if (hex.startsWith("fff1") || hex.startsWith("fff9")) return "audio/aac";
  return null;
}

export function validateUpload(kind: "AUDIO" | "IMAGE", buf: Buffer) {
  const e = env();
  const maxMb = kind === "AUDIO" ? e.MAX_AUDIO_MB : e.MAX_IMAGE_MB;
  if (buf.length === 0) throw new AppError("VALIDATION", "The file is empty.");
  if (buf.length > maxMb * 1024 * 1024) {
    throw new AppError("PAYLOAD_TOO_LARGE", `File is larger than ${maxMb} MB.`);
  }
  const sniffed = sniffType(buf);
  const allowed = kind === "AUDIO" ? AUDIO_TYPES : IMAGE_TYPES;
  if (!sniffed || !(sniffed in allowed)) {
    throw new AppError(
      "UNSUPPORTED_MEDIA",
      kind === "AUDIO"
        ? "Unsupported audio file. Use MP3, M4A, WAV, OGG or WebM."
        : "Unsupported image. Use a JPG, PNG or WebP photo.",
    );
  }
  return { mimeType: sniffed, ext: allowed[sniffed] };
}

// Driver: "local" writes to STORAGE_DIR; "database" stores bytes in Postgres (serverless hosts
// such as Vercel have no persistent disk). Defaults to "database" on Vercel.
function driver(): "local" | "database" {
  const d = process.env.STORAGE_DRIVER;
  if (d === "local" || d === "database") return d;
  return process.env.VERCEL ? "database" : "local";
}

function root() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env().STORAGE_DIR);
}

function resolveKey(key: string) {
  const full = path.resolve(/*turbopackIgnore: true*/ root(), key);
  if (!full.startsWith(root() + path.sep)) throw new AppError("VALIDATION", "Invalid storage key");
  return full;
}

export async function putObject(workspaceId: string, ext: string, buf: Buffer) {
  const month = new Date().toISOString().slice(0, 7);
  const key = `${workspaceId}/${month}/${randomUUID()}.${ext}`;
  const hash = createHash("sha256").update(buf).digest("hex");
  if (driver() === "database") {
    await prisma.storedFile.create({ data: { key, workspaceId, bytes: new Uint8Array(buf), sizeBytes: buf.length } });
  } else {
    const full = resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buf, { mode: 0o600 });
  }
  return { key, sha256: hash };
}

export async function getObject(key: string) {
  if (driver() === "database") {
    const f = await prisma.storedFile.findUnique({ where: { key } });
    if (!f) throw new AppError("NOT_FOUND", "File not found");
    return Buffer.from(f.bytes);
  }
  return readFile(resolveKey(key));
}

export async function deleteObject(key: string) {
  if (driver() === "database") {
    await prisma.storedFile.deleteMany({ where: { key } });
    return;
  }
  await rm(resolveKey(key), { force: true });
}

export function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}
