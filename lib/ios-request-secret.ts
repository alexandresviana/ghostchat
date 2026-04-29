import { getIosApiSecret } from "@/lib/env-payment";

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

/**
 * Log de diagnóstico sem expor o segredo (só comprimentos e presença de headers).
 * Ative `GHOSTCHAT_IOS_DEBUG_LOG=1` em produção para JSON completo; em `development` loga sempre.
 */
export function logIosNativeRoomAuthDebug(
  request: Request,
  label = "POST /api/rooms/ios",
): void {
  const expectedSecret = getIosApiSecret();
  const sentCredential = getIosCredentialFromRequest(request);
  const match = Boolean(
    expectedSecret && sentCredential && sentCredential === expectedSecret,
  );

  const snapshot = {
    label,
    expectedSecretConfigured: Boolean(expectedSecret),
    expectedSecretLength: expectedSecret?.length ?? 0,
    sentCredentialPresent: Boolean(sentCredential),
    sentCredentialLength: sentCredential?.length ?? 0,
    credentialsMatch: match,
    authorizationHeaderPresent: Boolean(request.headers.get("authorization")?.trim()),
    xGhostChatIosSecretPresent: Boolean(
      request.headers.get("x-ghostchat-ios-secret")?.trim(),
    ),
    userAgentPrefix: (request.headers.get("user-agent") || "").slice(0, 120),
  };

  const verboseLog =
    process.env.GHOSTCHAT_IOS_DEBUG_LOG === "1" ||
    process.env.GHOSTCHAT_IOS_DEBUG_LOG === "true";
  const isDev = process.env.NODE_ENV === "development";

  if (verboseLog || isDev) {
    console.log(`[${label}][iOS native auth]`, JSON.stringify(snapshot));
  }

  if (sentCredential && expectedSecret && !match) {
    console.warn(
      `[${label}] Credencial iOS rejeitada: comprimento enviado=${sentCredential.length} esperado=${expectedSecret.length}. Defina GHOSTCHAT_IOS_DEBUG_LOG=1 para log JSON completo.`,
    );
  }

  if (sentCredential && !expectedSecret) {
    console.warn(
      `[${label}] Pedido com credencial iOS mas o servidor não tem GHOSTCHAT_IOS_API_SECRET (ou alias) definido.`,
    );
  }

  if (!sentCredential && expectedSecret && !isDev) {
    // Em produção ajuda a ver que o app não enviou header (muitas vezes scheme/env no cliente).
    if (verboseLog) {
      console.warn(
        `[${label}] Servidor espera segredo iOS (length=${expectedSecret.length}) mas o pedido não trouxe Authorization nem X-GhostChat-iOS-Secret.`,
      );
    }
  }
}
