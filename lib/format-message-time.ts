import { formatClockPtBr } from "@/lib/time-brasil";

/**
 * Hora (HH:MM) em Brasília para exibir junto a cada mensagem.
 * Safari/iOS falha muito com Date.parse em "YYYY-MM-DD HH:MM:SS" — por isso o regex vem primeiro.
 */
export function formatMessageTime(raw: string | undefined | null): string {
  if (raw == null || !String(raw).trim()) return "";

  const s = String(raw).trim();

  /* 1) SQLite / ISO sem timezone: 2026-04-12 15:30:05 ou 2026-04-12T15:30:05 — tratar como UTC se terminar em Z? Na verdade o servidor grava ISO local/UTC; interpretamos como instante e convertemos para BR. */
  const sql = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (sql) {
    const isoUtc = `${sql[1]}T${sql[2]}:${sql[3]}:${sql[4] ?? "00"}.000Z`;
    const ms = Date.parse(isoUtc);
    if (!Number.isNaN(ms)) return formatClockPtBr(ms);
    return `${sql[2]}:${sql[3]}`;
  }

  /* 2) ISO completo com Z ou offset */
  const normalized = s.includes("T") ? s : s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
  const ms = Date.parse(normalized);
  if (!Number.isNaN(ms)) {
    return formatClockPtBr(ms);
  }

  /* 3) Qualquer HH:MM na string — sem data, assume relógio já “de exibição” */
  const loose = /(?:^|[^\d])(\d{1,2}):(\d{2})(?::\d{2})?(?:[^\d]|$)/.exec(s);
  if (loose) {
    return `${loose[1].padStart(2, "0")}:${loose[2]}`;
  }

  return "";
}
