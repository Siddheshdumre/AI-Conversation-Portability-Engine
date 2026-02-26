import Button from "@/components/Button";

type SidebarProps = {
  importedChats: string[];
};

export default function Sidebar({ importedChats }: SidebarProps) {
  return (
    <aside className="card flex h-full flex-col gap-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-indigo-300">Workspace</p>
        <h2 className="text-lg font-semibold">Portability</h2>
      </div>
      <Button className="w-full">New Import</Button>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">Imported chats</p>
        {importedChats.length === 0 ? (
          <p className="text-sm text-slate-400">No chats imported yet.</p>
        ) : (
          importedChats.map((chat) => (
            <div key={chat} className="rounded-lg border border-slate-700 p-2 text-sm">
              {chat}
            </div>
          ))
        )}
      </div>
      <div className="mt-auto space-y-2 text-sm text-slate-400">
        <p>Usage: 3/20 imports</p>
        <button className="text-left text-red-300">Logout</button>
      </div>
    </aside>
  );
}
