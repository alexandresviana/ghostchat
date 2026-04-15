import Link from "next/link";
import { GhostAvatar } from "@/components/GhostAvatar";

export type ConversationEndReason = "manual" | "expire" | "remote";

type Props = {
  reason: ConversationEndReason | null;
};

function copyForReason(reason: ConversationEndReason | null): {
  title: string;
  body: string;
} {
  switch (reason) {
    case "manual":
      return {
        title: "Conversa encerrada",
        body: "Esta sala foi apagada. Já não é possível enviar nem ler mensagens aqui.",
      };
    case "expire":
      return {
        title: "Tempo esgotado",
        body: "A janela desta conversa terminou e os dados foram apagados.",
      };
    case "remote":
      return {
        title: "Conversa terminada",
        body: "A sala foi encerrada. Já não há mensagens neste link.",
      };
    default:
      return {
        title: "Conversa terminada",
        body: "Esta sala já não está disponível.",
      };
  }
}

/**
 * Ecrã completo após wipe ou quando a sala deixou de existir no fluxo normal do chat.
 */
export function ConversationEndedScreen({ reason }: Props) {
  const { title, body } = copyForReason(reason);
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <GhostAvatar size={96} />
      <div className="flex flex-col gap-3">
        <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-semibold text-[#f5f0ff]">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-[#f5f0ff]/85">{body}</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/panel?ended=1#pacote"
          className="rounded-xl bg-[#7ef0c8] px-6 py-3 text-center text-sm font-semibold text-[#0d0d1a] transition hover:opacity-90"
        >
          Ver planos e comprar
        </Link>
        <Link
          href="/panel?ended=1"
          className="rounded-xl border border-[#c4b0e8]/40 px-6 py-3 text-center text-sm font-semibold text-[#f5f0ff] transition hover:bg-white/5"
        >
          Voltar ao painel
        </Link>
      </div>
      <Link href="/" className="text-xs text-[#c4b0e8]/80 underline">
        Início
      </Link>
    </div>
  );
}
