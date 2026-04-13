"use client";

/** Indicador quando outra pessoa está a escrever na sala. */
export function TypingIndicator() {
  return (
    <div
      className="typing-indicator flex items-center gap-1.5 self-start rounded-2xl border border-[#c4b0e8]/20 bg-[#1a1a2e]/80 px-3 py-2 text-xs text-[#c4b0e8]"
      role="status"
      aria-live="polite"
      aria-label="A outra pessoa está a digitar"
    >
      <span className="font-medium text-[#f5f0ff]/85">Digitando</span>
      <span className="typing-indicator__dots flex gap-0.5 pt-0.5" aria-hidden>
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
      </span>
    </div>
  );
}
