import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tokenMatchesCustomPurchasePath } from "@/lib/custom-purchase-unlock";
import { CustomPurchaseLoader } from "../../custom-purchase-loader";

type Props = { params: Promise<{ token: string }> };

export default async function CustomPurchasePage({ params }: Props) {
  const { token } = await params;
  if (!tokenMatchesCustomPurchasePath(token)) {
    notFound();
  }
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center px-6 py-12 text-sm text-[#f5f0ff] opacity-70">
          A carregar…
        </div>
      }
    >
      <CustomPurchaseLoader pathToken={token} />
    </Suspense>
  );
}
