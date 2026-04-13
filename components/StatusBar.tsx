import { ghostTheme } from "@/styles/theme";

type Presence = "online" | "busy" | "away" | "offline";

type StatusBarProps = {
  username: string;
  presence: Presence;
  lastSeen?: string;
};

const labels: Record<Presence, string> = {
  online: "Online",
  busy: "Ocupado",
  away: "Ausente",
  offline: "Offline",
};

export function StatusBar({ username, presence, lastSeen }: StatusBarProps) {
  const dot =
    presence === "online"
      ? ghostTheme.colors.mint
      : presence === "busy"
        ? "#f59e0b"
        : presence === "away"
          ? ghostTheme.colors.lavender
          : "#6b7280";

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{
        border: `1px solid ${ghostTheme.colors.lavender}33`,
        color: ghostTheme.colors.softWhite,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: dot, boxShadow: `0 0 12px ${dot}` }}
          aria-hidden
        />
        <div>
          <p className="font-semibold">{username}</p>
          <p className="text-sm opacity-80">
            {labels[presence]}
            {presence === "offline" && lastSeen ? ` · Visto ${lastSeen}` : null}
          </p>
        </div>
      </div>
    </div>
  );
}
