import { NextResponse } from "next/server";
import { isAdminSessionActive } from "@/lib/admin-request";
import { getAdminSecret } from "@/lib/env-admin";

export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(getAdminSecret());
  const admin = configured && (await isAdminSessionActive());
  return NextResponse.json({
    admin,
    /** Indica se o servidor aceita ativação (sem revelar se o segredo está definido em detalhe). */
    adminLoginAvailable: configured,
  });
}
