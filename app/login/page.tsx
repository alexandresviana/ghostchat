import Link from "next/link";
import { GhostAvatar } from "@/components/GhostAvatar";
import { ghostTheme } from "@/styles/theme";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full min-w-0 max-w-md flex-col justify-center gap-8 overflow-x-hidden px-4 py-12 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <GhostAvatar size={88} />
        <h1
          className="text-3xl font-semibold"
          style={{ fontFamily: ghostTheme.fonts.display }}
        >
          Bem-vindo de volta
        </h1>
        <p className="text-sm opacity-75">
          Cadastro e login serão ligados ao provedor de auth escolhido (Clerk, Firebase, etc.).
        </p>
      </div>
      <form className="flex flex-col gap-4" action="#" method="post">
        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-80">E-mail</span>
          <input
            type="email"
            name="email"
            required
            className="rounded-xl border bg-transparent px-4 py-3 text-base outline-none ring-0 focus:border-[#7b5ea7] md:text-sm"
            style={{ borderColor: `${ghostTheme.colors.lavender}44` }}
            placeholder="voce@exemplo.com"
            autoComplete="email"
          />
        </label>
        <button
          type="button"
          className="rounded-xl py-3 font-semibold opacity-80"
          style={{ background: ghostTheme.colors.purple, color: ghostTheme.colors.softWhite }}
        >
          Continuar (stub)
        </button>
      </form>
      <p className="text-center text-sm opacity-60">
        <Link href="/" className="underline">
          Voltar ao início
        </Link>
      </p>
    </div>
  );
}
