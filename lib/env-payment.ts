import "server-only";

export function getWooviApiUrl(): string {
  return (
    process.env.WOOVI_API_URL?.trim() || "https://api.woovi.com"
  ).replace(/\/$/, "");
}

export function getWooviAuth(): string | undefined {
  const a = process.env.WOOVI_AUTH?.trim();
  return a || undefined;
}

/** HS256 — obrigatório em produção para JWT de sessão pós-pagamento */
export function getSessionJwtSecret(): string | undefined {
  const s = process.env.GHOSTCHAT_SESSION_SECRET?.trim();
  return s || undefined;
}

/** Apenas desenvolvimento: permite criar salas sem pagamento */
export function bypassPayment(): boolean {
  return (
    process.env.GHOSTCHAT_BYPASS_PAYMENT === "1" ||
    process.env.GHOSTCHAT_BYPASS_PAYMENT === "true"
  );
}

/**
 * Igual ao que o app envia (`X-GhostChat-iOS-Secret` ou `Authorization: Bearer …`).
 * Aliases aceites — às vezes o nome nas variáveis de ambiente falha só por typo.
 */
export function getIosApiSecret(): string | undefined {
  const raw =
    process.env.GHOSTCHAT_IOS_API_SECRET?.trim() ||
    process.env.GHOSTCHAT_IOS_SECRET?.trim() ||
    process.env.IOS_NATIVE_API_SECRET?.trim() ||
    "";
  const stripped = raw.replace(/^\uFEFF/, "").trim();
  return stripped || undefined;
}

/** Permite POST /api/entitlement/free-test — 1 link grátis (só ative em staging/testes). */
export function freeTestLinkEnabled(): boolean {
  return (
    process.env.GHOSTCHAT_ENABLE_FREE_TEST_LINK === "1" ||
    process.env.GHOSTCHAT_ENABLE_FREE_TEST_LINK === "true"
  );
}
