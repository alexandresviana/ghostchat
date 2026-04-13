import { RoomChatLoader } from "./room-chat-loader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return <RoomChatLoader roomId={roomId} />;
}
