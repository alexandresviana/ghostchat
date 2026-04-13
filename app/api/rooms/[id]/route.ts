import { NextResponse } from "next/server";
import { hasBunnyStorageConfig } from "@/lib/env-bunny-storage";
import { getRoomWithRetry } from "@/lib/room-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const room = await getRoomWithRetry(id);
  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada ou encerrada." }, { status: 404 });
  }
  return NextResponse.json({
    room,
    mediaUploadConfigured: hasBunnyStorageConfig(),
  });
}
