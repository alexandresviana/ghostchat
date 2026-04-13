import { NextResponse } from "next/server";
import { endRoom } from "@/lib/room-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const ok = await endRoom(id);
  if (!ok) {
    return NextResponse.json({ error: "Sala não encontrada ou já encerrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
