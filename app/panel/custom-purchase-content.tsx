"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GhostAvatar } from "@/components/GhostAvatar";
const LS_TOKEN = "ghostchat_session_token";

function qrImageSrc(raw: string): string {
  const s = raw.replace(/\s/g, "").trim();
  if (!s) return "";
  if (s.startsWith("data:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `data:image/png;base64,${s}`;
}

/** "29,90" / "29.9" → centavos */
function parseBrlToCents(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const x = Number(s);
  if (!Number.isFinite(x) || x <= 0) return null;
  return Math.round(x * 100);
}

export function CustomPurchaseContent({ pathToken }: { pathToken: string }) {
  const [linksInput, setLinksInput] = useState("10");
  const [valueBrl, setValueBrl] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [pixCorrelation, setPixCorrelation] = useState<string | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixBr, setPixBr] = useState<string | null>(null);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [paidToken, setPaidToken] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPixPolling = useCallback(
    (correlationId: string) => {
      stopPolling();
      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const res = await fetch(
              `/api/payment/status/${encodeURIComponent(correlationId)}`,
            );
            if (!res.ok) return;
            const j = (await res.json()) as {
              status?: string;
              token?: string;
            };
            const st = (j.status ?? "").toUpperCase();
            setPixStatus(st);
            if (st === "COMPLETED" && j.token) {
              stopPolling();
              window.localStorage.setItem(LS_TOKEN, j.token);
              setPaidToken(j.token);
              setPixCorrelation(null);
              setPixQr(null);
              setPixBr(null);
              setPayError(null);
            }
            if (st === "EXPIRED") {
              stopPolling();
              setPayError("PIX expirado. Gere um novo pagamento.");
            }
          } catch {
            /* ignore */
          }
        })();
      }, 3000);
    },
    [stopPolling],
  );

  const copyBrCode = useCallback(async () => {
    if (!pixBr) return;
    try {
      await navigator.clipboard.writeText(pixBr);
    } catch {
      /* ignore */
    }
  }, [pixBr]);

  const handleGeneratePix = useCallback(async () => {
    const links = Number.parseInt(linksInput.trim(), 10);
    const cents = parseBrlToCents(valueBrl);
    if (!Number.isFinite(links) || links < 1) {
      setPayError("Indique um número válido de links (≥ 1).");
      return;
    }
    if (cents == null) {
      setPayError("Indique o valor em reais (ex.: 29,90).");
      return;
    }

    setPayLoading(true);
    setPayError(null);
    setPixStatus(null);
    setPaidToken(null);
    try {
      const res = await fetch("/api/payment/create-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathToken,
          linksLimit: links,
          valueCents: cents,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        correlation_id?: string;
        qr_code_image?: string;
        br_code?: string;
      };
      if (!res.ok) {
        setPayError(j.error ?? "Não foi possível criar o PIX.");
        return;
      }
      setPixCorrelation(j.correlation_id ?? null);
      setPixQr(j.qr_code_image ?? null);
      setPixBr(j.br_code ?? null);
      setPixStatus("PENDING");
      if (j.correlation_id) startPixPolling(j.correlation_id);
    } catch {
      setPayError("Erro de rede ao criar cobrança.");
    } finally {
      setPayLoading(false);
    }
  }, [linksInput, valueBrl, pathToken, startPixPolling]);

  const pixQrResolved = pixQr ? qrImageSrc(pixQr) : "";

  if (paidToken) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center gap-8 px-4 py-12 text-center">
        <GhostAvatar size={88} />
        <div className="flex flex-col gap-2">
          <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-semibold text-[#f5f0ff]">
            Pagamento confirmado
          </h1>
          <p className="text-sm text-[#f5f0ff]/85">
            O teu pacote está ativo neste dispositivo. Gera links no painel.
          </p>
        </div>
        <Link
          href="/panel"
          className="rounded-xl bg-[#7ef0c8] px-8 py-3 text-sm font-semibold text-[#0d0d1a] transition hover:opacity-90"
        >
          Ir para o painel
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <GhostAvatar size={72} />
        <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-semibold text-[#f5f0ff]">
          Compra personalizada
        </h1>
        <p className="max-w-md text-sm text-[#f5f0ff]/80">
          Define quantos links precisas e o valor acordado. O pagamento é por PIX; após confirmar,
          tens 30 dias para usar os links neste aparelho.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#c4b0e8]/25 bg-[#1a1530]/40 p-4">
        <label className="flex flex-col gap-1 text-left text-xs text-[#c4b0e8]">
          Quantidade de links
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="rounded-lg border border-[#c4b0e8]/30 bg-[#0d0d1a] px-3 py-2 text-sm text-[#f5f0ff]"
            value={linksInput}
            onChange={(e) => setLinksInput(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-xs text-[#c4b0e8]">
          Valor (R$)
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex.: 29,90"
            className="rounded-lg border border-[#c4b0e8]/30 bg-[#0d0d1a] px-3 py-2 text-sm text-[#f5f0ff]"
            value={valueBrl}
            onChange={(e) => setValueBrl(e.target.value)}
          />
        </label>

        {payError ? (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{payError}</p>
        ) : null}

        <button
          type="button"
          disabled={payLoading || Boolean(pixCorrelation)}
          onClick={() => void handleGeneratePix()}
          className={
            payLoading || pixCorrelation
              ? "cursor-wait rounded-2xl bg-[#c4b0e8]/40 py-3 text-sm font-semibold text-[#0d0d1a]"
              : "cursor-pointer rounded-2xl bg-[#c4b0e8] py-3 text-sm font-semibold text-[#0d0d1a] transition hover:opacity-90"
          }
        >
          {payLoading ? "A gerar PIX…" : pixCorrelation ? "PIX gerado (abaixo)" : "Gerar PIX"}
        </button>
      </section>

      {pixQr && pixCorrelation ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[#c4b0e8]/20 p-4">
          <p className="text-center text-xs text-[#f5f0ff]/80">
            Escaneie o QR ou copie o código PIX. Aguardamos a confirmação…
          </p>
          {pixQrResolved ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={pixQrResolved}
              alt="QR Code PIX"
              className="max-h-56 w-auto rounded-lg bg-white p-2"
            />
          ) : (
            <p className="text-center text-xs text-amber-200/90">
              QR indisponível — use o código copia e cola.
            </p>
          )}
          {pixBr ? (
            <button
              type="button"
              onClick={() => void copyBrCode()}
              className="rounded-xl bg-[#7b5ea7] px-4 py-2 text-xs font-semibold text-[#f5f0ff]"
            >
              Copiar código PIX
            </button>
          ) : null}
          {pixStatus ? (
            <p className="text-center text-xs opacity-60">Estado: {pixStatus}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-center text-xs text-[#f5f0ff]/50">
        <Link href="/" className="underline">
          Início
        </Link>
      </p>
    </div>
  );
}
