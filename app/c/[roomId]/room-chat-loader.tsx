"use client";

import dynamic from "next/dynamic";

const RoomChat = dynamic(() => import("./room-chat").then((m) => m.RoomChat), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-2 px-4 py-12 text-[#f5f0ff]">
      <p className="text-sm opacity-80">Carregando sala…</p>
    </div>
  ),
});

export function RoomChatLoader({ roomId }: { roomId: string }) {
  return <RoomChat roomId={roomId} />;
}
