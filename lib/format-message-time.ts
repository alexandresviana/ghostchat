/**
 * Hora local (sem data) para exibir junto a cada mensagem.
 * Safari/iOS falha muito com Date.parse em "YYYY-MM-DD HH:MM:SS" — por isso o regex vem primeiro.
 */
export function formatMessageTime(raw: string | undefined | null): string {
  if (raw == null || !String(raw).trim()) return "";

  const s = String(raw).trim();

  /* 1) SQLite / ISO sem timezone: 2026-04-12 15:30:05 ou 2026-04-12T15:30:05 */
  const sql = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (sql) {
    return `${sql[2]}:${sql[3]}`;
  }

  /* 2) ISO completo com Z ou offset */
  const normalized = s.includes("T") ? s : s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  const ms = Date.parse(normalized);
  if (!Number.isNaN(ms)) {
    const d = new Date(ms);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }

  /* 3) Qualquer HH:MM na string */
  const loose = /(?:^|[^\d])(\d{1,2}):(\d{2})(?::\d{2})?(?:[^\d]|$)/.exec(s);
  if (loose) {
    return `${loose[1].padStart(2, "0")}:${loose[2]}`;
  }

  return "";
}
