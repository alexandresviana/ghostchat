import { NextResponse } from "next/server";
import { createRoom } from "@/lib/room-service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const room = await createRoom();
    return NextResponse.json({ room });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível criar a sala." },
      { status: 500 },
    );
  }
}
