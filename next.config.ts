import type { NextConfig } from "next";

/**
 * Em `next dev`, o HMR usa WebSocket (`/_next/webpack-hmr`).
 * Se você abre o app por um túnel/CDN (ex.: Fastly) e não por localhost,
 * o Next precisa aceitar essa origem; senão o browser bloqueia o WS.
 *
 * Defina hosts extras em `.env.local`: NEXT_DEV_ALLOWED_ORIGINS=meu.dominio.com
 */
const fromEnv =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

/** HMR/WebSocket em dev quando o browser usa um host que não é localhost (túnel, Fastly, etc.). */
const defaultTunnelHosts = ["ghosth.chat"];

const nextConfig: NextConfig = {
  /** Imagem Docker mínima (`Dockerfile`) — gera `.next/standalone`. */
  output: "standalone",
  allowedDevOrigins: [...new Set([...defaultTunnelHosts, ...fromEnv])],
  /** Imagens do chat servidas pelo Pull Zone Bunny (`NEXT_PUBLIC_BUNNY_CDN_URL`). Domínio customizado: acrescente padrão aqui. */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
        pathname: "/ghostchat/**",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  /**
   * Safari iOS (e caches CDN à frente do Next) guardam HTML agressivamente.
   * `no-store` + `Pragma` ajuda a não servir shell/RSC antigo após deploy.
   */
  async headers() {
    const noStoreHtml = [
      {
        key: "Cache-Control",
        value: "private, no-cache, no-store, must-revalidate, max-age=0",
      },
      { key: "Pragma", value: "no-cache" },
    ];
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
      { source: "/", headers: noStoreHtml },
      { source: "/c/:path*", headers: noStoreHtml },
      { source: "/panel", headers: noStoreHtml },
      { source: "/login", headers: noStoreHtml },
      { source: "/profile", headers: noStoreHtml },
      { source: "/chat", headers: noStoreHtml },
    ];
  },
};

export default nextConfig;
