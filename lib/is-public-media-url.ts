/**
 * URLs aceites para anexos guardados na base (nunca blob:/data:).
 * Aceita http e https — Pull Zones Bunny ou domínios customizados podem usar http em algumas configs.
 */
export function isPublicHttpMediaUrl(url: string): boolean {
  const t = url.trim();
  if (!t || t.length > 4096) return false;
  const lower = t.toLowerCase();
  if (
    lower.startsWith("blob:") ||
    lower.startsWith("data:") ||
    lower.startsWith("javascript:")
  ) {
    return false;
  }
  try {
    const u = new URL(t);
    if (!u.hostname) return false;
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
