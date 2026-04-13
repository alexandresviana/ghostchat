/** Duração padrão da sala após criação (24 horas). */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export function expiresAtFromCreated(createdMs: number): number {
  return createdMs + ROOM_TTL_MS;
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
