"use client";

import { useEffect, useRef, useState } from "react";
import { ghostTheme } from "@/styles/theme";

type ChatComposerProps = {
  /** Sala atual — necessário para upload no Bunny Storage */
  roomId: string;
  /** null = ainda não sabido; false = variáveis Bunny Storage em falta no servidor (só texto) */
  mediaUploadReady?: boolean | null;
  onSend: (payload: { text: string; imageUrl?: string }) => void;
  disabled?: boolean;
  /** Notifica o servidor quando o utilizador está a escrever (para mostrar “Digitando…” ao outro). */
  onTypingActive?: (active: boolean) => void;
  /** Chamado ao focar o campo — útil para fazer scroll ao teclado no mobile. */
  onInputFocus?: () => void;
};

function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(file.name);
}

function isSafeUploadedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname) return false;
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function ChatComposer({
  roomId,
  mediaUploadReady = null,
  onSend,
  disabled,
  onTypingActive,
  onInputFocus,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    const t = text.trim();
    if (!t) return;
    onTypingActive?.(false);
    onSend({ text: t });
    setText("");
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !isLikelyImageFile(file)) {
      input.value = "";
      return;
    }
    onTypingActive?.(false);
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/upload`,
        {
          method: "POST",
          body: fd,
          cache: "no-store",
        },
      );
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url || !isSafeUploadedImageUrl(data.url)) {
        if (res.status === 404) {
          setUploadError(
            "A sala ainda não apareceu no servidor (rede lenta). Espera um segundo e tenta de novo, ou atualiza a página.",
          );
        } else {
          setUploadError(data.error ?? "Não foi possível enviar a imagem.");
        }
        input.value = "";
        return;
      }
      onSend({ text: text.trim() || "📷", imageUrl: data.url });
      setText("");
    } catch {
      setUploadError("Erro de rede ao enviar a imagem.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  useEffect(() => {
    if (!onTypingActive) return;
    if (disabled) {
      onTypingActive(false);
      return;
    }
    if (!text.trim()) {
      onTypingActive(false);
      return;
    }
    onTypingActive(true);
    const id = window.setTimeout(() => onTypingActive(false), 2800);
    return () => window.clearTimeout(id);
  }, [text, onTypingActive, disabled]);

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-3"
      style={{ border: `1px solid ${ghostTheme.colors.lavender}33` }}
    >
      <div className="flex min-w-0 items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
        <button
          type="button"
          disabled={
            disabled ||
            uploading ||
            mediaUploadReady === false
          }
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg transition hover:bg-white/10 disabled:opacity-40"
          style={{ border: `1px solid ${ghostTheme.colors.lavender}44` }}
          aria-label={
            mediaUploadReady === false
              ? "Envio de fotos indisponível (configura Bunny Storage)"
              : uploading
                ? "A enviar imagem…"
                : "Enviar foto"
          }
        >
          {uploading ? "…" : "📷"}
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => onInputFocus?.()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled || uploading}
          placeholder="Mensagem, emojis 😊…"
          rows={2}
          className="min-h-[44px] min-w-0 flex-1 resize-none rounded-xl bg-transparent px-3 py-2 outline-none ring-0 placeholder:opacity-50 disabled:opacity-40"
          style={{
            border: `1px solid ${ghostTheme.colors.lavender}33`,
            fontSize: 16,
            lineHeight: 1.45,
          }}
        />
        <button
          type="button"
          disabled={disabled || uploading || !text.trim()}
          onClick={submit}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-40"
          style={{ background: ghostTheme.colors.mint, color: ghostTheme.colors.background }}
          aria-label="Enviar mensagem"
        >
          {/* Ícone tipo WhatsApp (avião de papel) */}
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="currentColor"
            aria-hidden
          >
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
      {mediaUploadReady === false ? (
        <p className="text-center text-xs text-amber-200/90">
          Fotos: configura no servidor{" "}
          <code className="rounded bg-white/10 px-1">BUNNY_STORAGE_*</code> e{" "}
          <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_BUNNY_CDN_URL</code>
          , reinicia o app, e volta a abrir a sala.
        </p>
      ) : null}
      {uploadError ? (
        <p className="text-center text-xs text-red-300/90">{uploadError}</p>
      ) : null}
    </div>
  );
}
