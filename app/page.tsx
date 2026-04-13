import Link from "next/link";
import { GhostAvatar } from "@/components/GhostAvatar";
import { ghostTheme } from "@/styles/theme";

export default function Home() {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-1 flex-col items-center justify-center gap-10 overflow-x-hidden px-4 py-16 sm:px-6">
      <GhostAvatar size={120} />
      <div className="max-w-lg text-center">
        <h1
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: ghostTheme.fonts.display }}
        >
          Ghost Chat
        </h1>
        <p className="mt-3 text-lg opacity-80">
          Crie uma sala e partilhe um <strong>link único</strong>: a conversa é <strong>privada</strong> e{" "}
          <strong>confidencial</strong> — só entra quem tiver o link. Texto, emojis e fotos; em{" "}
          <strong>24 horas</strong> o acesso expira e os dados são apagados, ou use <strong>Encerrar</strong> no
          chat quando quiser.
        </p>
      </div>
      <nav className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/panel"
          className="rounded-full px-8 py-3 text-lg font-semibold transition hover:opacity-90"
          style={{
            background: ghostTheme.colors.purple,
            color: ghostTheme.colors.softWhite,
          }}
        >
          Abrir painel
        </Link>
      </nav>
      <p className="max-w-md text-center text-sm opacity-60">
        Ligação segura (HTTPS), sem perfis públicos — pensa nesta sala como um envelope fechado entre vocês.
      </p>
    </div>
  );
}
