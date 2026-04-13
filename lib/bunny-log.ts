import "server-only";

/** Logs relacionados ao Bunny DB (terminal do Node / `next dev`). */
export function bunnyLog(...args: unknown[]) {
  if (process.env.NODE_ENV === "development" || process.env.BUNNY_DB_LOG === "1") {
    console.log("[GhostChat:Bunny]", ...args);
  }
}

export function bunnyLogError(...args: unknown[]) {
  console.error("[GhostChat:Bunny]", ...args);
}

/** Mostra só o host da URL libsql (sem token). */
export function maskLibsqlUrl(url: string): string {
  const m = url.match(/^(libsql:\/\/[^/]+)/i);
  return m ? `${m[1]}/…` : "libsql://…";
}
