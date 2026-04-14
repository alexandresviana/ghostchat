import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/entitlement-jwt";

export function getBearerToken(request: Request | NextRequest): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

export async function getSessionEmailFromRequest(
  request: Request | NextRequest,
): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  const claims = await verifySessionToken(token);
  return claims?.email ?? null;
}
