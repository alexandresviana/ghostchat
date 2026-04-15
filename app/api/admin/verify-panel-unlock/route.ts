import { NextResponse } from "next/server";
import { tokenMatchesAdminPanelUnlock } from "@/lib/admin-unlock";

export const runtime = "nodejs";

/** Compara o token com o env no servidor (funciona em prod sem rebuild). */
export async function POST(req: Request) {
  let token: unknown;
  try {
    const body = (await req.json()) as { token?: unknown };
    token = body?.token;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ok = typeof token === "string" && tokenMatchesAdminPanelUnlock(token);
  return NextResponse.json({ ok });
}
