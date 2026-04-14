import "server-only";
import { getWooviApiUrl, getWooviAuth } from "@/lib/env-payment";

export type WooviCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type CreateChargeResult = {
  correlationID: string;
  wooviIdentifier: string;
  wooviPaymentLinkID: string;
  qrCodeImage: string;
  brCode: string;
};

type WooviChargeResponse = {
  charge?: {
    identifier: string;
    paymentLinkID: string;
    qrCodeImage: string;
    brCode: string;
  };
};

export async function wooviCreateCharge(options: {
  correlationID: string;
  valueCents: number;
  customer: WooviCustomer;
}): Promise<CreateChargeResult> {
  const auth = getWooviAuth();
  if (!auth) {
    throw new Error("WOOVI_AUTH não configurado.");
  }
  const base = getWooviApiUrl();
  const url = `${base}/api/v1/charge?return_existing=true`;
  const body = JSON.stringify({
    correlationID: options.correlationID,
    value: options.valueCents,
    customer: {
      name: options.customer.name,
      email: options.customer.email,
      phone: options.customer.phone,
    },
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: auth,
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Woovi ${res.status}: ${text.slice(0, 500)}`,
    );
  }

  let data: WooviChargeResponse;
  try {
    data = JSON.parse(text) as WooviChargeResponse;
  } catch {
    throw new Error("Resposta Woovi inválida (JSON).");
  }

  const ch = data.charge;
  if (!ch?.qrCodeImage) {
    throw new Error("Woovi não retornou QR code.");
  }

  return {
    correlationID: options.correlationID,
    wooviIdentifier: ch.identifier,
    wooviPaymentLinkID: ch.paymentLinkID,
    qrCodeImage: ch.qrCodeImage,
    brCode: ch.brCode ?? "",
  };
}
