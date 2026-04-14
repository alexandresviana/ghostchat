import { NextResponse } from "next/server";
import {
  getPayChargeByCorrelation,
  updatePayChargeCompleted,
  updatePayChargeExpired,
  upsertEntitlementAfterPayment,
} from "@/lib/payment-service";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import type { PlanCode } from "@/lib/plans";

export const runtime = "nodejs";

type WooviWebhookPayload = {
  event?: string;
  charge?: {
    correlationID?: string;
    status?: string;
    paidAt?: string;
  };
};

export async function POST(request: Request) {
  if (!hasBunnySqlConfig()) {
    return NextResponse.json({ ok: true });
  }

  let body: WooviWebhookPayload;
  try {
    body = (await request.json()) as WooviWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (!body.event || !body.charge?.correlationID) {
    return NextResponse.json({ ok: true });
  }

  const event = body.event.toUpperCase();
  const correlationId = String(body.charge.correlationID).trim();

  const existing = await getPayChargeByCorrelation(correlationId);
  if (!existing) {
    return NextResponse.json({ ok: true });
  }

  if (event.includes("CHARGE_COMPLETED")) {
    const paidAt =
      body.charge.paidAt?.trim() || new Date().toISOString();
    const done = await updatePayChargeCompleted(correlationId, paidAt);
    if (done) {
      await upsertEntitlementAfterPayment({
        customerEmail: done.customerEmail,
        planCode: done.planCode as PlanCode,
        correlationId,
      });
    }
  } else if (event.includes("CHARGE_EXPIRED")) {
    await updatePayChargeExpired(correlationId);
  }

  return NextResponse.json({ ok: true });
}
