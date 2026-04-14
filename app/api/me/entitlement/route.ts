import { NextResponse } from "next/server";
import { bypassPayment } from "@/lib/env-payment";
import { verifySessionToken } from "@/lib/entitlement-jwt";
import { getEntitlementByEmail } from "@/lib/payment-service";
import { getBearerToken } from "@/lib/request-session";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { getPlan } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (bypassPayment()) {
    return NextResponse.json({
      bypass: true,
      linksRemaining: null,
      linksLimit: null,
      windowEndsAt: null,
      planLabel: "dev (bypass)",
    });
  }

  if (!hasBunnySqlConfig()) {
    return NextResponse.json(
      { error: "Base de dados não configurada." },
      { status: 503 },
    );
  }

  const bearer = getBearerToken(request);
  if (!bearer) {
    return NextResponse.json({
      authenticated: false,
      active: false,
    });
  }

  const claims = await verifySessionToken(bearer);
  if (!claims?.email) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }

  const email = claims.email.toLowerCase().trim();

  const ent = await getEntitlementByEmail(email);
  if (!ent) {
    return NextResponse.json({
      authenticated: true,
      active: false,
      email,
      message: "Sem pacote ativo ou janela de 30 dias expirada.",
    });
  }

  const plan = getPlan(ent.planCode as "p10" | "p50" | "unl");
  const unlimited = ent.linksLimit === -1;
  const remaining = unlimited
    ? null
    : Math.max(0, ent.linksLimit - ent.linksUsed);

  return NextResponse.json({
    authenticated: true,
    active: true,
    email: ent.email,
    planCode: ent.planCode,
    planLabel: plan?.label ?? ent.planCode,
    linksUsed: ent.linksUsed,
    linksLimit: unlimited ? null : ent.linksLimit,
    linksRemaining: remaining,
    unlimited,
    windowEndsAt: new Date(ent.windowEndsAtMs).toISOString(),
  });
}
