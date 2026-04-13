import { NextResponse } from "next/server";
import { isValidTypingClientId, setRoomTyping } from "@/lib/room-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  let body: { clientId?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const active = body.active === true;
  if (!isValidTypingClientId(clientId)) {
    return NextResponse.json({ error: "clientId inválido." }, { status: 400 });
  }
  const ok = await setRoomTyping(id, clientId, active);
  if (!ok) {
    return NextResponse.json(
      { error: "Sala não encontrada ou encerrada." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
