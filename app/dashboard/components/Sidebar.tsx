"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

type ImportedChat = {
  id?: string;
  title: string;
  url: string;
  tokenCount: number;
  createdAt?: string;
};

type SidebarProps = {
  importedChats: ImportedChat[];
  onSelectChat?: (id: string) => void;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Sidebar({ importedChats, onSelectChat }: SidebarProps) {
  const { data: session } = useSession();

  return (
    <aside className="flex h-full flex-col gap-5 overflow-hidden px-4 py-5" style={{ borderRight: "1px solid var(--surface-border)" }}>
      {/* Wordmark */}
      <div>
        <span className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Portability</span>
      </div>

      {/* New extraction CTA */}
      <Link href="/dashboard">
        <button
          className="w-full rounded-md px-3 py-2 text-sm font-medium transition-all"
          style={{
            background: "var(--accent-muted)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent)",
          }}
        >
          Extract memory
        </button>
      </Link>

      {/* History */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <p className="mb-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Your extractions</p>
        {importedChats.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nothing here yet.</p>
        ) : (
          importedChats.map((chat, i) => (
            <button
              key={chat.id || i}
              onClick={() => chat.id && onSelectChat?.(chat.id)}
              className="w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-none"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              <p className="truncate font-medium leading-snug" style={{ color: "var(--text-primary)" }} title={chat.title}>
                {chat.title || new URL(chat.url).hostname}
              </p>
              {chat.createdAt && (
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {timeAgo(chat.createdAt)}
                </p>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 text-sm flex flex-col gap-3" style={{ borderTop: "1px solid var(--surface-border)" }}>
        {!session ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              3 free extractions remaining. Sign in to save your work.
            </p>
            <Link href="/auth/login">
              <button
                className="w-full rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{ background: "var(--surface-border)", color: "var(--text-primary)" }}
              >
                Sign in
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                {session.user?.name || session.user?.email}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Free plan</p>
            </div>
            <button
              onClick={() => void signOut({ callbackUrl: "/auth/login" })}
              className="shrink-0 text-xs transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              Sign out
            </button>
          </div>
        )}
        <div className="text-[10px] text-center pb-2 pt-1" style={{ color: "var(--text-muted)" }}>
          &copy; {new Date().getFullYear()} Siddhesh Dumre
        </div>
      </div>
    </aside>
  );
}
