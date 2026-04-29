/**
 * Lê credencial enviada pelo app nativo (CDNs por vezes tratam melhor Authorization do que headers X-*).
 */
export function getIosCredentialFromRequest(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  const bearer = auth ? /^Bearer\s+(.+)$/i.exec(auth.trim()) : null;
  const fromBearer = bearer?.[1]?.trim();
  const fromHeader = request.headers.get("x-ghostchat-ios-secret")?.replace(/^\uFEFF/, "").trim();
  return fromBearer || fromHeader || undefined;
}
