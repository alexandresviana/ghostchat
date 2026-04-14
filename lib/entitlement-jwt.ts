import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getSessionJwtSecret } from "@/lib/env-payment";

const ISS = "ghostchat";
const AUD = "panel";

export type SessionClaims = {
  email: string;
};

export async function signSessionToken(
  email: string,
  expiresAtMs: number,
): Promise<string> {
  const secret = getSessionJwtSecret();
  if (!secret) {
    throw new Error("GHOSTCHAT_SESSION_SECRET não configurado.");
  }
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ email: email.toLowerCase().trim() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISS)
    .setAudience(AUD)
    .setExpirationTime(Math.floor(expiresAtMs / 1000))
    .sign(key);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  const secret = getSessionJwtSecret();
  if (!secret) return null;
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, {
      issuer: ISS,
      audience: AUD,
    });
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;
    return { email: email.toLowerCase().trim() };
  } catch {
    return null;
  }
}
