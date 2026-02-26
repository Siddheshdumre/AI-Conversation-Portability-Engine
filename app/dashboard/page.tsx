"use client";

import { useMemo, useState } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import Toast from "@/components/Toast";
import Sidebar from "./components/Sidebar";
import ChatPreview from "./components/ChatPreview";
import AnalysisTabs from "./components/AnalysisTabs";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const loadingSteps = ["Fetching conversation", "Parsing", "Extracting memory", "Generating summary"];

export default function DashboardPage() {
  const [chatLink, setChatLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [importedChats, setImportedChats] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("Summary");
  const [selectedModel, setSelectedModel] = useState("GPT");
  const [compressionLevel, setCompressionLevel] = useState("Balanced");
  const [toast, setToast] = useState(false);

  const canImport = useMemo(() => /^https?:\/\/.+/.test(chatLink), [chatLink]);

  const runImport = async () => {
    if (!canImport) {
      setError("Please enter a valid URL.");
      return;
    }

    setError(null);
    setLoading(true);
    setStepIndex(0);

    for (let i = 0; i < loadingSteps.length; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStepIndex(i);
    }

    if (chatLink.includes("timeout")) {
      setLoading(false);
      setError("Import timed out. Please retry.");
      return;
    }

    const importedMessages: Message[] = [
      { role: "user", content: "I need an MVP dashboard for conversation portability." },
      { role: "assistant", content: "Absolutely. I will provide a structured UI and export-ready memory." },
      { role: "assistant", content: "```ts\nconst scope = ['summary', 'export'];\n```" },
    ];

    setMessages(importedMessages);
    setImportedChats((prev) => [new URL(chatLink).hostname, ...prev].slice(0, 7));
    setActiveTab("Summary");
    setLoading(false);
  };

  return (
    <main className="h-screen p-4 md:p-6">
      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_420px]">
        <Sidebar importedChats={importedChats} />

        <section className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={chatLink}
                onChange={(event) => setChatLink(event.target.value)}
                placeholder="Paste AI chat share link"
                aria-label="Chat link"
              />
              <Button onClick={runImport} disabled={loading}>
                {loading ? <><LoadingSpinner /> <span className="ml-2">Importing…</span></> : "Import"}
              </Button>
            </div>
            {loading && <p className="mt-2 text-xs text-slate-400">{loadingSteps[stepIndex]}…</p>}
            {error && (
              <div className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error} <button className="underline" onClick={runImport}>Retry</button>
              </div>
            )}
          </div>

          <div className="h-[calc(100vh-180px)] min-h-80">
            <ChatPreview messages={messages} />
          </div>
        </section>

        <AnalysisTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          compressionLevel={compressionLevel}
          setCompressionLevel={setCompressionLevel}
          onCopy={async () => {
            await navigator.clipboard.writeText("Export copied");
            setToast(true);
            setTimeout(() => setToast(false), 1600);
          }}
        />
      </div>
      {toast && <Toast message="Copied to clipboard" />}
    </main>
  );
}
