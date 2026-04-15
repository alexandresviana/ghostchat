"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GhostAvatar } from "@/components/GhostAvatar";
import {
  PLANS,
  formatBRL,
  type PlanCode,
} from "@/lib/plans";
import { formatDateTimePtBr } from "@/lib/time-brasil";

const LS_TOKEN = "ghostchat_session_token";

type MeEntitlementResponse = {
  bypass?: boolean;
  authenticated?: boolean;
  active?: boolean;
  freeTestLinkEnabled?: boolean;
  planLabel?: string;
  linksRemaining?: number | null;
  linksLimit?: number | null;
  unlimited?: boolean;
  linksUsed?: number;
  windowEndsAt?: string | null;
  message?: string;
  email?: string;
};

/** Woovi pode devolver data URI, URL https ou só base64 cru. */
function qrImageSrc(raw: string): string {
  const s = raw.replace(/\s/g, "").trim();
  if (!s) return "";
  if (s.startsWith("data:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `data:image/png;base64,${s}`;
}

export function PanelContent({
  serverAdminUnlockOk,
}: {
  /** Definido no servidor para `/panel/i/[token]` (env lido em runtime). */
  serverAdminUnlockOk?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const ended = searchParams.get("ended") === "1";
  const queryAdminToken = searchParams.get("ghostchat_admin");
  const [queryUnlockOk, setQueryUnlockOk] = useState(false);

  useEffect(() => {
    if (!queryAdminToken?.trim()) {
      setQueryUnlockOk(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/verify-panel-unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: queryAdminToken }),
        });
        if (cancelled || !res.ok) {
          if (!cancelled) setQueryUnlockOk(false);
          return;
        }
        const j = (await res.json()) as { ok?: boolean };
        if (!cancelled) setQueryUnlockOk(j.ok === true);
      } catch {
        if (!cancelled) setQueryUnlockOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryAdminToken]);

  const adminPanelUnlocked = serverAdminUnlockOk === true || queryUnlockOk;
  const [roomId, setRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<MeEntitlementResponse | null>(null);
  const [bypassMode, setBypassMode] = useState(false);
  const [entLoading, setEntLoading] = useState(true);

  const [planCode, setPlanCode] = useState<PlanCode>("p10");
  const [payLoading, setPayLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [freeTestOffer, setFreeTestOffer] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [pixCorrelation, setPixCorrelation] = useState<string | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixBr, setPixBr] = useState<string | null>(null);
  const [pixStatus, setPixStatus] = useState<string | null>(null);

  const [adminActive, setAdminActive] = useState(false);
  const [adminLoginAvailable, setAdminLoginAvailable] = useState(false);
  const [adminSecretInput, setAdminSecretInput] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminNotice, setAdminNotice] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const t = window.localStorage.getItem(LS_TOKEN);
    setSessionToken(t);

    void (async () => {
      const [probeRes, adminRes] = await Promise.all([
        fetch("/api/me/entitlement"),
        fetch("/api/admin/status", { credentials: "include" }),
      ]);

      if (adminRes.ok) {
        const a = (await adminRes.json()) as {
          admin?: boolean;
          adminLoginAvailable?: boolean;
        };
        setAdminLoginAvailable(a.adminLoginAvailable === true);
        setAdminActive(a.admin === true);
        if (a.admin === true) setEntLoading(false);
      }

      try {
        if (!probeRes.ok) {
          setBypassMode(false);
          return;
        }
        const d = (await probeRes.json()) as MeEntitlementResponse;
        if (d.bypass === true) {
          setBypassMode(true);
          setEntLoading(false);
          return;
        }
        setBypassMode(false);
        if (d.authenticated === false) {
          setEntitlement(null);
        }
        if (typeof d.freeTestLinkEnabled === "boolean") {
          setFreeTestOffer(d.freeTestLinkEnabled);
        }
      } catch {
        setBypassMode(false);
      }
    })();
  }, []);

  const refreshEntitlement = useCallback(async (token: string | null) => {
    if (!token) {
      setEntitlement(null);
      setBypassMode(false);
      setEntLoading(false);
      return;
    }
    setEntLoading(true);
    try {
      const res = await fetch("/api/me/entitlement", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        window.localStorage.removeItem(LS_TOKEN);
        setSessionToken(null);
        setEntitlement(null);
        setBypassMode(false);
        return;
      }
      if (!res.ok) {
        setEntitlement(null);
        setBypassMode(false);
        return;
      }
      const data = (await res.json()) as MeEntitlementResponse;
      if (typeof data.freeTestLinkEnabled === "boolean") {
        setFreeTestOffer(data.freeTestLinkEnabled);
      }
      if (data.bypass === true) {
        setBypassMode(true);
        setEntitlement(null);
      } else {
        setBypassMode(false);
        setEntitlement(data);
      }
    } finally {
      setEntLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bypassMode || adminActive) {
      setEntLoading(false);
      return;
    }
    void refreshEntitlement(sessionToken);
  }, [sessionToken, refreshEntitlement, bypassMode, adminActive]);

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
              message?: string;
            };
            const st = (j.status ?? "").toUpperCase();
            setPixStatus(st);
            if (st === "COMPLETED" && j.token) {
              stopPolling();
              window.localStorage.setItem(LS_TOKEN, j.token);
              setSessionToken(j.token);
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

  const fullUrl = useMemo(() => {
    if (!roomId || !origin) return "";
    return `${origin}/c/${encodeURIComponent(roomId)}`;
  }, [roomId, origin]);

  const canCreateLink =
    bypassMode ||
    adminActive ||
    (entitlement &&
      typeof entitlement === "object" &&
      entitlement.active === true);

  const createRoom = useCallback(async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const headers: Record<string, string> = {};
      const t =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LS_TOKEN)
          : null;
      if (t) headers.Authorization = `Bearer ${t}`;
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers,
        credentials: "include",
      });
      if (res.status === 402) {
        setCreateError(
          "É necessário um pacote ativo. Escolha um plano e pague via PIX abaixo.",
        );
        return;
      }
      if (res.status === 403) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setCreateError(j.error ?? "Sem links disponíveis ou pacote expirado.");
        void refreshEntitlement(
          typeof window !== "undefined"
            ? window.localStorage.getItem(LS_TOKEN)
            : null,
        );
        return;
      }
      if (!res.ok) throw new Error("HTTP");
      const data = (await res.json()) as { room: { id: string } };
      setRoomId(data.room.id);
      void refreshEntitlement(
        typeof window !== "undefined"
          ? window.localStorage.getItem(LS_TOKEN)
          : null,
      );
    } catch {
      setCreateError("Não foi possível criar o chat. Tente de novo.");
    } finally {
      setCreating(false);
    }
  }, [refreshEntitlement]);

  const copyLink = useCallback(async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      /* ignore */
    }
  }, [fullUrl]);

  const openWhatsApp = useCallback(() => {
    if (!fullUrl) return;
    const text = encodeURIComponent(
      `Ghost Chat — conversa privada e confidencial; só quem tem este link acede. Vamos aqui: ${fullUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }, [fullUrl]);

  const copyBrCode = useCallback(async () => {
    if (!pixBr) return;
    try {
      await navigator.clipboard.writeText(pixBr);
    } catch {
      /* ignore */
    }
  }, [pixBr]);

  const handleStartPayment = useCallback(async () => {
    setPayLoading(true);
    setPayError(null);
    setPixStatus(null);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
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
  }, [planCode, startPixPolling]);

  const handleFreeTest = useCallback(async () => {
    setFreeLoading(true);
    setPayError(null);
    try {
      const res = await fetch("/api/entitlement/free-test", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string; token?: string };
      if (!res.ok) {
        setPayError(j.error ?? "Teste grátis indisponível.");
        return;
      }
      if (j.token) {
        window.localStorage.setItem(LS_TOKEN, j.token);
        setSessionToken(j.token);
        setFreeTestOffer(false);
      }
    } catch {
      setPayError("Erro de rede ao ativar teste grátis.");
    } finally {
      setFreeLoading(false);
    }
  }, []);

  const logoutSession = useCallback(() => {
    stopPolling();
    window.localStorage.removeItem(LS_TOKEN);
    setSessionToken(null);
    setEntitlement(null);
    setPixCorrelation(null);
    setPixQr(null);
    setPixBr(null);
    setPixStatus(null);
  }, [stopPolling]);

  const handleAdminActivate = useCallback(async () => {
    setAdminBusy(true);
    setAdminNotice(null);
    try {
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: adminSecretInput }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setAdminNotice({
          kind: "err",
          text: j.error ?? "Não foi possível ativar.",
        });
        return;
      }
      setAdminSecretInput("");
      setAdminActive(true);
      setEntLoading(false);
      setAdminNotice(null);
    } catch {
      setAdminNotice({ kind: "err", text: "Erro de rede." });
    } finally {
      setAdminBusy(false);
    }
  }, [adminSecretInput]);

  const handleAdminDeactivate = useCallback(async () => {
    setAdminBusy(true);
    setAdminNotice(null);
    try {
      await fetch("/api/admin/deactivate", { method: "POST", credentials: "include" });
      setAdminActive(false);
      void refreshEntitlement(
        typeof window !== "undefined" ? window.localStorage.getItem(LS_TOKEN) : null,
      );
    } catch {
      setAdminNotice({ kind: "err", text: "Erro de rede ao sair." });
    } finally {
      setAdminBusy(false);
    }
  }, [refreshEntitlement]);

  const selectedPlan = PLANS.find((p) => p.code === planCode);
  const pixQrResolved = pixQr ? qrImageSrc(pixQr) : "";

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-lg flex-col gap-8 overflow-x-hidden px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <GhostAvatar size={88} />
        <h1 className="font-[family-name:var(--font-fredoka)] text-3xl font-semibold">
          Painel
        </h1>
        <p className="max-w-md text-sm opacity-80">
          Cada sala tem um <strong>link único e confidencial</strong>: só quem o recebe entra na conversa.
          Podes enviar por <strong>WhatsApp</strong> — texto, emojis e fotos. Em <strong>24 horas</strong> o
          acesso expira e os dados são apagados, ou encerra antes com <strong>Encerrar</strong> no chat.
        </p>
      </div>

      {ended ? (
        <p className="rounded-xl bg-[#7b5ea7]/20 px-4 py-3 text-center text-sm text-[#f5f0ff]">
          Conversa encerrada. Pode criar um novo chat abaixo.
        </p>
      ) : null}

      {!bypassMode && !adminActive && !entLoading ? (
        <section
          id="pacote"
          className="flex flex-col gap-4 rounded-2xl border border-[#c4b0e8]/25 bg-[#1a1530]/40 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#f5f0ff]">Pacote (30 dias)</p>
            {sessionToken ? (
              <button
                type="button"
                onClick={logoutSession}
                className="text-xs font-medium text-[#c4b0e8] underline"
              >
                Sair
              </button>
            ) : null}
          </div>

          {entitlement && entitlement.active === true ? (
            <div className="rounded-xl bg-[#7b5ea7]/15 px-3 py-2 text-sm text-[#f5f0ff]">
              <p className="font-medium">{String(entitlement.planLabel ?? "")}</p>
              {entitlement.unlimited ? (
                <p className="opacity-90">Links ilimitados neste período.</p>
              ) : (
                <p className="opacity-90">
                  Links restantes:{" "}
                  <strong>{entitlement.linksRemaining ?? 0}</strong>
                  {typeof entitlement.linksUsed === "number" &&
                  typeof entitlement.linksLimit === "number" ? (
                    <span className="opacity-75">
                      {" "}
                      (usados {entitlement.linksUsed} de {entitlement.linksLimit})
                    </span>
                  ) : null}
                </p>
              )}
              {entitlement.windowEndsAt ? (
                <p className="mt-1 text-xs opacity-70">
                  Válido até{" "}
                  {formatDateTimePtBr(String(entitlement.windowEndsAt))}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-xs opacity-70">
                Escolha quantos links precisa nos próximos 30 dias após o PIX. Não é preciso criar
                conta nem preencher formulário — o acesso fica neste aparelho após o pagamento.
              </p>

              {freeTestOffer ? (
                <div className="rounded-xl border border-dashed border-[#7ef0c8]/50 bg-[#7ef0c8]/5 p-3">
                  <p className="mb-2 text-xs text-[#c8ffe8]">
                    Teste sem custo: um link para validar o fluxo (mesma janela de 30 dias que os
                    planos pagos).
                  </p>
                  <button
                    type="button"
                    disabled={freeLoading || payLoading}
                    onClick={() => void handleFreeTest()}
                    className="w-full rounded-xl border border-[#7ef0c8]/60 bg-transparent py-2.5 text-sm font-semibold text-[#7ef0c8] transition hover:bg-[#7ef0c8]/10 disabled:opacity-50"
                  >
                    {freeLoading ? "A ativar…" : "Ativar 1 link grátis (teste)"}
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PLANS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setPlanCode(p.code)}
                    className={
                      planCode === p.code
                        ? "rounded-xl border-2 border-[#7ef0c8] bg-[#7ef0c8]/10 px-3 py-2 text-left text-sm"
                        : "rounded-xl border border-[#c4b0e8]/30 px-3 py-2 text-left text-sm opacity-90 transition hover:bg-white/5"
                    }
                  >
                    <span className="block font-semibold text-[#f5f0ff]">{p.label}</span>
                    <span className="text-[#7ef0c8]">{formatBRL(p.priceCents)}</span>
                  </button>
                ))}
              </div>

              {payError ? (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">
                  {payError}
                </p>
              ) : null}

              <button
                type="button"
                disabled={payLoading || freeLoading}
                onClick={() => void handleStartPayment()}
                className={
                  payLoading || freeLoading
                    ? "cursor-wait rounded-2xl bg-[#c4b0e8]/40 py-3 text-sm font-semibold text-[#0d0d1a]"
                    : "cursor-pointer rounded-2xl bg-[#c4b0e8] py-3 text-sm font-semibold text-[#0d0d1a] transition hover:opacity-90"
                }
              >
                {payLoading
                  ? "Gerando PIX…"
                  : `Pagar ${selectedPlan ? formatBRL(selectedPlan.priceCents) : ""} com PIX`}
              </button>

              {pixQr && pixCorrelation ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-[#c4b0e8]/20 p-3">
                  <p className="text-center text-xs opacity-80">
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
                      QR indisponível — use o código copia e cola abaixo.
                    </p>
                  )}
                  {pixBr ? (
                    <button
                      type="button"
                      onClick={() => void copyBrCode()}
                      className="rounded-xl bg-[#7b5ea7] px-4 py-2 text-xs font-semibold text-[#f5f0ff]"
                    >
                      Copiar código PIX (copia e cola)
                    </button>
                  ) : null}
                  {pixStatus ? (
                    <p className="text-center text-xs opacity-60">Estado: {pixStatus}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {bypassMode ? (
        <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-center text-xs text-amber-100">
          Modo desenvolvimento: pagamento ignorado (GHOSTCHAT_BYPASS_PAYMENT).
        </p>
      ) : null}

      {adminActive && !bypassMode ? (
        <div className="flex flex-col gap-2 rounded-xl bg-[#4a3f7a]/40 px-3 py-2 text-center text-xs text-[#e8e0ff]">
          <p>
            <strong>Modo interno</strong> — criar chats não consome pacote nem PIX (sessão neste
            aparelho, até 7 dias).
          </p>
          <button
            type="button"
            disabled={adminBusy}
            onClick={() => void handleAdminDeactivate()}
            className="mx-auto rounded-lg border border-[#c4b0e8]/40 px-3 py-1.5 font-semibold text-[#f5f0ff] hover:bg-white/5 disabled:opacity-50"
          >
            {adminBusy ? "A sair…" : "Terminar sessão interna"}
          </button>
          {adminNotice?.kind === "err" ? (
            <p className="text-[11px] text-red-300">{adminNotice.text}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {createError ? (
          <p className="rounded-xl px-3 py-2 text-center text-sm text-red-300">{createError}</p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (creating) return;
            void createRoom();
          }}
          disabled={!bypassMode && !canCreateLink}
          className={
            creating || (!bypassMode && !canCreateLink)
              ? "cursor-not-allowed rounded-2xl bg-[#7ef0c8] py-4 text-lg font-semibold text-[#0d0d1a] opacity-50"
              : "cursor-pointer rounded-2xl bg-[#7ef0c8] py-4 text-lg font-semibold text-[#0d0d1a] opacity-100 transition hover:opacity-90"
          }
          title={
            !bypassMode && !canCreateLink
              ? "Compre um pacote e conclua o PIX, ou use o acesso interno (URL reservada)."
              : undefined
          }
        >
          {creating ? "Criando…" : "Criar novo chat"}
        </button>

        {roomId && fullUrl ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-[#c4b0e8]/25 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Seu link</p>
            <p className="break-all text-sm text-[#f5f0ff] opacity-90">{fullUrl}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="rounded-xl bg-[#7b5ea7] px-4 py-2 text-sm font-semibold text-[#f5f0ff]"
              >
                Copiar link
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                className="rounded-xl border border-[#c4b0e8]/40 px-4 py-2 text-sm font-semibold text-[#f5f0ff] transition hover:bg-white/5"
              >
                Enviar no WhatsApp
              </button>
              <Link
                href={`/c/${encodeURIComponent(roomId)}`}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#7ef0c8] underline"
              >
                Abrir sala
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm opacity-55">
            {canCreateLink || bypassMode || adminActive
              ? "Nenhuma sala ainda — clique em \"Criar novo chat\" para gerar o link."
              : "Após o PIX confirmado, o botão acima fica ativo para gerar links."}
          </p>
        )}
      </div>

      {adminLoginAvailable && adminPanelUnlocked && !adminActive ? (
        <details className="rounded-xl border border-[#c4b0e8]/20 bg-[#0d0d1a]/50 px-3 py-2 text-left">
          <summary className="cursor-pointer text-xs font-medium text-[#c4b0e8]">
            Acesso interno
          </summary>
          <div className="mt-3 flex flex-col gap-2 text-xs text-[#f5f0ff]/85">
            <p className="opacity-80">Digite a senha</p>
            <input
              type="password"
              autoComplete="current-password"
              className="rounded-lg border border-[#c4b0e8]/30 bg-[#0d0d1a] px-2 py-2 text-sm text-[#f5f0ff]"
              placeholder="Segredo"
              value={adminSecretInput}
              onChange={(e) => setAdminSecretInput(e.target.value)}
            />
            <button
              type="button"
              disabled={adminBusy || !adminSecretInput.trim()}
              onClick={() => void handleAdminActivate()}
              className="rounded-lg bg-[#5c4a8a] py-2 font-semibold text-[#f5f0ff] disabled:opacity-50"
            >
              {adminBusy ? "A validar…" : "Iniciar sessão"}
            </button>
            {adminNotice ? (
              <p
                className={
                  adminNotice.kind === "err"
                    ? "text-center text-[11px] text-red-300"
                    : "text-center text-[11px] text-[#7ef0c8]/90"
                }
              >
                {adminNotice.text}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}

      <p className="text-center text-xs opacity-50">
        <Link href="/" className="underline">
          Início
        </Link>
      </p>
    </div>
  );
}
