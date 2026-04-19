import { NextResponse } from "next/server";
import { tokenMatchesCustomPurchasePath } from "@/lib/custom-purchase-unlock";
import { insertPayCharge } from "@/lib/payment-service";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { getWooviAuth } from "@/lib/env-payment";
import { wooviCreateCharge } from "@/lib/woovi-charge";
import { buildSyntheticPixCustomer } from "@/lib/pix-synthetic-customer";

export const runtime = "nodejs";

const MIN_CENTS = 100; // R$ 1,00
const MAX_CENTS = 50_000_000; // R$ 500.000,00
const MIN_LINKS = 1;
const MAX_LINKS = 100_000;

type Body = {
  pathToken?: string;
  linksLimit?: unknown;
  valueCents?: unknown;
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

  const pathToken =
    typeof body.pathToken === "string" ? body.pathToken.trim() : "";
  if (!pathToken || !tokenMatchesCustomPurchasePath(pathToken)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const linksRaw = body.linksLimit;
  const valueRaw = body.valueCents;
  const linksLimit =
    typeof linksRaw === "number"
      ? linksRaw
      : typeof linksRaw === "string"
        ? Number(linksRaw.trim())
        : NaN;
  const valueCents =
    typeof valueRaw === "number"
      ? valueRaw
      : typeof valueRaw === "string"
        ? Number(valueRaw.trim())
        : NaN;

  if (
    !Number.isFinite(linksLimit) ||
    linksLimit < MIN_LINKS ||
    linksLimit > MAX_LINKS ||
    !Number.isInteger(linksLimit)
  ) {
    return NextResponse.json(
      {
        error: `Quantidade de links inválida (use ${MIN_LINKS} a ${MAX_LINKS}).`,
      },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(valueCents) ||
    !Number.isInteger(valueCents) ||
    valueCents < MIN_CENTS ||
    valueCents > MAX_CENTS
  ) {
    return NextResponse.json(
      {
        error: `Valor inválido (mínimo R$ ${(MIN_CENTS / 100).toFixed(2)}).`,
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
      valueCents,
      customer: { name, email, phone },
    });

    await insertPayCharge({
      id: chargeId,
      correlationId: woovi.correlationID,
      planCode: "custom",
      valueCents,
      wooviIdentifier: woovi.wooviIdentifier,
      wooviPaymentLinkId: woovi.wooviPaymentLinkID,
      brCode: woovi.brCode,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customLinksLimit: linksLimit,
    });

    return NextResponse.json({
      correlation_id: woovi.correlationID,
      qr_code_image: woovi.qrCodeImage,
      br_code: woovi.brCode,
      value_cents: valueCents,
      links_limit: linksLimit,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Erro ao criar cobrança.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
