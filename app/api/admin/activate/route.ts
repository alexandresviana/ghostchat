import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, signAdminSessionToken } from "@/lib/admin-session";
import { getAdminSecret } from "@/lib/env-admin";

export const runtime = "nodejs";

type Body = { secret?: string };

export async function POST(request: Request) {
  const expected = getAdminSecret();
  if (!expected) {
    return NextResponse.json(
      { error: "Modo admin não configurado no servidor." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const secret = typeof body.secret === "string" ? body.secret.trim() : "";
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: "Segredo inválido." }, { status: 401 });
  }

  let token: string;
  try {
    token = await signAdminSessionToken();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao criar sessão." }, { status: 500 });
  }

  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
