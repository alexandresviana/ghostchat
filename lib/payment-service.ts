import "server-only";
import { bunnyLog } from "@/lib/bunny-log";
import { getBunnyDb } from "@/lib/bunny-db";
import { ensureBunnySchema } from "@/lib/ensure-bunny-schema";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { signSessionToken } from "@/lib/entitlement-jwt";
import { getPlan, type PlanCode } from "@/lib/plans";
import { createRoom } from "@/lib/room-service";

async function dbReady() {
  const db = getBunnyDb();
  await ensureBunnySchema(db);
  return db;
}

function useSql(): boolean {
  return hasBunnySqlConfig();
}

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type PayChargeRow = {
  correlationId: string;
  planCode: string;
  valueCents: number;
  status: string;
  customerEmail: string;
};

export async function insertPayCharge(row: {
  id: string;
  correlationId: string;
  planCode: PlanCode;
  valueCents: number;
  wooviIdentifier: string;
  wooviPaymentLinkId: string;
  brCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** Só para `plan_code = custom`: número de links do pacote. */
  customLinksLimit?: number | null;
}): Promise<void> {
  if (!useSql()) return;
  const db = await dbReady();
  const now = new Date().toISOString();
  const custom =
    row.planCode === "custom" && row.customLinksLimit != null
      ? Math.floor(row.customLinksLimit)
      : null;
  await db.execute({
    sql: `INSERT INTO pay_charges (
      id, correlation_id, plan_code, value_cents, status,
      woovi_identifier, woovi_payment_link_id, br_code,
      customer_name, customer_email, customer_phone, created_at,
      custom_links_limit
    ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      row.id,
      row.correlationId,
      row.planCode,
      row.valueCents,
      row.wooviIdentifier,
      row.wooviPaymentLinkId,
      row.brCode,
      row.customerName,
      row.customerEmail.toLowerCase().trim(),
      row.customerPhone,
      now,
      custom,
    ],
  });
}

export async function getPayChargeByCorrelation(
  correlationId: string,
): Promise<PayChargeRow | null> {
  if (!useSql()) return null;
  const db = await dbReady();
  const res = await db.execute({
    sql: `SELECT correlation_id, plan_code, value_cents, status, customer_email
          FROM pay_charges WHERE correlation_id = ?`,
    args: [correlationId],
  });
  const r = res.rows[0];
  if (!r) return null;
  return {
    correlationId: String(r.correlation_id),
    planCode: String(r.plan_code),
    valueCents: Number(r.value_cents),
    status: String(r.status),
    customerEmail: String(r.customer_email ?? ""),
  };
}

export async function updatePayChargeCompleted(
  correlationId: string,
  paidAt: string,
): Promise<{
  planCode: PlanCode;
  customerEmail: string;
  linksLimitOverride: number | null;
} | null> {
  if (!useSql()) return null;
  const db = await dbReady();
  await db.execute({
    sql: `UPDATE pay_charges SET status = 'COMPLETED', paid_at = ? WHERE correlation_id = ? AND status = 'PENDING'`,
    args: [paidAt, correlationId],
  });
  const res = await db.execute({
    sql: `SELECT plan_code, customer_email, custom_links_limit FROM pay_charges WHERE correlation_id = ?`,
    args: [correlationId],
  });
  const r = res.rows[0];
  if (!r) return null;
  const pc = String(r.plan_code) as PlanCode;
  if (!getPlan(pc)) return null;
  const rawCustom = r.custom_links_limit;
  const linksLimitOverride =
    pc === "custom" && rawCustom != null && !Number.isNaN(Number(rawCustom))
      ? Math.floor(Number(rawCustom))
      : null;
  return {
    planCode: pc,
    customerEmail: String(r.customer_email ?? "").toLowerCase().trim(),
    linksLimitOverride,
  };
}

export async function updatePayChargeExpired(correlationId: string): Promise<void> {
  if (!useSql()) return;
  const db = await dbReady();
  await db.execute({
    sql: `UPDATE pay_charges SET status = 'EXPIRED' WHERE correlation_id = ? AND status = 'PENDING'`,
    args: [correlationId],
  });
}

/**
 * Aplica o pacote ao email: substitui a janela de 30 dias e repõe contagem de links.
 */
export async function upsertEntitlementAfterPayment(options: {
  customerEmail: string;
  planCode: PlanCode;
  correlationId: string;
  /** Para `plan_code = custom`, número de links (vem da cobrança). */
  linksLimitOverride?: number | null;
}): Promise<{ windowEndsAtMs: number; linksLimit: number }> {
  const plan = getPlan(options.planCode);
  if (!plan) throw new Error("Plano inválido.");
  let resolvedLimit = plan.linksLimit;
  if (options.planCode === "custom") {
    const n = options.linksLimitOverride;
    if (n == null || !Number.isFinite(n) || n < 1) {
      throw new Error("Pacote personalizado inválido.");
    }
    resolvedLimit = Math.floor(n);
  }
  const email = options.customerEmail.toLowerCase().trim();
  const ends = Date.now() + WINDOW_MS;
  const endsIso = new Date(ends).toISOString();
  const now = new Date().toISOString();

  if (!useSql()) {
    return { windowEndsAtMs: ends, linksLimit: resolvedLimit };
  }

  const db = await dbReady();
  await db.execute({
    sql: `INSERT INTO link_entitlements (
      customer_email, plan_code, links_limit, links_used, window_ends_at,
      last_payment_correlation_id, updated_at
    ) VALUES (?, ?, ?, 0, ?, ?, ?)
    ON CONFLICT(customer_email) DO UPDATE SET
      plan_code = excluded.plan_code,
      links_limit = excluded.links_limit,
      links_used = 0,
      window_ends_at = excluded.window_ends_at,
      last_payment_correlation_id = excluded.last_payment_correlation_id,
      updated_at = excluded.updated_at`,
    args: [
      email,
      options.planCode,
      resolvedLimit,
      endsIso,
      options.correlationId,
      now,
    ],
  });

  bunnyLog("entitlement atualizado →", email, options.planCode);
  return { windowEndsAtMs: ends, linksLimit: resolvedLimit };
}

export type EntitlementState = {
  email: string;
  planCode: string;
  linksLimit: number;
  linksUsed: number;
  windowEndsAtMs: number;
};

export async function getEntitlementByEmail(
  email: string,
): Promise<EntitlementState | null> {
  const norm = email.toLowerCase().trim();
  if (!useSql()) return null;
  const db = await dbReady();
  const res = await db.execute({
    sql: `SELECT customer_email, plan_code, links_limit, links_used, window_ends_at
          FROM link_entitlements WHERE customer_email = ?`,
    args: [norm],
  });
  const r = res.rows[0];
  if (!r) return null;
  const ends = new Date(String(r.window_ends_at)).getTime();
  if (Number.isNaN(ends) || Date.now() > ends) return null;
  return {
    email: String(r.customer_email),
    planCode: String(r.plan_code),
    linksLimit: Number(r.links_limit),
    linksUsed: Number(r.links_used),
    windowEndsAtMs: ends,
  };
}

export async function issueSessionTokenForEmail(
  email: string,
): Promise<string | null> {
  const ent = await getEntitlementByEmail(email);
  if (!ent) return null;
  return signSessionToken(ent.email, ent.windowEndsAtMs);
}

/** 1 link grátis, 30 dias — sem Woovi; email sintético único. */
export async function grantFreeTestEntitlement(): Promise<{ token: string }> {
  const plan = getPlan("free");
  if (!plan) throw new Error("Plano free indisponível.");
  const id = crypto.randomUUID();
  const correlationId = `free-${id}`;
  const domain =
    process.env.GHOSTCHAT_PIX_EMAIL_DOMAIN?.trim() || "ghostchat.local";
  const email = `free-${id.replace(/-/g, "")}@${domain}`;

  await upsertEntitlementAfterPayment({
    customerEmail: email,
    planCode: "free",
    correlationId,
  });

  const token = await issueSessionTokenForEmail(email);
  if (!token) throw new Error("Falha ao emitir sessão.");
  bunnyLog("free test entitlement →", email);
  return { token };
}

/** Consome 1 link e cria sala (SQL). */
export async function consumeLinkAndCreateRoom(
  customerEmail: string,
): Promise<{ room: import("@/lib/room-service").RoomDTO }> {
  const norm = customerEmail.toLowerCase().trim();
  if (!useSql()) {
    throw new Error("Base de dados não configurada.");
  }
  const db = await dbReady();
  const now = new Date().toISOString();

  const upd = await db.execute({
    sql: `UPDATE link_entitlements SET
            links_used = links_used + 1,
            updated_at = ?
          WHERE customer_email = ?
            AND datetime(window_ends_at) > datetime('now')
            AND (
              links_limit = -1
              OR links_used < links_limit
            )`,
    args: [now, norm],
  });

  if ((upd.rowsAffected ?? 0) < 1) {
    throw new Error("Sem links disponíveis ou o pacote expirou. Compre um novo pacote.");
  }

  const room = await createRoom({ createdByEmail: norm });
  return { room };
}
