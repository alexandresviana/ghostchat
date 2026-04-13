import "server-only";
import {
  getBunnyCdnPublicBase,
  getBunnyStorageApiHost,
  getBunnyStoragePassword,
  getBunnyStorageZoneName,
} from "@/lib/env-bunny-storage";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isAllowedImageMime(mime: string): boolean {
  return Boolean(ALLOWED[mime.toLowerCase()]);
}

export function extForMime(mime: string): string {
  return ALLOWED[mime.toLowerCase()] ?? "bin";
}

export type UploadImageResult = { publicUrl: string; path: string };

/**
 * PUT no endpoint HTTP da Bunny Storage; URL pública via Pull Zone (NEXT_PUBLIC_BUNNY_CDN_URL).
 */
export async function uploadChatImage(options: {
  roomId: string;
  buffer: Buffer;
  contentType: string;
}): Promise<UploadImageResult> {
  const zone = getBunnyStorageZoneName();
  const password = getBunnyStoragePassword();
  const apiHost = getBunnyStorageApiHost();
  const cdnBase = getBunnyCdnPublicBase();

  if (!zone || !password || !cdnBase) {
    throw new Error("Bunny Storage não está configurado no servidor.");
  }

  const mime = options.contentType.split(";")[0].trim().toLowerCase();
  if (!isAllowedImageMime(mime)) {
    throw new Error("Tipo de imagem não permitido.");
  }

  const ext = extForMime(mime);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const remoteSegments = ["ghostchat", options.roomId, fileName];
  const storagePath = remoteSegments.join("/");

  const uploadUrl = `${apiHost}/${[zone, ...remoteSegments].map(encodeURIComponent).join("/")}`;

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: password,
      "Content-Type": mime,
    },
    body: new Uint8Array(options.buffer),
  });

  if (res.status !== 201) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Falha no upload (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  const publicUrl = `${cdnBase}/${remoteSegments.map(encodeURIComponent).join("/")}`;

  return { publicUrl, path: storagePath };
}
