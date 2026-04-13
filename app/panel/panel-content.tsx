"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GhostAvatar } from "@/components/GhostAvatar";

export function PanelContent() {
  const searchParams = useSearchParams();
  const ended = searchParams.get("ended") === "1";
  const [roomId, setRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  /** Evita `window` no render — mesmo HTML no servidor e no primeiro paint do cliente */
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fullUrl = useMemo(() => {
    if (!roomId || !origin) return "";
    return `${origin}/c/${encodeURIComponent(roomId)}`;
  }, [roomId, origin]);

  const createRoom = useCallback(async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error("HTTP");
      const data = (await res.json()) as { room: { id: string } };
      const id = data.room.id;
      setRoomId(id);
    } catch {
      setCreateError("Não foi possível criar o chat. Tente de novo.");
    } finally {
      setCreating(false);
    }
  }, []);

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
          className={
            creating
              ? "cursor-wait rounded-2xl bg-[#7ef0c8] py-4 text-lg font-semibold text-[#0d0d1a] opacity-65 pointer-events-none transition hover:opacity-90"
              : "cursor-pointer rounded-2xl bg-[#7ef0c8] py-4 text-lg font-semibold text-[#0d0d1a] opacity-100 transition hover:opacity-90"
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
            Nenhuma sala ainda — clique em &quot;Criar novo chat&quot; para gerar o link.
          </p>
        )}
      </div>

      <p className="text-center text-xs opacity-50">
        <Link href="/" className="underline">
          Início
        </Link>
      </p>
    </div>
  );
}
