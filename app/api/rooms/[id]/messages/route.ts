import { NextResponse } from "next/server";
import { formatMessageTime } from "@/lib/format-message-time";
import { isPublicHttpMediaUrl } from "@/lib/is-public-media-url";
import {
  isValidTypingClientId,
  listMessagesAndOthersTyping,
  postMessage,
} from "@/lib/room-service";

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
  if (bundle.status === "bad_client") {
    return NextResponse.json(
      { error: "Parâmetro clientId é obrigatório e deve ser válido.", code: "CLIENT_ID_REQUIRED" },
      { status: 400, headers: noStoreJson },
    );
  }
  if (bundle.status === "gone") {
    return NextResponse.json(
      { error: "Sala não encontrada ou encerrada." },
      { status: 404, headers: noStoreJson },
    );
  }
  if (bundle.status === "room_full") {
    return NextResponse.json(
      {
        error:
          "Esta sala já tem o máximo de participantes (1 criador + 1 convidado). Peça o link a quem criou a conversa.",
        code: "ROOM_FULL",
      },
      { status: 403, headers: noStoreJson },
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
  let body: {
    body?: string;
    mediaUrl?: string | null;
    mediaKind?: string | null;
    clientId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const cid = typeof body.clientId === "string" ? body.clientId : "";
  if (!isValidTypingClientId(cid)) {
    return NextResponse.json(
      { error: "Campo clientId é obrigatório e deve ser válido.", code: "CLIENT_ID_REQUIRED" },
      { status: 400 },
    );
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

  const result = await postMessage(id, cid, {
    body: textStripped,
    mediaUrl,
    mediaKind: body.mediaKind ?? null,
  });
  if (!result.ok) {
    if (result.reason === "room_full") {
      return NextResponse.json(
        {
          error:
            "Esta sala já tem o máximo de participantes (1 criador + 1 convidado).",
          code: "ROOM_FULL",
        },
        { status: 403, headers: noStoreJson },
      );
    }
    if (result.reason === "bad_client") {
      return NextResponse.json({ error: "clientId inválido." }, { status: 400, headers: noStoreJson });
    }
    return NextResponse.json(
      { error: "Sala não encontrada ou encerrada." },
      { status: 404, headers: noStoreJson },
    );
  }
  const msg = result.message;
  return NextResponse.json(
    { message: { ...msg, displayTime: formatMessageTime(msg.createdAt) } },
    { headers: noStoreJson },
  );
}
