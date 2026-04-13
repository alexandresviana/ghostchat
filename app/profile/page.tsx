import Link from "next/link";
import { GhostAvatar } from "@/components/GhostAvatar";
import { ghostTheme } from "@/styles/theme";

export default function ProfilePage() {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full min-w-0 max-w-lg flex-col gap-8 overflow-x-hidden px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <GhostAvatar size={72} />
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: ghostTheme.fonts.display }}>
            Seu perfil
          </h1>
          <p className="text-sm opacity-70">Status honesto: online, ocupado ou ausente.</p>
        </div>
      </div>
      <ul
        className="flex flex-col gap-2 rounded-2xl p-4 text-sm"
        style={{ border: `1px solid ${ghostTheme.colors.lavender}33` }}
      >
        <li className="flex justify-between border-b border-white/10 py-2">
          <span className="opacity-70">Nome de usuário</span>
          <span className="font-medium">ghost_user</span>
        </li>
        <li className="flex justify-between border-b border-white/10 py-2">
          <span className="opacity-70">Leituras</span>
          <span style={{ color: ghostTheme.colors.mint }}>Sempre visíveis</span>
        </li>
        <li className="flex justify-between py-2">
          <span className="opacity-70">Modo fantasma (v2)</span>
          <span className="opacity-50">Em breve</span>
        </li>
      </ul>
      <Link href="/chat" className="text-center text-sm underline">
        Ir para conversas
      </Link>
    </div>
  );
}
