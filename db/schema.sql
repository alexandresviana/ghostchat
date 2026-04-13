-- Ghost Chat — salas efêmeras por link (Bunny Database / libSQL)

-- Sala criada no painel; quem entra pela URL compartilhada participa do mesmo chat.
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  -- slug curto e único para a URL pública (/c/{slug})
  slug TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- fim automático (ex.: created_at + 24h), calculado no app ou por trigger
  expires_at TEXT NOT NULL,
  -- quando o dono encerra manualmente pelo botão "Encerrar"
  ended_at TEXT,
  -- opcional: id do criador se houver login depois
  host_user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);
CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at);

-- Mensagens de texto; mídia (foto) via URL após upload (ex.: Bunny Storage)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  -- URL pública da mídia quando for imagem/arquivo
  media_url TEXT,
  media_kind TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- apelido local opcional (sem login)
  sender_label TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);

-- Job de limpeza (cron Edge / worker): DELETE FROM rooms WHERE expires_at < now OR ended_at IS NOT NULL
-- e arquivos no storage associados aos media_url.
