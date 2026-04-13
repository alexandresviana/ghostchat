"use client";

import Image from "next/image";
import { ghostTheme } from "@/styles/theme";

type GhostAvatarProps = {
  size?: number;
  className?: string;
};

export function GhostAvatar({ size = 96, className = "" }: GhostAvatarProps) {
  return (
    <div
      className={`relative inline-flex ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full opacity-40 blur-xl"
        style={{ background: ghostTheme.colors.mint }}
        aria-hidden
      />
      <Image
        src="/ghost-logo.svg"
        alt="Fantasminha Ghost Chat"
        width={size}
        height={size}
        priority
        className="ghost-float relative z-10 drop-shadow-lg"
      />
    </div>
  );
}
