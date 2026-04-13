import "server-only";

/** Garante URL absoluta para fetch (o painel por vezes mostra só o hostname). */
function withHttpsScheme(url: string): string {
  const t = url.replace(/\/$/, "").trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * Bunny Storage (Edge Storage) — HTTP API.
 * Password = "FTP & API password" da storage zone no painel Bunny.
 * CDN = URL pública do Pull Zone ligado a esta storage zone (ex.: https://xxx.b-cdn.net).
 */
export function getBunnyStorageApiHost(): string {
  const raw =
    process.env.BUNNY_STORAGE_API_HOST?.trim() || "storage.bunnycdn.com";
  return withHttpsScheme(raw);
}

export function getBunnyStorageZoneName(): string | undefined {
  const z = process.env.BUNNY_STORAGE_ZONE_NAME?.trim();
  return z || undefined;
}

export function getBunnyStoragePassword(): string | undefined {
  const p =
    process.env.BUNNY_STORAGE_PASSWORD?.trim() ||
    process.env.BUNNY_STORAGE_API_KEY?.trim();
  return p || undefined;
}

/** Base pública do Pull Zone (sem barra final), ex.: https://meu-pullzone.b-cdn.net */
export function getBunnyCdnPublicBase(): string | undefined {
  const u = process.env.NEXT_PUBLIC_BUNNY_CDN_URL?.trim();
  if (!u) return undefined;
  return withHttpsScheme(u);
}

export function hasBunnyStorageConfig(): boolean {
  return Boolean(
    getBunnyStorageZoneName() &&
      getBunnyStoragePassword() &&
      getBunnyCdnPublicBase(),
  );
}
