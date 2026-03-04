import Link from "next/link";
import Button from "@/components/Button";
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

export default function Sidebar({ importedChats, onSelectChat }: SidebarProps) {
  const { data: session } = useSession();

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
            <button
              key={chat.id || i}
              onClick={() => chat.id && onSelectChat?.(chat.id)}
              className="w-full text-left rounded-lg hover:bg-slate-700/50 border border-slate-700 bg-slate-800/50 p-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <p className="truncate font-medium text-slate-200" title={chat.title}>
                {chat.title || chat.url}
              </p>
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>~{chat.tokenCount?.toLocaleString() || 0} tokens</span>
                {chat.createdAt && <span>{new Date(chat.createdAt).toLocaleDateString()}</span>}
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-auto space-y-4 border-t border-slate-700 pt-3 text-sm text-slate-400">
        <div className="flex items-center gap-2 overflow-hidden items-end justify-between">
          <div className="flex flex-col truncate pr-2">
            <span className="font-medium text-slate-200 truncate">{session?.user?.name || session?.user?.email || "User"}</span>
            <p className="text-[10px] text-slate-500">{process.env.NEXT_PUBLIC_HAS_API_KEY === "1" ? "LLM Ready" : "Set GROQ DB"}</p>
          </div>
          <button onClick={() => void signOut({ callbackUrl: "/auth/login" })} className="text-xs underline hover:text-slate-300">
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
