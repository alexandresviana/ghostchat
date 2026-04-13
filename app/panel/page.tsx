import { Suspense } from "react";
import { PanelLoader } from "./panel-loader";

export default function PanelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center px-6 py-12 text-sm opacity-70">
          Carregando painel…
        </div>
      }
    >
      <PanelLoader />
    </Suspense>
  );
}
