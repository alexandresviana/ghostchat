import { NextResponse } from "next/server";
import { getPlan } from "@/lib/plans";
import { getWooviAuth } from "@/lib/env-payment";
import { insertPayCharge } from "@/lib/payment-service";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { wooviCreateCharge } from "@/lib/woovi-charge";
import { buildSyntheticPixCustomer } from "@/lib/pix-synthetic-customer";

export const runtime = "nodejs";

type Body = {
  planCode?: string;
};

export async function POST(request: Request) {
  if (!hasBunnySqlConfig()) {
    return NextResponse.json(
      { error: "Base de dados não configurada." },
      { status: 503 },
    );
  }
  if (!getWooviAuth()) {
    return NextResponse.json(
      { error: "Pagamento não configurado (WOOVI_AUTH)." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const planCode = typeof body.planCode === "string" ? body.planCode.trim() : "";
  const plan = getPlan(planCode);
  if (!plan) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }
  if (plan.code === "free" || plan.priceCents < 1) {
    return NextResponse.json(
      {
        error:
          "Plano grátis não é pago via PIX. Use a opção «1 link grátis» no painel, se estiver ativa.",
      },
      { status: 400 },
    );
  }

  const correlationID = crypto.randomUUID();
  const chargeId = crypto.randomUUID();
  const { name, email, phone } = buildSyntheticPixCustomer(correlationID);

  try {
    const woovi = await wooviCreateCharge({
      correlationID,
      valueCents: plan.priceCents,
      customer: { name, email, phone },
    });

    await insertPayCharge({
      id: chargeId,
      correlationId: woovi.correlationID,
      planCode: plan.code,
      valueCents: plan.priceCents,
      wooviIdentifier: woovi.wooviIdentifier,
      wooviPaymentLinkId: woovi.wooviPaymentLinkID,
      brCode: woovi.brCode,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
    });

    return NextResponse.json({
      correlation_id: woovi.correlationID,
      qr_code_image: woovi.qrCodeImage,
      br_code: woovi.brCode,
      value_cents: plan.priceCents,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Erro ao criar cobrança.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
