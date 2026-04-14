import "server-only";

/**
 * Dados enviados à Woovi na cobrança. O utilizador não preenche nada: geramos no
 * servidor nome/telefone padrão e um email único por cobrança (quota na BD é
 * por `customer_email`).
 */
export function buildSyntheticPixCustomer(correlationId: string): {
  name: string;
  email: string;
  phone: string;
} {
  const domain =
    process.env.GHOSTCHAT_PIX_EMAIL_DOMAIN?.trim() || "ghostchat.local";
  const slug = correlationId.replace(/-/g, "");
  const email = `pix-${slug}@${domain}`;
  const name =
    process.env.GHOSTCHAT_PIX_CUSTOMER_NAME?.trim() || "Cliente Ghost Chat";
  const phone =
    process.env.GHOSTCHAT_PIX_CUSTOMER_PHONE?.trim() || "5511999999999";

  return { name, email, phone };
}
