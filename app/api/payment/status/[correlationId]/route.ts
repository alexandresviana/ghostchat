import { NextResponse } from "next/server";
import {
  getPayChargeByCorrelation,
  issueSessionTokenForEmail,
} from "@/lib/payment-service";
import { hasBunnySqlConfig } from "@/lib/env-bunny";

export const runtime = "nodejs";

type Params = { params: Promise<{ correlationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!hasBunnySqlConfig()) {
    return NextResponse.json(
      { error: "Base de dados não configurada." },
      { status: 503 },
    );
  }

  const { correlationId } = await params;
  const id = decodeURIComponent(correlationId).trim();
  if (!id) {
    return NextResponse.json({ error: "correlation_id inválido." }, { status: 400 });
  }

  const row = await getPayChargeByCorrelation(id);
  if (!row) {
    return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });
  }

  const status = row.status.toUpperCase();
  let token: string | undefined;
  if (status === "COMPLETED") {
    const t = await issueSessionTokenForEmail(row.customerEmail);
    if (t) token = t;
  }

  return NextResponse.json({
    status,
    correlation_id: row.correlationId,
    token,
    message:
      status === "COMPLETED"
        ? "Pagamento confirmado. Já pode gerar links."
        : status === "EXPIRED"
          ? "Cobrança expirada. Gere um novo PIX."
          : "Aguardando pagamento…",
  });
}
