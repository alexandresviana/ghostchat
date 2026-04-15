import "server-only";
import { bunnyLog, bunnyLogError } from "@/lib/bunny-log";
import { getBunnyDb } from "@/lib/bunny-db";
import { ensureBunnySchema } from "@/lib/ensure-bunny-schema";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { expiresAtFromCreated } from "@/lib/room-expiry";
import {
  memoryTyping,
  pruneMemoryTypingRoom,
  typingActivityCutoffMs,
} from "@/lib/room-typing-memory";

export type RoomDTO = {
  id: string;
  slug: string;
  createdAt: string;
  expiresAt: string;
  endedAt: string | null;
};

export type MessageDTO = {
  id: string;
  roomId: string;
  body: string;
  mediaUrl: string | null;
  mediaKind: string | null;
  createdAt: string;
};

function useSql(): boolean {
  return hasBunnySqlConfig();
}

async function dbReady() {
  const db = getBunnyDb();
  await ensureBunnySchema(db);
  return db;
}

/** Fallback local quando Bunny Database não está configurado */
const memoryRooms = new Map<string, RoomDTO & { messages: MessageDTO[] }>();

/** clientIds distintos por sala — máximo 2 (criador + 1 convidado). */
const memoryRoomParticipants = new Map<string, Set<string>>();

const MAX_ROOM_PARTICIPANTS = 2;

function iso(d: number): string {
  return new Date(d).toISOString();
}

export async function createRoom(options?: {
  createdByEmail?: string | null;
}): Promise<RoomDTO> {
  const id = crypto.randomUUID();
  const slug = id;
  const created = Date.now();
  const expiresAt = expiresAtFromCreated(created);

  const row: RoomDTO = {
    id,
    slug,
    createdAt: iso(created),
    expiresAt: iso(expiresAt),
    endedAt: null,
  };

  const createdBy = options?.createdByEmail?.trim() || null;

  if (useSql()) {
    const db = await dbReady();
    const ins = await db.execute({
      sql: `INSERT INTO rooms (id, slug, created_at, expires_at, ended_at, created_by_email)
            VALUES (?, ?, ?, ?, NULL, ?)`,
      args: [id, slug, row.createdAt, row.expiresAt, createdBy],
    });
    if ((ins.rowsAffected ?? 0) < 1) {
      bunnyLogError("INSERT rooms não afetou linhas", { id });
      throw new Error("Falha ao gravar a sala no Bunny Database (INSERT sem efeito).");
    }
    const check = await db.execute({
      sql: `SELECT id FROM rooms WHERE id = ?`,
      args: [id],
    });
    if (!check.rows[0]) {
      bunnyLogError("sala não encontrada após INSERT", { id });
      throw new Error("Falha ao confirmar a sala no Bunny Database (SELECT após INSERT).");
    }
    bunnyLog("sala criada e confirmada no SQL →", id);
    return row;
  }

  memoryRooms.set(id, { ...row, messages: [] });
  return row;
}

function isExpired(r: RoomDTO): boolean {
  if (r.endedAt) return true;
  return Date.now() > new Date(r.expiresAt).getTime();
}

/**
 * Várias leituras com pequeno atraso — no Bunny/libSQL o primeiro SELECT após criar a sala
 * ou sob carga pode falhar intermitentemente; o iPhone (upload pesado) amplifica o timing.
 */
