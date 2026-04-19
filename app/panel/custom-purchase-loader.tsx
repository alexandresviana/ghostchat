"use client";

import dynamic from "next/dynamic";

const CustomPurchaseContent = dynamic(
  () => import("./custom-purchase-content").then((m) => m.CustomPurchaseContent),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center px-6 py-12 text-sm text-[#f5f0ff] opacity-70">
        A carregar…
      </div>
    ),
  },
);

export function CustomPurchaseLoader({ pathToken }: { pathToken: string }) {
  return <CustomPurchaseContent pathToken={pathToken} />;
}
