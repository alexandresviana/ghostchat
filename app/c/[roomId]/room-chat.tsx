"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChatComposer } from "@/components/ChatComposer";
import { GhostAvatar } from "@/components/GhostAvatar";
import { GhostWipeOverlay } from "@/components/GhostWipeOverlay";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { formatMessageTime } from "@/lib/format-message-time";
import { formatRemaining } from "@/lib/room-expiry";

type ApiMessage = {
  id: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
  /** Hora já formatada no servidor (HH:MM) — útil se o JS do cliente estiver em cache antigo */
  displayTime?: string;
  /** Alguns proxies serializam em snake_case */
  created_at?: string;
};

function getMessageCreatedAt(m: ApiMessage): string {
  return m.createdAt ?? m.created_at ?? "";
}

/** Um 404 logo ao abrir pode ser corrida (DB/CDN); repete uma vez antes de desistir. */
async function fetchRoomJson<T>(
  url: string,
): Promise<
  { ok: true; data: T } | { ok: false; status: number; networkError?: boolean }
> {
  const tryOnce = () => fetch(url, { cache: "no-store" });
  try {
    let res = await tryOnce();
    if (res.status === 404) {
      await new Promise((r) => setTimeout(r, 400));
      res = await tryOnce();
    }
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, networkError: true };
  }
}

