import { NextResponse } from "next/server";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { hasBunnyStorageConfig } from "@/lib/env-bunny-storage";

export const runtime = "nodejs";

export async function GET() {
  const hasDb = hasBunnySqlConfig();
  const hasEdge = Boolean(process.env.NEXT_PUBLIC_EDGE_API_URL);
  const hasStorage = hasBunnyStorageConfig();

  let bunnyPing: boolean | null = null;
  let bunnyPingError: string | undefined;

  let bunnyRoomsRowCount: number | undefined;
  let bunnyRoomsCountError: string | undefined;

  if (hasDb) {
    const { pingBunnyDatabase, countBunnyRooms } = await import("@/lib/bunny-ping");
    const ping = await pingBunnyDatabase();
    bunnyPing = ping.ok;
    if (!ping.ok) bunnyPingError = ping.error;
    if (
      ping.ok &&
      process.env.GHOSTCHAT_HEALTH_STATS === "1"
    ) {
      try {
        bunnyRoomsRowCount = await countBunnyRooms();
      } catch (e) {
        bunnyRoomsCountError =
          e instanceof Error ? e.message : String(e);
      }
    }
  }

  const res = NextResponse.json({
    ok: true,
    api: "next-route-handlers",
    store: hasDb ? "bunny-database" : "in-memory",
    bunnyDatabaseConfigured: hasDb,
    bunnyPing,
    ...(bunnyPingError ? { bunnyPingError } : {}),
    ...(bunnyRoomsRowCount !== undefined ? { bunnyRoomsRowCount } : {}),
    ...(bunnyRoomsCountError ? { bunnyRoomsCountError } : {}),
    edgeApiConfigured: hasEdge,
    bunnyStorageConfigured: hasStorage,
  });
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  return res;
}