export async function getRoomWithRetry(id: string): Promise<RoomDTO | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const attempts = 4;
  const delayMs = 120;
  for (let i = 0; i < attempts; i++) {
    const room = await getRoom(trimmed);
    if (room) return room;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

export async function getRoom(id: string): Promise<RoomDTO | null> {
  if (useSql()) {
    const db = await dbReady();
    const res = await db.execute({
      sql: `SELECT id, slug, created_at, expires_at, ended_at FROM rooms WHERE id = ?`,
      args: [id],
    });
    const row = res.rows[0];
    if (!row) return null;
    const room: RoomDTO = {
      id: String(row.id),
      slug: String(row.slug),
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
      endedAt: row.ended_at != null ? String(row.ended_at) : null,
    };
    if (isExpired(room)) return null;
    return room;
  }

  const r = memoryRooms.get(id);
  if (!r) return null;
  if (isExpired(r)) {
    memoryRooms.delete(id);
    memoryTyping.delete(id);
    return null;
  }
  return {
    id: r.id,
    slug: r.slug,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    endedAt: r.endedAt,
  };
}

export async function endRoom(id: string): Promise<boolean> {
  if (useSql()) {
    const db = await dbReady();
    /** Remove a sala da base — `messages` e `room_typing` apagam em cascata. */
    const res = await db.execute({
      sql: `DELETE FROM rooms WHERE id = ?`,
      args: [id],
    });
    return (res.rowsAffected ?? 0) > 0;
  }
  const r = memoryRooms.get(id);
  if (!r || r.endedAt) return false;
  memoryRooms.delete(id);
  memoryTyping.delete(id);
  memoryRoomParticipants.delete(id);
  return true;
}

/**
 * Regista este browser (clientId) na sala. No máximo 2 clientIds distintos.
 * Reutiliza o mesmo critério de validade que o typing (`isValidTypingClientId`).
 */
export async function joinRoomParticipant(
  roomId: string,
  clientId: string,
): Promise<"ok" | "full" | "invalid"> {
  if (!isValidTypingClientId(clientId)) return "invalid";
  const room = await getRoomWithRetry(roomId);
  if (!room) return "invalid";

  if (useSql()) {
    const db = await dbReady();
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT OR IGNORE INTO room_participants (room_id, client_id, created_at) VALUES (?, ?, ?)`,
      args: [roomId, clientId, now],
    });
    const cntRes = await db.execute({
      sql: `SELECT COUNT(*) AS c FROM room_participants WHERE room_id = ?`,
      args: [roomId],
    });
    const c = Number(cntRes.rows[0]?.c ?? 0);
    if (c > MAX_ROOM_PARTICIPANTS) {
      await db.execute({
        sql: `DELETE FROM room_participants WHERE room_id = ? AND client_id = ?`,
        args: [roomId, clientId],
      });
      return "full";
    }
    return "ok";
  }

  let set = memoryRoomParticipants.get(roomId);
  if (!set) {
    set = new Set();
    memoryRoomParticipants.set(roomId, set);
  }
  if (set.has(clientId)) return "ok";
  if (set.size >= MAX_ROOM_PARTICIPANTS) return "full";
  set.add(clientId);
  return "ok";
}

export function isValidTypingClientId(id: string | undefined | null): id is string {
  if (!id || typeof id !== "string") return false;
  if (id.length < 8 || id.length > 80) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/** Atualiza estado “a digitar” para este separador (clientId gerado no browser). */
export async function setRoomTyping(
  roomId: string,
  clientId: string,
  active: boolean,
): Promise<boolean> {
  if (!isValidTypingClientId(clientId)) return false;
  const room = await getRoomWithRetry(roomId);
  if (!room) return false;

  if (useSql()) {
    const db = await dbReady();
    if (active) {
      await db.execute({
        sql: `INSERT INTO room_typing (room_id, client_id, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(room_id, client_id) DO UPDATE SET updated_at = excluded.updated_at`,
        args: [roomId, clientId, Date.now()],
      });
    } else {
      await db.execute({
        sql: `DELETE FROM room_typing WHERE room_id = ? AND client_id = ?`,
        args: [roomId, clientId],
      });
    }
    return true;
  }

  pruneMemoryTypingRoom(roomId);
  let m = memoryTyping.get(roomId);
  if (!m) {
    m = new Map();
    memoryTyping.set(roomId, m);
  }
  if (active) {
    m.set(clientId, Date.now());
  } else {
    m.delete(clientId);
  }
  return true;
}

/** Há outro cliente a digitar nesta sala (exclui o próprio clientId). */
export async function areOthersTyping(
  roomId: string,
  selfClientId: string,
): Promise<boolean> {
  if (!isValidTypingClientId(selfClientId)) return false;
  const room = await getRoom(roomId);
  if (!room) return false;

  const cutoff = typingActivityCutoffMs();

  if (useSql()) {
    const db = await dbReady();
    /** Sem DELETE aqui — custava um round-trip extra em *cada* poll; linhas antigas são ignoradas pelo `updated_at > ?`. */
    const res = await db.execute({
      sql: `SELECT 1 AS n FROM room_typing
            WHERE room_id = ? AND client_id != ? AND updated_at > ?
            LIMIT 1`,
      args: [roomId, selfClientId, cutoff],
    });
    return Boolean(res.rows[0]);
  }

  pruneMemoryTypingRoom(roomId);
  const m = memoryTyping.get(roomId);
  if (!m) return false;
  for (const [cid, t] of m) {
    if (cid === selfClientId) continue;
    if (t > cutoff) return true;
  }
  return false;
}

export async function listMessages(roomId: string): Promise<MessageDTO[] | null> {
  const room = await getRoom(roomId);
  if (!room) return null;

  if (useSql()) {
    const db = await dbReady();
    const res = await db.execute({
      sql: `SELECT id, room_id, body, media_url, media_kind, created_at
            FROM messages WHERE room_id = ? ORDER BY created_at ASC`,
      args: [roomId],
    });
    return res.rows.map((row) => ({
      id: String(row.id),
      roomId: String(row.room_id),
      body: String(row.body ?? ""),
      mediaUrl: row.media_url != null ? String(row.media_url) : null,
      mediaKind: row.media_kind != null ? String(row.media_kind) : null,
      createdAt: String(row.created_at),
    }));
  }
  const r = memoryRooms.get(roomId);
  if (!r) return null;
  return [...r.messages];
}

export type ListMessagesBundle =
  | { status: "ok"; messages: MessageDTO[]; othersTyping: boolean }
  | { status: "gone" }
  | { status: "room_full" }
  | { status: "bad_client" };

/** Um `getRoom` + queries em paralelo — menos latência que listMessages + areOthersTyping em série. */
export async function listMessagesAndOthersTyping(
  roomId: string,
  clientId: string | null,
): Promise<ListMessagesBundle> {
  const room = await getRoomWithRetry(roomId);
  if (!room) return { status: "gone" };

  if (!clientId || !isValidTypingClientId(clientId)) {
    return { status: "bad_client" };
  }

  const joined = await joinRoomParticipant(roomId, clientId);
  if (joined === "full") return { status: "room_full" };
  if (joined === "invalid") return { status: "gone" };

  const cutoff = typingActivityCutoffMs();

  if (useSql()) {
    const db = await dbReady();
    const [msgRes, typRes] = await Promise.all([
      db.execute({
        sql: `SELECT id, room_id, body, media_url, media_kind, created_at
              FROM messages WHERE room_id = ? ORDER BY created_at ASC`,
        args: [roomId],
      }),
      db.execute({
        sql: `SELECT 1 AS n FROM room_typing
              WHERE room_id = ? AND client_id != ? AND updated_at > ?
              LIMIT 1`,
        args: [roomId, clientId, cutoff],
      }),
    ]);
    const messages = msgRes.rows.map((row) => ({
      id: String(row.id),
      roomId: String(row.room_id),
      body: String(row.body ?? ""),
      mediaUrl: row.media_url != null ? String(row.media_url) : null,
      mediaKind: row.media_kind != null ? String(row.media_kind) : null,
      createdAt: String(row.created_at),
    }));
    const othersTyping = Boolean(typRes.rows[0]);
    return { status: "ok", messages, othersTyping };
  }

  const r = memoryRooms.get(roomId);
  if (!r) return { status: "gone" };
  const messages = [...r.messages];
  pruneMemoryTypingRoom(roomId);
  const m = memoryTyping.get(roomId);
  let othersTyping = false;
  if (m) {
    for (const [cid, t] of m) {
      if (cid === clientId) continue;
      if (t > cutoff) {
        othersTyping = true;
        break;
      }
    }
  }
  return { status: "ok", messages, othersTyping };
}

export type PostMessageResult =
  | { ok: true; message: MessageDTO }
  | { ok: false; reason: "gone" | "room_full" | "bad_client" };

export async function postMessage(
  roomId: string,
  clientId: string,
  payload: { body: string; mediaUrl?: string | null; mediaKind?: string | null },
): Promise<PostMessageResult> {
  if (!isValidTypingClientId(clientId)) {
    return { ok: false, reason: "bad_client" };
  }
  const room = await getRoomWithRetry(roomId);
  if (!room) return { ok: false, reason: "gone" };

  const joined = await joinRoomParticipant(roomId, clientId);
  if (joined === "full") return { ok: false, reason: "room_full" };
  if (joined === "invalid") return { ok: false, reason: "gone" };

  const id = crypto.randomUUID();
  const body = payload.body ?? "";
  const mediaUrl = payload.mediaUrl ?? null;
  const mediaKind = payload.mediaKind ?? null;
  const createdAt = iso(Date.now());

  const msg: MessageDTO = {
    id,
    roomId,
    body,
    mediaUrl,
    mediaKind,
    createdAt,
  };

  if (useSql()) {
    const db = await dbReady();
    await db.execute({
      sql: `INSERT INTO messages (id, room_id, body, media_url, media_kind, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, roomId, body, mediaUrl, mediaKind, createdAt],
    });
    return { ok: true, message: msg };
  }

  const r = memoryRooms.get(roomId);
  if (!r) return { ok: false, reason: "gone" };
  r.messages.push(msg);
  return { ok: true, message: msg };
}

