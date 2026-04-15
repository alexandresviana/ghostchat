"use client";

import dynamic from "next/dynamic";

const PanelContent = dynamic(() => import("./panel-content").then((m) => m.PanelContent), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center px-6 py-12 text-sm text-[#f5f0ff] opacity-70">
      Carregando painel…
    </div>
  ),
});

export function PanelLoader({
  adminPathToken,
}: {
  /** Segmento em `/panel/i/[token]` — comparado com NEXT_PUBLIC_GHOSTCHAT_ADMIN_UNLOCK_TOKEN */
  adminPathToken?: string;
} = {}) {
  return <PanelContent adminPathToken={adminPathToken} />;
}
