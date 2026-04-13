import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["400", "600"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Ghost Chat — conversa privada e confidencial",
  description:
    "Salas por link único, cifradas em trânsito e efémeras: a conversa some quando expira ou encerras. Ideal para falar com privacidade.",
};

/* maximumScale 1 + userScalable false: evita zoom ao focar inputs no iOS (scroll horizontal / layout partido).
 * Quem precisar de zoom de acessibilidade pode usar leitor de ecrã ou aumentar texto no sistema. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full min-h-[100dvh] flex flex-col overflow-x-hidden bg-[#0d0d1a] text-[#f5f0ff]"
        suppressHydrationWarning
      >
        <div
          id="ghostchat-shell"
          className="flex min-h-[100dvh] w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden"
        >
          {children}
        </div>
      </body>
    </html>
  );
}
