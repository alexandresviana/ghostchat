import "server-only";

/**
 * URL do Bunny Database (libsql://…).
 * Obrigatório no `.env`: **só** `BUNNY_DATABASE_URL` — não usamos `DATABASE_URL` nem outros nomes.
 */
export function getBunnyDatabaseUrl(): string | undefined {
  const u = process.env.BUNNY_DATABASE_URL?.trim();
  if (!u) return undefined;
  return u.replace(/\/$/, "");
}

/**
 * Token de escrita. O painel da Bunny costuma expor como "Access token";
 * aceitamos os dois nomes de variável.
 */
export function getBunnyAuthToken(): string | undefined {
  const t =
    process.env.BUNNY_DATABASE_TOKEN?.trim() ||
    process.env.BUNNY_DATABASE_AUTH_TOKEN?.trim();
  return t || undefined;
}

export function hasBunnySqlConfig(): boolean {
  return Boolean(getBunnyDatabaseUrl() && getBunnyAuthToken());
}
