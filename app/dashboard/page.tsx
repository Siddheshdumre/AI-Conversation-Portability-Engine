"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import Toast from "@/components/Toast";
import Sidebar from "./components/Sidebar";
import ChatPreview from "./components/ChatPreview";
import AnalysisTabs from "./components/AnalysisTabs";
import type { StructuredMemory } from "@/lib/extractor";
import type { ConversationAnalysis } from "@/lib/analyzer";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ImportedChat = {
  id?: string;
  title: string;
  url: string;
  tokenCount: number;
  createdAt?: string;
};

const loadingSteps = [
  "Fetching conversation…",
  "Parsing messages…",
  "Extracting memory…",
  "Generating analysis…",
];

export default function DashboardPage() {
  const [chatLink, setChatLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memory, setMemory] = useState<StructuredMemory | null>(null);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [exportText, setExportText] = useState("");
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [importedChats, setImportedChats] = useState<ImportedChat[]>([]);
  const [activeTab, setActiveTab] = useState("Summary");
  const [selectedModel, setSelectedModel] = useState("GPT");
  const [compressionLevel, setCompressionLevel] = useState("Balanced");
  const [toast, setToast] = useState(false);
  const [isDemoData, setIsDemoData] = useState(false);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setImportedChats(data.history);
        }
      })
      .catch((err) => console.error("Failed to load history", err));
  }, []);

  const loadChat = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      setStepIndex(3);
      const res = await fetch(`/api/history/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load chat");

      const chat = data.chat;
      setChatLink(chat.url);
      setMemory(chat.memory);
      setAnalysis(chat.analysis);
      setTokenCount(chat.tokenCount);
      // We don't save full messages array in DB to save space, only memory and analysis.
      // So chat preview might be empty when loaded from history unless we re-fetch chunks.
      // For now, we just clear messages to focus on analysis tabs.
      setMessages([]);
      setIsDemoData(false);
      setActiveTab("Summary");
    } catch (err: any) {
      setError(err.message || "Failed to load chat data from history.");
    } finally {
      setLoading(false);
    }
  }, []);

  const canImport = useMemo(() => /^https?:\/\/.+/.test(chatLink.trim()), [chatLink]);

  const runImport = useCallback(async () => {
    if (!canImport) {
      setError("Please enter a valid URL.");
      return;
    }

    setError(null);
    setLoading(true);
    setStepIndex(0);

    // Animate through loading steps
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, loadingSteps.length - 1));
    }, 1200);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: chatLink.trim() }),
      });

      const data = await res.json() as {
        success?: boolean;
        error?: string;
        messages?: Message[];
        memory?: StructuredMemory;
        analysis?: ConversationAnalysis;
        exportText?: string;
        tokenCount?: number;
        isDemoData?: boolean;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Import failed. Please try again.");
        return;
      }

      setMessages(data.messages ?? []);
      setMemory(data.memory ?? null);
      setAnalysis(data.analysis ?? null);
      setExportText(data.exportText ?? "");
      setTokenCount(data.tokenCount ?? 0);
      setIsDemoData(data.isDemoData ?? false);

      const title = data.memory?.overview?.slice(0, 48) ?? new URL(chatLink.trim()).hostname;

      // Re-fetch history to get the newly created ID
      fetch("/api/history")
        .then((res) => res.json())
        .then((d) => {
          if (d.history) {
            setImportedChats(d.history);
          }
        });
      setActiveTab("Summary");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }, [canImport, chatLink]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") void runImport();
    },
    [runImport]
  );

  return (
    <main className="h-screen p-4 md:p-6">
      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_420px]">
        <Sidebar importedChats={importedChats} onSelectChat={loadChat} />

        <section className="space-y-4 overflow-hidden">
          <div className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={chatLink}
                onChange={(e) => setChatLink(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste AI chat share link (e.g. chatgpt.com/share/...)"
                aria-label="Chat link"
              />
              <Button onClick={() => void runImport()} disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Importing…</span>
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>

            {loading && (
              <div className="mt-3 space-y-1">
                {loadingSteps.map((step, idx) => (
                  <p
                    key={step}
                    className={`text-xs transition-opacity duration-300 ${idx <= stepIndex ? "text-indigo-300 opacity-100" : "text-slate-500 opacity-40"
                      }`}
                  >
                    {idx < stepIndex ? "✓" : idx === stepIndex ? "⏳" : "○"} {step}
                  </p>
                ))}
              </div>
            )}

            {isDemoData && !loading && messages.length > 0 && (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ⚠ Demo data shown — add your OpenAI key in <code>.env.local</code> and paste a real ChatGPT share link to analyse your conversations.
              </p>
            )}

            {error && (
              <div className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error}{" "}
                <button className="underline" onClick={() => void runImport()}>
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="h-[calc(100vh-220px)] min-h-80">
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
          analysis={analysis}
          memory={memory}
          exportText={exportText}
          onExportChange={async (model, compression) => {
            if (!memory) return;
            try {
              const res = await fetch("/api/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memory, model, compression }),
              });
              const data = await res.json() as { exportText?: string };
              if (data.exportText) setExportText(data.exportText);
            } catch {
              // silently ignore
            }
          }}
          onCopy={async () => {
            await navigator.clipboard.writeText(exportText);
            setToast(true);
            setTimeout(() => setToast(false), 1600);
          }}
        />
      </div>
      {toast && <Toast message="Copied to clipboard" />}
    </main>
  );
}
