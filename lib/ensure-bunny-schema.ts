import "server-only";
import type { Client } from "@libsql/client";
import { bunnyLog } from "@/lib/bunny-log";

let schemaLogged = false;
/** DDL só na primeira vez — evita ~10 round-trips ao libSQL em *cada* request (4s+). */
let schemaInit: Promise<void> | null = null;

/** Garante tabelas no Bunny/libSQL (idempotente — corre uma vez por processo). */
export async function ensureBunnySchema(db: Client): Promise<void> {
  if (!schemaInit) {
    schemaInit = applySchemaOnce(db);
  }
  await schemaInit;
}

async function applySchemaOnce(db: Client): Promise<void> {
  try {
    await db.execute("PRAGMA foreign_keys = ON");
  } catch {
    /* alguns hosts remotos não expõem PRAGMA */
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      ended_at TEXT,
      host_user_id TEXT
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at)`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      body TEXT NOT NULL DEFAULT '',
      media_url TEXT,
      media_kind TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sender_label TEXT
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at)`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS room_typing (
      room_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, client_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `);

  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_room_typing_room_updated ON room_typing(room_id, updated_at)`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pay_charges (
      id TEXT PRIMARY KEY,
      correlation_id TEXT UNIQUE NOT NULL,
      plan_code TEXT NOT NULL,
      value_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      woovi_identifier TEXT,
      woovi_payment_link_id TEXT,
      br_code TEXT,
      customer_name TEXT,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_pay_charges_email ON pay_charges(customer_email)`,
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS link_entitlements (
      customer_email TEXT PRIMARY KEY,
      plan_code TEXT NOT NULL,
      links_limit INTEGER NOT NULL,
      links_used INTEGER NOT NULL DEFAULT 0,
      window_ends_at TEXT NOT NULL,
      last_payment_correlation_id TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  try {
    await db.execute(
      `ALTER TABLE rooms ADD COLUMN created_by_email TEXT`,
    );
  } catch {
    /* coluna já existe */
  }

  if (!schemaLogged) {
    schemaLogged = true;
    bunnyLog("schema aplicada (rooms, messages, room_typing)");
  }
}
