import "server-only";

/** Segredo para ativar sessão admin no painel (cookie HttpOnly). Não commite o valor real. */
export function getAdminSecret(): string | undefined {
  const s = process.env.GHOSTCHAT_ADMIN_SECRET?.trim();
  return s || undefined;
}
