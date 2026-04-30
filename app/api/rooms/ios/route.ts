import { NextResponse } from "next/server";
import { getIosApiSecret } from "@/lib/env-payment";
import { hasBunnySqlConfig } from "@/lib/env-bunny";
import {
  getIosCredentialFromRequest,
  logIosNativeRoomAuthDebug,
} from "@/lib/ios-request-secret";
import { createRoom } from "@/lib/room-service";

export const runtime = "nodejs";

/**
 * Criação de sala só para o app iOS nativo (segredo em header).
 * Separado de `POST /api/rooms` (web/painel + pagamento) para evitar confusão e 402 indevidos.
 */
export async function POST(request: Request) {
  logIosNativeRoomAuthDebug(request, "POST /api/rooms/ios");

  const expectedSecret = getIosApiSecret();
  const sentCredential = getIosCredentialFromRequest(request);

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error:
          "Servidor sem GHOSTCHAT_IOS_API_SECRET (ou alias). Configure no painel e faça redeploy.",
        code: "IOS_SECRET_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  if (!sentCredential) {
    return NextResponse.json(
      {
        error:
          "O app não enviou credencial (header em falta). Configure o segredo na build iOS (Info.plist via Secrets.xcconfig) igual a GHOSTCHAT_IOS_API_SECRET na Vercel.",
        code: "IOS_CREDENTIAL_MISSING",
      },
      { status: 401 },
    );
  }

  if (sentCredential !== expectedSecret) {
    return NextResponse.json(
      {
        error:
          "Credencial não coincide com o servidor. Confirme o mesmo valor em GHOSTCHAT_IOS_API_SECRET (Vercel) e na build iOS (Secrets.local.xcconfig), sem aspas nem espaços a mais.",
        code: "IOS_CREDENTIAL_MISMATCH",
      },
      { status: 401 },
    );
  }

  if (!hasBunnySqlConfig()) {
    return NextResponse.json(
      {
        error:
          "Servidor sem base de dados. Configure BUNNY_DATABASE_URL ou use GHOSTCHAT_BYPASS_PAYMENT=1 só em desenvolvimento.",
        code: "NO_DATABASE",
      },
      { status: 503 },
    );
  }

  try {
    const room = await createRoom();
    return NextResponse.json({ room });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível criar a sala." },
      { status: 500 },
    );
  }
}
