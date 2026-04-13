"use client";

import { useEffect, useRef } from "react";
import { GhostAvatar } from "@/components/GhostAvatar";

/** Duração até `onComplete` — deve ser ≥ ao maior `animation` em `globals.css` + margem para ver o fim. */
export const GHOST_WIPE_DURATION_MS = 9200;

type GhostWipeOverlayProps = {
  show: boolean;
  onComplete: () => void;
};

/**
 * Fantasma “apaga” o ecrã: névoa expande a partir do centro e o conteúdo some.
 */
export function GhostWipeOverlay({ show, onComplete }: GhostWipeOverlayProps) {
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!show) {
      doneRef.current = false;
      return;
    }
    doneRef.current = false;
    const id = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onCompleteRef.current();
    }, GHOST_WIPE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="ghost-wipe-root fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#0d0d1a]"
      role="status"
      aria-live="assertive"
      aria-label="A conversa está a ser apagada"
    >
      <div className="ghost-wipe-sweep absolute inset-0 bg-[#0d0d1a]" aria-hidden />
      <div className="ghost-wipe-bloom absolute inset-0 flex items-center justify-center" aria-hidden />
      <div className="ghost-wipe-ghost relative z-10 flex flex-col items-center gap-4 px-6">
        <GhostAvatar size={112} className="ghost-wipe-avatar" />
        <p className="text-center font-[family-name:var(--font-fredoka)] text-lg text-[#f5f0ff] opacity-90">
          Apagando tudo…
        </p>
        <p className="max-w-xs text-center text-xs text-[#c4b0e8]/80">
          O fantasma está limpando esta sala. Em instantes não restará nada.
        </p>
      </div>
    </div>
  );
}
