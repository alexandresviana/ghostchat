import { NextResponse } from "next/server";
import { uploadChatImage } from "@/lib/bunny-storage-upload";
import { hasBunnyStorageConfig } from "@/lib/env-bunny-storage";
import { convertHeicBufferToJpeg, isHeicOrHeif } from "@/lib/heic-to-jpeg";
import { getRoomWithRetry } from "@/lib/room-service";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = typeof rawId === "string" ? rawId.trim() : "";

  if (!hasBunnyStorageConfig()) {
    return NextResponse.json(
      { error: "Armazenamento de imagens não está configurado." },
      { status: 503 },
    );
  }

  if (!id) {
    return NextResponse.json({ error: "ID de sala inválido." }, { status: 400 });
  }

  if (!(await getRoomWithRetry(id))) {
    return NextResponse.json(
      { error: "Sala não encontrada ou encerrada." },
      { status: 404 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Envie uma imagem no campo file." },
      { status: 400 },
    );
  }

  const fileName = file instanceof File ? file.name : "";
  let mime = file.type.split(";")[0].trim().toLowerCase();
  /** iOS por vezes envia HEIC sem MIME ou como octet-stream */
  if (
    (!mime || mime === "application/octet-stream") &&
    isHeicOrHeif("", fileName)
  ) {
    mime = "image/heic";
  }

  const looksLikeImage =
    mime.startsWith("image/") ||
    isHeicOrHeif(mime, fileName) ||
    (/\.(jpe?g|png|gif|webp)$/i.test(fileName) && mime === "application/octet-stream");

  if (!looksLikeImage) {
    return NextResponse.json({ error: "Apenas imagens." }, { status: 400 });
  }

  let buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "Imagem demasiado grande (máx. 5 MB)." },
      { status: 413 },
    );
  }

  if (isHeicOrHeif(mime, fileName)) {
    try {
      buf = Buffer.from(await convertHeicBufferToJpeg(buf));
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        {
          error:
            "Não foi possível processar esta foto HEIC. Tenta outra imagem ou, no iPhone: Ajustes → Câmara → Formatos → «Mais compatível» (JPEG).",
        },
        { status: 400 },
      );
    }
    mime = "image/jpeg";
  }

  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "Imagem demasiado grande após conversão (máx. 5 MB)." },
      { status: 413 },
    );
  }

  try {
    const { publicUrl } = await uploadChatImage({
      roomId: id,
      buffer: buf,
      contentType: mime,
    });
    return NextResponse.json(
      { url: publicUrl },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Erro no upload.";
    const clientSafe =
      msg.includes("não permitido") || msg.includes("não está configurado");
    return NextResponse.json(
      { error: msg },
      { status: clientSafe ? 400 : 500 },
    );
  }
}
