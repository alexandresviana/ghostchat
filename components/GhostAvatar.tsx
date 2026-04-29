"use client";

import { useId } from "react";

type GhostAvatarProps = {
  size?: number;
  className?: string;
};

/** Área de desenho base (SVG 220×250 + halo).
 *  PNG logo in-app iOS: `public/ghost-logo.svg` (transparente) → `npm run export:ios-ghost-pngs`. Ícone da app: `scripts/ghost-reference.png`.
 */
const BASE_W = 220;
const BASE_H = 260;

export function GhostAvatar({ size = 96, className = "" }: GhostAvatarProps) {
  const rawId = useId().replace(/:/g, "");
  const gradId = `${rawId}-bodyGrad`;
  const filterId = `${rawId}-filterGlow`;
  const scale = Math.min(size / BASE_W, size / BASE_H);
  const showBubble = size >= 52;

  return (
    <div
      className={`ghost-icon-root ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Fantasminha Ghost Chat"
    >
      <div
        className="ghost-icon-scaled"
        style={{ transform: `scale(${scale})` }}
      >
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 2,
            height: 2,
            top: "12%",
            left: "8%",
            opacity: 0.6,
            animation: "ghost-icon-twinkle 2.5s ease-in-out infinite 0.3s",
          }}
        />
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 1.5,
            height: 1.5,
            top: "20%",
            left: "82%",
            opacity: 0.5,
            animation: "ghost-icon-twinkle 3s ease-in-out infinite 1s",
          }}
        />
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 2.5,
            height: 2.5,
            top: "75%",
            left: "14%",
            opacity: 0.7,
            animation: "ghost-icon-twinkle 2s ease-in-out infinite 0.6s",
          }}
        />
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 1.5,
            height: 1.5,
            top: "80%",
            left: "78%",
            opacity: 0.5,
            animation: "ghost-icon-twinkle 3.5s ease-in-out infinite 1.4s",
          }}
        />
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 2,
            height: 2,
            top: "55%",
            left: "6%",
            opacity: 0.4,
            animation: "ghost-icon-twinkle 2.8s ease-in-out infinite 0.9s",
          }}
        />
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 1,
            height: 1,
            top: "40%",
            left: "90%",
            opacity: 0.6,
            animation: "ghost-icon-twinkle 2.2s ease-in-out infinite 1.8s",
          }}
        />
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 2,
            height: 2,
            top: "88%",
            left: "50%",
            opacity: 0.4,
            animation: "ghost-icon-twinkle 3.2s ease-in-out infinite 0.2s",
          }}
        />
        <div
          className="ghost-icon-bg-star"
          style={{
            width: 1.5,
            height: 1.5,
            top: "8%",
            left: "55%",
            opacity: 0.5,
            animation: "ghost-icon-twinkle 2.6s ease-in-out infinite 2s",
          }}
        />

        <div className="ghost-icon-glow" aria-hidden />

        <div className="ghost-icon-wrap">
          <div className="ghost-icon-shadow" aria-hidden />
          {showBubble ? (
            <div className="ghost-icon-bubble" aria-hidden>
              💬
            </div>
          ) : null}

          <svg
            className="ghost-icon-svg relative z-[1]"
            width={220}
            height={250}
            viewBox="0 0 140 165"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient
                id={gradId}
                x1={18}
                y1={16}
                x2={122}
                y2={145}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#ede5fa" />
                <stop offset="55%" stopColor="#c4b0e8" />
                <stop offset="100%" stopColor="#9e82cc" />
              </linearGradient>
              <filter
                id={filterId}
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d="M18 78C18 42 43 16 70 16C97 16 122 42 122 78L122 135
         C122 135 110 122 99 133C88 144 77 127 70 133
         C63 139 52 144 41 133C30 122 18 135 18 135Z"
              fill={`url(#${gradId})`}
              filter={`url(#${filterId})`}
            />

            <path
              d="M33 44C33 33 51 26 70 26C89 26 107 33 107 44L107 80C92 71 48 71 33 80Z"
              fill="rgba(255,255,255,0.13)"
            />

            <g className="ghost-icon-eye-l">
              <ellipse cx={54} cy={74} rx={12} ry={14} fill="#120829" />
              <circle cx={58} cy={69} r={4.5} fill="white" opacity={0.95} />
              <circle cx={56} cy={76} r={2} fill="white" opacity={0.45} />
            </g>

            <g className="ghost-icon-eye-r">
              <ellipse cx={86} cy={74} rx={12} ry={14} fill="#120829" />
              <circle cx={90} cy={69} r={4.5} fill="white" opacity={0.95} />
              <circle cx={88} cy={76} r={2} fill="white" opacity={0.45} />
            </g>

            <path
              d="M56 95Q70 110 84 95"
              stroke="#120829"
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
            />

            <ellipse
              cx={41}
              cy={91}
              rx={10}
              ry={6}
              fill="rgba(255,140,180,0.32)"
            />
            <ellipse
              cx={99}
              cy={91}
              rx={10}
              ry={6}
              fill="rgba(255,140,180,0.32)"
            />

            <circle
              className="ghost-icon-sp1"
              cx={26}
              cy={52}
              r={3}
              fill="#7ef0c8"
            />
            <circle
              className="ghost-icon-sp2"
              cx={114}
              cy={46}
              r={2.5}
              fill="#c4b0e8"
            />
            <circle
              className="ghost-icon-sp3"
              cx={22}
              cy={92}
              r={2}
              fill="white"
              opacity={0.6}
            />
            <circle
              className="ghost-icon-sp4"
              cx={118}
              cy={98}
              r={2}
              fill="white"
              opacity={0.6}
            />

            <path
              className="ghost-icon-star"
              d="M70 2 L72.5 8.5 L79.5 8.5 L74 12.5 L76.5 19 L70 15 L63.5 19 L66 12.5 L60.5 8.5 L67.5 8.5 Z"
              fill="#7ef0c8"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
