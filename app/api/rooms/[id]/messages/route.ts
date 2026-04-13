import { NextResponse } from "next/server";
import { formatMessageTime } from "@/lib/format-message-time";
import { isPublicHttpMediaUrl } from "@/lib/is-public-media-url";
import { isValidTypingClientId, listMessagesAndOthersTyping, postMessage } from "@/lib/room-service";

export const runtime = "nodejs";

const noStoreJson = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const clientParam = new URL(request.url).searchParams.get("clientId");
  const clientId =
    clientParam && isValidTypingClientId(clientParam) ? clientParam : null;

  const bundle = await listMessagesAndOthersTyping(id, clientId);
  if (bundle === null) {
    return NextResponse.json(
      { error: "Sala não encontrada ou encerrada." },
      { status: 404, headers: noStoreJson },
    );
  }
  const { messages, othersTyping } = bundle;
  const messagesOut = messages.map((m) => ({
    ...m,
    displayTime: formatMessageTime(m.createdAt),
  }));
  return NextResponse.json(
    { messages: messagesOut, othersTyping },
    { headers: noStoreJson },
  );
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  let body: { body?: string; mediaUrl?: string | null; mediaKind?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body : "";
  const rawMedia = body.mediaUrl;
  const mediaUrl =
    rawMedia === null || rawMedia === undefined
      ? null
      : typeof rawMedia === "string"
        ? rawMedia.trim() || null
        : null;

  const textStripped = text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!textStripped && !mediaUrl) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  if (mediaUrl != null && !isPublicHttpMediaUrl(mediaUrl)) {
    return NextResponse.json(
      {
        error:
          "URL de imagem inválida. As fotos têm de ser enviadas pelo botão 📷 (armazenamento Bunny) — não use links blob: ou data:.",
      },
      { status: 400 },
    );
  }

  const msg = await postMessage(id, {
    body: textStripped,
    mediaUrl,
    mediaKind: body.mediaKind ?? null,
  });
  if (!msg) {
    return NextResponse.json(
      { error: "Sala não encontrada ou encerrada." },
      { status: 404, headers: noStoreJson },
    );
  }
  return NextResponse.json(
    { message: { ...msg, displayTime: formatMessageTime(msg.createdAt) } },
    { headers: noStoreJson },
  );
}
