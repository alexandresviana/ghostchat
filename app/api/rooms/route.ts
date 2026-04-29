import { NextResponse } from "next/server";
import { isAdminSessionActive } from "@/lib/admin-request";
import { bypassPayment, getIosApiSecret } from "@/lib/env-payment";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { consumeLinkAndCreateRoom } from "@/lib/payment-service";
import { getSessionEmailFromRequest } from "@/lib/request-session";
import { createRoom } from "@/lib/room-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (bypassPayment()) {
      const room = await createRoom();
      return NextResponse.json({ room });
    }

    if (await isAdminSessionActive()) {
      const room = await createRoom();
      return NextResponse.json({ room });
    }

    const expectedSecret = getIosApiSecret();
    const headerSecret = request.headers.get("x-ghostchat-ios-secret")?.trim();
    if (expectedSecret && headerSecret === expectedSecret) {
      const room = await createRoom();
      return NextResponse.json({ room });
    }

    if (!hasBunnySqlConfig()) {
      return NextResponse.json(
        {
          error:
            "Servidor sem base de dados. Configure BUNNY_DATABASE_URL ou use GHOSTCHAT_BYPASS_PAYMENT=1 só em desenvolvimento.",
        },
        { status: 503 },
      );
    }

    const email = await getSessionEmailFromRequest(request);
    if (!email) {
      return NextResponse.json(
        {
          error:
            "É necessário um pacote pago ativo. Compre um plano no painel e pague via PIX.",
          code: "PAYMENT_REQUIRED",
        },
        { status: 402 },
      );
    }

    const { room } = await consumeLinkAndCreateRoom(email);
    return NextResponse.json({ room });
  } catch (e) {
    console.error(e);
    const msg =
      e instanceof Error ? e.message : "Não foi possível criar a sala.";
    const low = msg.toLowerCase();
    if (
      low.includes("sem links") ||
      low.includes("expirou") ||
      low.includes("pacote")
    ) {
      return NextResponse.json({ error: msg, code: "QUOTA_EXCEEDED" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Não foi possível criar a sala." },
      { status: 500 },
    );
  }
}
