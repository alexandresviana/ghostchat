import { NextResponse } from "next/server";
import {
  freeTestLinkEnabled,
  getSessionJwtSecret,
} from "@/lib/env-payment";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import { grantFreeTestEntitlement } from "@/lib/payment-service";

export const runtime = "nodejs";

export async function POST() {
  if (!freeTestLinkEnabled()) {
    return NextResponse.json({ error: "Indisponível." }, { status: 403 });
  }
  if (!hasBunnySqlConfig()) {
    return NextResponse.json(
      { error: "Base de dados não configurada." },
      { status: 503 },
    );
  }
  if (!getSessionJwtSecret()) {
    return NextResponse.json(
      { error: "GHOSTCHAT_SESSION_SECRET não configurado." },
      { status: 503 },
    );
  }

  try {
    const { token } = await grantFreeTestEntitlement();
    return NextResponse.json({ token });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível ativar o teste grátis." },
      { status: 500 },
    );
  }
}
