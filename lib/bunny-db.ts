import "server-only";
import { createClient, type Client } from "@libsql/client";
import { bunnyLog, maskLibsqlUrl } from "@/lib/bunny-log";
import { getBunnyAuthToken, getBunnyDatabaseUrl } from "@/lib/env-bunny";

let client: Client | null = null;

/**
 * Cliente singleton para Bunny Database (libSQL).
 * Use apenas em Route Handlers, Server Actions ou `server-only`.
 */
export function getBunnyDb(): Client {
  if (client) return client;
  const url = getBunnyDatabaseUrl();
  const authToken = getBunnyAuthToken();
  if (!url || !authToken) {
    throw new Error(
      "Defina BUNNY_DATABASE_URL (libsql://…) e o token: BUNNY_DATABASE_TOKEN ou BUNNY_DATABASE_AUTH_TOKEN.",
    );
  }
  client = createClient({ url, authToken });
  bunnyLog("cliente libSQL criado →", maskLibsqlUrl(url));
  return client;
}
