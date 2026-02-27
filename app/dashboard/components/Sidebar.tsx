import Link from "next/link";
import Button from "@/components/Button";

type ImportedChat = {
  title: string;
  url: string;
  tokenCount: number;
};

type SidebarProps = {
  importedChats: ImportedChat[];
};

export default function Sidebar({ importedChats }: SidebarProps) {
  return (
    <aside className="card flex h-full flex-col gap-4 overflow-hidden p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-indigo-300">Workspace</p>
        <h2 className="text-lg font-semibold">Portability</h2>
      </div>

      <Link href="/dashboard">
        <Button className="w-full">+ New Import</Button>
      </Link>

      <div className="flex-1 space-y-2 overflow-y-auto">
        <p className="text-xs uppercase tracking-wide text-slate-400">Session History</p>
        {importedChats.length === 0 ? (
          <p className="text-sm text-slate-500">No chats imported yet.</p>
        ) : (
          importedChats.map((chat, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-sm"
            >
              <p className="truncate font-medium text-slate-200" title={chat.title}>
                {chat.title || chat.url}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ~{chat.tokenCount.toLocaleString()} tokens
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto space-y-2 border-t border-slate-700 pt-3 text-sm text-slate-400">
        <p>
          {importedChats.length} / 7 imports this session
        </p>
        <p className="text-xs text-slate-500">
          OpenAI key status:{" "}
          <span className="font-mono text-xs">
            {process.env.NEXT_PUBLIC_HAS_API_KEY === "1" ? "✓ Connected" : "Set in .env.local"}
          </span>
        </p>
      </div>
    </aside>
  );
}
