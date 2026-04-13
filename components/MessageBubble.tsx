import Image from "next/image";
import { ghostTheme } from "@/styles/theme";

type MessageBubbleProps = {
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  sent?: boolean;
  /** Hora local (ex.: "14:32") — sem data */
  time?: string;
  /** Última imagem visível — melhora LCP (Next.js) */
  imagePriority?: boolean;
};

export function MessageBubble({
  text,
  imageUrl,
  imageAlt = "Anexo",
  sent,
  time,
  imagePriority,
}: MessageBubbleProps) {
  const hasText = Boolean(text?.trim());
  const hasImage = Boolean(imageUrl);
  const isBlob = imageUrl?.startsWith("blob:") ?? false;

  return (
    <div
      className={`flex min-w-0 max-w-[85%] flex-col gap-2 rounded-2xl px-3 py-2 text-sm ${
        sent ? "self-end" : "self-start"
      }`}
      style={{
        background: sent ? ghostTheme.colors.purple : "#1a1a2e",
        color: ghostTheme.colors.softWhite,
        border: `1px solid ${ghostTheme.colors.lavender}33`,
      }}
    >
      {hasImage ? (
        <div className="relative max-h-56 w-full max-w-xs overflow-hidden rounded-xl">
          {isBlob ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={imageAlt} className="h-auto w-full object-cover" />
          ) : (
            <Image
              src={imageUrl!}
              alt={imageAlt}
              width={320}
              height={224}
              unoptimized
              priority={Boolean(imagePriority)}
              className="h-auto w-full object-cover"
            />
          )}
        </div>
      ) : null}
      {hasText ? (
        <p className="break-words leading-relaxed whitespace-pre-wrap">{text}</p>
      ) : null}
      {time ? (
        <p
          className={`mt-1 block min-h-[1em] text-xs font-medium tabular-nums leading-none text-[#f5f0ff]/80 ${sent ? "text-right" : "text-left"}`}
          style={{ WebkitTextSizeAdjust: "100%" }}
        >
          {time}
        </p>
      ) : null}
    </div>
  );
}
