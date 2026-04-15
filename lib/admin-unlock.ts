/**
 * Token público para mostrar o formulário "Acesso interno" no painel.
 * Usado só no servidor (RSC, Route Handlers) para o valor em
 * NEXT_PUBLIC_* refletir o ambiente em runtime — no cliente o mesmo env
 * fica congelado no bundle do build.
 */
export function getAdminPanelUnlockToken(): string {
  return (
    process.env.NEXT_PUBLIC_GHOSTCHAT_ADMIN_UNLOCK_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_GHOSTCHAT_ADMIN_QUERY_TOKEN?.trim() ||
    ""
  );
}

export function tokenMatchesAdminPanelUnlock(
  candidate: string | undefined | null,
): boolean {
  const expected = getAdminPanelUnlockToken();
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
