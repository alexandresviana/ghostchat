/**
 * Token secreto no path `/panel/o/[token]` para a página de compra customizada (PIX).
 * Apenas servidor / API — não use NEXT_PUBLIC_* para o valor real do token.
 */
export function getCustomPurchasePathToken(): string {
  return process.env.GHOSTCHAT_CUSTOM_PURCHASE_PATH_TOKEN?.trim() || "";
}

export function tokenMatchesCustomPurchasePath(
  candidate: string | undefined | null,
): boolean {
  const expected = getCustomPurchasePathToken();
  if (!expected || candidate == null) return false;
  const raw = String(candidate).trim();
  if (!raw) return false;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* usar raw */
  }
  return decoded === expected || raw === expected;
}
