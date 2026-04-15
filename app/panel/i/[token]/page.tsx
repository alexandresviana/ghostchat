import { Suspense } from "react";
import { tokenMatchesAdminPanelUnlock } from "@/lib/admin-unlock";
import { PanelLoader } from "../../panel-loader";

type Props = { params: Promise<{ token: string }> };

export default async function PanelInternalAccessPage({ params }: Props) {
  const { token } = await params;
  const serverAdminUnlockOk = tokenMatchesAdminPanelUnlock(token);
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center px-6 py-12 text-sm opacity-70">
          Carregando painel…
        </div>
      }
    >
      <PanelLoader serverAdminUnlockOk={serverAdminUnlockOk} />
    </Suspense>
  );
}