export function RoomChat({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [invalidRoom, setInvalidRoom] = useState(false);
  const [myMessageIds, setMyMessageIds] = useState<Set<string>>(() => new Set());
  const [wiping, setWiping] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [othersTyping, setOthersTyping] = useState(false);
  /** null = ainda não carregou da API; false = Bunny Storage não configurado no servidor */
  const [mediaUploadReady, setMediaUploadReady] = useState<boolean | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [roomSyncError, setRoomSyncError] = useState<string | null>(null);
  const wipeReasonRef = useRef<"manual" | "expire" | null>(null);
  const pollRef = useRef<number | null>(null);
  const typingPingRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, []);

  const relativePath = `/c/${encodeURIComponent(roomId)}`;
  /** Mesmo texto no SSR e no 1º paint do cliente — URL completa só após mount */
  const [shareUrl, setShareUrl] = useState(relativePath);

  useEffect(() => {
    setShareUrl(`${window.location.origin}${relativePath}`);
  }, [relativePath]);

  useEffect(() => {
    try {
      const k = "ghostchat:tab-id";
      let id = sessionStorage.getItem(k);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(k, id);
      }
      setClientId(id);
    } catch {
      setClientId(crypto.randomUUID());
    }
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining =
    expiresAtMs != null && now != null
      ? Math.max(0, expiresAtMs - now)
      : 0;

  const loadRoom = useCallback(async () => {
    setRoomSyncError(null);
    const result = await fetchRoomJson<{
      room: { expiresAt: string };
      mediaUploadConfigured?: boolean;
    }>(`/api/rooms/${encodeURIComponent(roomId)}`);
    if (!result.ok) {
      if (result.status === 404) {
        setInvalidRoom(true);
        setEnded(true);
        return;
      }
      setRoomSyncError(
        result.networkError
          ? "Sem ligação. Verifica a rede e toca em Atualizar."
          : "Não foi possível sincronizar a sala (servidor ocupado). Atualize a página ou tente dentro de instantes.",
      );
      return;
    }
    const data = result.data;
    setMediaUploadReady(data.mediaUploadConfigured === true);
    const exp = new Date(data.room.expiresAt).getTime();
    if (Number.isNaN(exp)) {
      setRoomSyncError("Resposta inválida do servidor. Atualize a página.");
      return;
    }
    setExpiresAtMs(exp);
    if (Date.now() > exp) {
      setEnded(true);
    }
  }, [roomId]);

  const loadMessages = useCallback(async () => {
    const q =
      clientId != null
        ? `?clientId=${encodeURIComponent(clientId)}`
        : "";
    const url = `/api/rooms/${encodeURIComponent(roomId)}/messages${q}`;
    const result = await fetchRoomJson<{ messages: ApiMessage[]; othersTyping?: boolean }>(
      url,
    );
    if (!result.ok) {
      if (result.status === 404) {
        setInvalidRoom(true);
        setEnded(true);
        return;
      }
      return;
    }
    const data = result.data;
    setMessages(data.messages);
    if (typeof data.othersTyping === "boolean") {
      setOthersTyping(data.othersTyping);
    }
  }, [roomId, clientId]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    void loadMessages();
    pollRef.current = window.setInterval(() => void loadMessages(), 2500);
    return () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current);
    };
  }, [loadMessages]);

  useEffect(() => {
    if (!wiping) return;
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [wiping]);

  useEffect(() => {
    if (ended || wiping || expiresAtMs == null || now == null) return;
    if (remaining <= 0) {
      wipeReasonRef.current = "expire";
      setWiping(true);
    }
  }, [ended, wiping, expiresAtMs, remaining, now]);

  useLayoutEffect(() => {
    scrollChatToBottom();
  }, [messages, othersTyping, ended, scrollChatToBottom]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onVV = () => scrollChatToBottom();
    vv.addEventListener("resize", onVV);
    vv.addEventListener("scroll", onVV);
    return () => {
      vv.removeEventListener("resize", onVV);
      vv.removeEventListener("scroll", onVV);
    };
  }, [scrollChatToBottom]);

  const send = useCallback(
    async (payload: { text: string; imageUrl?: string }) => {
      if (ended || invalidRoom || wiping) return;
      setSendError(null);
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: payload.text,
          mediaUrl: payload.imageUrl ?? null,
          mediaKind: payload.imageUrl ? "image" : null,
        }),
      });
      if (res.status === 404) {
        setInvalidRoom(true);
        setEnded(true);
        return;
      }
      if (!res.ok) {
        let msg = "Não foi possível enviar a mensagem.";
        try {
          const errBody = (await res.json()) as { error?: string };
          if (errBody.error?.trim()) msg = errBody.error.trim();
        } catch {
          /* corpo não-JSON */
        }
        setSendError(msg);
        return;
      }
      const data = await res.json();
      const msg = data.message as ApiMessage;
      setMyMessageIds((prev) => new Set(prev).add(msg.id));
      typingPingRef.current = 0;
      if (clientId) {
        await fetch(`/api/rooms/${encodeURIComponent(roomId)}/typing`, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, active: false }),
        });
      }
      void loadMessages().then(() => {
        scrollChatToBottom();
      });
    },
    [ended, invalidRoom, wiping, roomId, loadMessages, clientId, scrollChatToBottom],
  );

  const sendTypingPing = useCallback(
    async (active: boolean) => {
      if (!clientId || ended || invalidRoom || wiping) return;
      if (active) {
        const t = Date.now();
        if (t - typingPingRef.current < 1100) return;
        typingPingRef.current = t;
      } else {
        typingPingRef.current = 0;
      }
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/typing`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, active }),
      });
    },
    [clientId, ended, invalidRoom, wiping, roomId],
  );

  function handleWipeComplete() {
    const reason = wipeReasonRef.current;
    wipeReasonRef.current = null;
    if (reason === "manual") {
      router.push("/panel?ended=1");
      return;
    }
    setWiping(false);
    setEnded(true);
  }

  async function encerrar() {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/end`, {
      method: "POST",
      cache: "no-store",
    });
    if (!res.ok) return;
    wipeReasonRef.current = "manual";
    setWiping(true);
  }

  if (invalidRoom) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <p className="text-lg text-[#f5f0ff] opacity-90">Esta sala não existe ou já foi encerrada.</p>
        <Link
          href="/panel"
          className="rounded-xl bg-[#7b5ea7] px-6 py-3 font-semibold text-[#f5f0ff]"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-lg flex-col gap-4 overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6">
      <GhostWipeOverlay show={wiping} onComplete={handleWipeComplete} />

      <header className="flex min-w-0 items-center justify-between gap-3">
        <Link href="/panel" className="text-sm opacity-70 hover:opacity-100">
          ← Painel
        </Link>
        <GhostAvatar size={40} />
      </header>

      {roomSyncError ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/50 px-3 py-2 text-center text-xs text-amber-100/95">
          <p>{roomSyncError}</p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15"
            onClick={() => void loadRoom()}
          >
            Atualizar
          </button>
        </div>
      ) : null}

      <div className="min-w-0 rounded-2xl border border-[#c4b0e8]/25 px-3 py-3 text-sm text-[#f5f0ff] sm:px-4">
        <p className="font-[family-name:var(--font-fredoka)] font-semibold">Sala confidencial</p>
        <p className="mt-1 text-xs opacity-80">
          Só entra quem tiver este link. Conversa privada; não há perfil público nem lista de contactos.
        </p>
        <p className="mt-2 break-words break-all text-xs opacity-70">{shareUrl}</p>
        <p className="mt-2 break-words text-xs opacity-80">
          {expiresAtMs == null || now == null
            ? "Sincronizando com o servidor…"
            : ended
              ? "Esta sala encerrou ou expirou."
              : `Expira em ${formatRemaining(remaining)} · depois as mensagens e ficheiros são apagados.`}
        </p>
      </div>

      <div
        ref={scrollContainerRef}
        className="relative flex min-h-[240px] min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-[#c4b0e8]/15 select-none"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
          aria-hidden
        >
          <div
            className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%] opacity-[0.07]"
            style={{
              transform: "rotate(-14deg)",
              backgroundImage: `repeating-linear-gradient(
                -14deg,
                transparent 0 100px,
                rgba(245, 240, 255, 0.15) 100px 101px
              )`,
            }}
          />
        </div>
        <div className="relative z-10 flex min-h-0 flex-col gap-3 p-3">
          {messages.length === 0 && !ended ? (
            <p className="text-center text-sm opacity-60">Nenhuma mensagem ainda. Diga oi 👻</p>
          ) : null}
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              text={m.body}
              imageUrl={m.mediaUrl ?? undefined}
              imagePriority={
                Boolean(m.mediaUrl) && i === messages.length - 1
              }
              sent={myMessageIds.has(m.id)}
              time={
                m.displayTime?.trim() ||
                formatMessageTime(getMessageCreatedAt(m))
              }
            />
          ))}
          {othersTyping && !ended ? <TypingIndicator /> : null}
          {ended ? (
            <p className="text-center text-sm opacity-60">Sem novas mensagens nesta sala.</p>
          ) : null}
        </div>
      </div>

      {!ended ? (
        <>
          {sendError ? (
            <p className="rounded-xl border border-red-400/35 bg-red-950/40 px-3 py-2 text-center text-xs text-red-200/95">
              {sendError}
            </p>
          ) : null}
          <ChatComposer
            roomId={roomId}
            mediaUploadReady={mediaUploadReady}
            onSend={send}
            onTypingActive={sendTypingPing}
            onInputFocus={scrollChatToBottom}
          />
          <button
            type="button"
            onClick={() => void encerrar()}
            className="w-full rounded-xl border border-[#c4b0e8]/35 py-3 text-sm font-semibold text-[#f5f0ff] transition hover:bg-white/5"
          >
            Encerrar conversa
          </button>
        </>
      ) : (
        <Link
          href="/panel"
          className="block rounded-xl bg-[#7b5ea7] py-3 text-center text-sm font-semibold text-[#f5f0ff]"
        >
          Voltar ao painel
        </Link>
      )}

    </div>
  );
}
