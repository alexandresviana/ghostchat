import "server-only";
import convert from "heic-convert";

/** HEIC/HEIF (iPhone) — MIME ou extensão do ficheiro */
export function isHeicOrHeif(mime: string, fileName: string): boolean {
  const m = mime.split(";")[0].trim().toLowerCase();
  if (m === "image/heic" || m === "image/heif") return true;
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif";
}

export async function convertHeicBufferToJpeg(buffer: Buffer): Promise<Buffer> {
  const out = await convert({
    buffer,
    format: "JPEG",
    quality: 0.88,
  });
  if (Buffer.isBuffer(out)) return out;
  const u8 = out instanceof Uint8Array ? out : new Uint8Array(out);
  return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
}
