/** Pacotes de links (30 dias após pagamento confirmado). Valores em centavos (BRL). */

export type PlanCode = "p1" | "p10" | "p50" | "unl";

export type PlanDefinition = {
  code: PlanCode;
  label: string;
  linksLimit: number; // -1 = ilimitado
  priceCents: number;
};

export const PLANS: PlanDefinition[] = [
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
  {
    code: "p1",
    label: "1 link (teste)",
    linksLimit: 1,
    priceCents: 100,
  },
];

export function getPlan(code: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.code === code);
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
