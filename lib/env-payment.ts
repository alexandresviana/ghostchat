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

/** Segredo opcional iguala `X-GhostChat-iOS-Secret`; permite criar salas no app iOS sem cookie de sessão/PIX quando definido em produção. */
export function getIosApiSecret(): string | undefined {
  const s = process.env.GHOSTCHAT_IOS_API_SECRET?.trim();
  return s || undefined;
}

/** Permite POST /api/entitlement/free-test — 1 link grátis (só ative em staging/testes). */
export function freeTestLinkEnabled(): boolean {
  return (
    process.env.GHOSTCHAT_ENABLE_FREE_TEST_LINK === "1" ||
    process.env.GHOSTCHAT_ENABLE_FREE_TEST_LINK === "true"
  );
}
