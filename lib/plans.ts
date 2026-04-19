/** Pacotes de links (30 dias após pagamento ou ativação). Valores em centavos (BRL). */

export type PlanCode = "free" | "p5" | "p10" | "p50" | "unl" | "custom";

export type PlanDefinition = {
  code: PlanCode;
  label: string;
  linksLimit: number; // -1 = ilimitado
  priceCents: number;
};

/** Plano interno — 1 link sem custo; só via POST /api/entitlement/free-test (env). */
export const FREE_TEST_PLAN: PlanDefinition = {
  code: "free",
  label: "1 link (teste grátis)",
  linksLimit: 1,
  priceCents: 0,
};

/** Cobrança PIX com quantidade/valor definidos pelo cliente (URL reservada). O limite de links vem da BD. */
export const CUSTOM_PLAN: PlanDefinition = {
  code: "custom",
  label: "Pacote personalizado",
  linksLimit: 0,
  priceCents: 0,
};

/** Planos pagos (PIX) — mostrados no painel. */
export const PLANS: PlanDefinition[] = [
  {
    code: "p5",
    label: "5 links",
    linksLimit: 5,
    priceCents: 990,
  },
  {
    code: "p10",
    label: "10 links",
    linksLimit: 10,
    priceCents: 2990,
  },
  {
    code: "p50",
    label: "50 links",
    linksLimit: 50,
    priceCents: 6990,
  },
  {
    code: "unl",
    label: "Links ilimitados",
    linksLimit: -1,
    priceCents: 14990,
  },
];

export function getPlan(code: string): PlanDefinition | undefined {
  if (code === FREE_TEST_PLAN.code) return FREE_TEST_PLAN;
  if (code === CUSTOM_PLAN.code) return CUSTOM_PLAN;
  return PLANS.find((p) => p.code === code);
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
