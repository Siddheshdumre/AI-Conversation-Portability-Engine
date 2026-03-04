"use client";
import { useState } from "react";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export default function ChatPreview({ messages, defaultExpanded = false }: { messages: Message[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasMessages = messages.length > 0;

  return (
    <section className="card flex h-full flex-col" style={{ overflow: "hidden" }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--surface-border)" }}>
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {hasMessages ? `${messages.length} messages` : "Conversation preview"}
        </p>
        {hasMessages && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            {expanded ? "Hide" : "Show original"}
          </button>
        )}
      </div>

      {!hasMessages && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Paste a share link above to preview the conversation.
          </p>
        </div>
      )}

      {hasMessages && expanded && (
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "ml-auto" : ""
                }`}
              style={
                message.role === "user"
                  ? { background: "var(--accent-muted)", border: "1px solid var(--accent-border)", color: "var(--text-primary)" }
                  : { background: "var(--surface-border)", color: "var(--text-secondary)" }
              }
            >
              {message.content.includes("```") ? (
                <pre className="overflow-x-auto rounded p-2 text-xs" style={{ background: "rgba(0,0,0,0.4)" }}>{message.content}</pre>
              ) : (
                message.content
              )}
            </div>
          ))}
        </div>
      )}

      {hasMessages && !expanded && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Conversation hidden. Click &quot;Show original&quot; to expand.
          </p>
        </div>
      )}
    </section>
  );
}
