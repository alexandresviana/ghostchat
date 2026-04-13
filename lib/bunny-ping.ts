import "server-only";
import { getBunnyDb } from "@/lib/bunny-db";
import { bunnyLog, bunnyLogError } from "@/lib/bunny-log";
import { ensureBunnySchema } from "@/lib/ensure-bunny-schema";

export type BunnyPingResult =
  | { ok: true }
  | { ok: false; error: string };

/** Conta linhas em `rooms` (útil para confirmar que o INSERT do painel chegou ao mesmo DB). */
export async function countBunnyRooms(): Promise<number> {
  const db = getBunnyDb();
  await ensureBunnySchema(db);
  const res = await db.execute("SELECT COUNT(*) AS n FROM rooms");
  const n = res.rows[0]?.n;
  return typeof n === "bigint" ? Number(n) : Number(n ?? 0);
}

/** Verifica ligação ao Bunny: schema + `SELECT 1`. */
export async function pingBunnyDatabase(): Promise<BunnyPingResult> {
  try {
    const db = getBunnyDb();
    await ensureBunnySchema(db);
    await db.execute("SELECT 1");
    bunnyLog("ping OK (SELECT 1)");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    bunnyLogError("ping falhou:", msg);
    return { ok: false, error: msg };
  }
}
