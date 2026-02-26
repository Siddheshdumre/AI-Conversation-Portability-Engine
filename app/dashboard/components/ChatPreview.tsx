type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPreview({ messages }: { messages: Message[] }) {
  return (
    <section className="card flex h-full flex-col p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Chat Preview</h3>
      <div className="space-y-3 overflow-y-auto">
        {messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
              message.role === "user"
                ? "ml-auto bg-indigo-500/20 text-indigo-100"
                : "bg-slate-800 text-slate-100"
            }`}
          >
            {message.content.includes("```") ? (
              <pre className="overflow-x-auto rounded bg-black/40 p-2 text-xs">{message.content}</pre>
            ) : (
              message.content
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
