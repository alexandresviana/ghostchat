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

-- No máximo 2 clientIds distintos por sala (criador + 1 convidado)
CREATE TABLE IF NOT EXISTS room_participants (
  room_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (room_id, client_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);

-- Job de limpeza (cron Edge / worker): DELETE FROM rooms WHERE expires_at < now OR ended_at IS NOT NULL
-- e arquivos no storage associados aos media_url.

-- Opcional no DDL manual: coluna de rastreio do criador (o app também faz ALTER se faltar)
-- ALTER TABLE rooms ADD COLUMN created_by_email TEXT;

-- Cobranças PIX (Woovi); estado atualizado por webhook + polling
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
  paid_at TEXT,
  -- plan_code = 'custom': número de links acordado na compra personalizada (URL /panel/o/...)
  custom_links_limit INTEGER
);
CREATE INDEX IF NOT EXISTS idx_pay_charges_email ON pay_charges(customer_email);

-- Direito a gerar N links em janela de 30 dias após pagamento
CREATE TABLE IF NOT EXISTS link_entitlements (
  customer_email TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL,
  links_limit INTEGER NOT NULL,
  links_used INTEGER NOT NULL DEFAULT 0,
  window_ends_at TEXT NOT NULL,
  last_payment_correlation_id TEXT,
  updated_at TEXT NOT NULL
);
