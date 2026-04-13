import Link from "next/link";
import { ghostTheme } from "@/styles/theme";

export type ChatPreview = {
  id: string;
  title: string;
  lastMessage: string;
  unread?: number;
};

type ChatListProps = {
  items: ChatPreview[];
};

export function ChatList({ items }: ChatListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/chat?id=${encodeURIComponent(c.id)}`}
            className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-white/5"
            style={{
              border: `1px solid ${ghostTheme.colors.lavender}22`,
              color: ghostTheme.colors.softWhite,
            }}
          >
            <div>
              <p className="font-semibold">{c.title}</p>
              <p className="text-sm opacity-70">{c.lastMessage}</p>
            </div>
            {c.unread ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  background: ghostTheme.colors.mint,
                  color: ghostTheme.colors.background,
                }}
              >
                {c.unread}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
