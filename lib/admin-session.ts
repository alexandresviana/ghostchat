import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getAdminSecret } from "@/lib/env-admin";

const ISS = "ghostchat-admin";
const AUD = "admin-panel";
const COOKIE = "ghostchat_admin";

export const ADMIN_COOKIE_NAME = COOKIE;

export async function signAdminSessionToken(): Promise<string> {
  const secret = getAdminSecret();
  if (!secret) {
    throw new Error("GHOSTCHAT_ADMIN_SECRET não configurado.");
  }
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISS)
    .setAudience(AUD)
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyAdminSessionToken(
  token: string,
): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  try {
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key, { issuer: ISS, audience: AUD });
    return true;
  } catch {
    return false;
  }
}
