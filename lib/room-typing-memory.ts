import "server-only";

/** TTL (ms) para considerar “a digitar” ativo — só usado neste ficheiro. */
const TYPING_TTL_MS = 4500;

/** roomId → clientId → último ping de “a digitar” */
export const memoryTyping = new Map<string, Map<string, number>>();

/** Limite de tempo (epoch ms): pings mais antigos que isto contam como inativos. */
export function typingActivityCutoffMs(): number {
  return Date.now() - TYPING_TTL_MS;
}

export function pruneMemoryTypingRoom(roomId: string) {
  const m = memoryTyping.get(roomId);
  if (!m) return;
  const cutoff = typingActivityCutoffMs();
  for (const [cid, t] of m) {
    if (t <= cutoff) m.delete(cid);
  }
  if (m.size === 0) memoryTyping.delete(roomId);
}
