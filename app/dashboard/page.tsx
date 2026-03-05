"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import ChatPreview from "./components/ChatPreview";
import AnalysisTabs from "./components/AnalysisTabs";
import StatsBar from "./components/StatsBar";
import Toast from "@/components/Toast";
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
  "Fetching conversation",
  "Parsing messages",
  "Extracting structured memory",
  "Optimising for export",
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

  // True once we have content — triggers layout shift from centered → top bar
  const hasContent = loading || !!memory || !!analysis || messages.length > 0;

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.history) setImportedChats(data.history);
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
      setMessages([]);
      setActiveTab("Summary");
    } catch (err: any) {
      setError(err.message || "Failed to load chat data.");
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

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, loadingSteps.length - 1));
    }, 1800);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: chatLink.trim() }),
      });

      const data = await res.json() as {
        success?: boolean;
        error?: string;
        code?: string;
        messages?: Message[];
        memory?: StructuredMemory;
        analysis?: ConversationAnalysis;
        exportText?: string;
        tokenCount?: number;
        conversationStats?: { totalTokens: number };
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Import failed. Please try again.");
        return;
      }

      setMessages(data.messages ?? []);
      setMemory(data.memory ?? null);
      setAnalysis(data.analysis ?? null);
      setExportText(data.exportText ?? "");
      setTokenCount(data.conversationStats?.totalTokens ?? data.tokenCount ?? 0);

      fetch("/api/history")
        .then((r) => r.json())
        .then((d) => { if (d.history) setImportedChats(d.history); });

      setActiveTab("Summary");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }, [canImport, chatLink]);

  const compressedTokens = Math.ceil(exportText.length / 4);

  // The shared import bar (reused in both positions)
  const ImportBar = (
    <motion.div layoutId="import-bar" className="flex gap-3 w-full" transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <input
        value={chatLink}
        onChange={(e) => setChatLink(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void runImport()}
        placeholder="Paste a ChatGPT, Claude, or Gemini share link"
        className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--surface-border)",
          color: "var(--text-primary)",
        }}
        autoFocus={!hasContent}
        aria-label="Chat link"
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => void runImport()}
        disabled={loading}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 shrink-0"
        style={{ background: "var(--accent)", color: "#0a0f0a" }}
      >
        {loading ? "Extracting..." : "Extract"}
      </motion.button>
    </motion.div>
  );

  return (
    <main className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 shrink-0 h-full overflow-hidden">
        <Sidebar importedChats={importedChats} onSelectChat={loadChat} />
      </div>

      {/* Main workspace */}
      <div className="relative flex flex-1 flex-col overflow-hidden">

        {/* ── STATE A: blank / centered ── */}
        <AnimatePresence mode="popLayout">
          {!hasContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center px-8 gap-6"
            >
              <div className="text-center space-y-2 mb-4">
                <motion.h2 layoutId="heading" className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Extract memory from a conversation
                </motion.h2>
                <motion.p layoutId="sub" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Paste a share link from ChatGPT, Claude, or Gemini below.
                </motion.p>
              </div>

              <div className="w-full max-w-2xl space-y-3">
                {ImportBar}
                {error && (
                  <div
                    className="rounded-lg px-4 py-3 text-sm"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }}
                  >
                    {error}{" "}
                    <button className="underline" onClick={() => void runImport()}>Retry</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATE B: processing / results ── */}
        {hasContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Top import bar */}
            <div className="shrink-0 px-6 pt-5 pb-4 space-y-3">
              {ImportBar}

              {/* Loading steps */}
              {loading && (
                <div className="space-y-1.5 pt-1">
                  {loadingSteps.map((step, idx) => (
                    <p
                      key={step}
                      className={`text-xs transition-all duration-300 ${idx < stepIndex ? "step-done" : idx === stepIndex ? "step-active" : "step-pending"
                        }`}
                    >
                      {step}
                    </p>
                  ))}
                </div>
              )}

              {/* Stats bar */}
              {!loading && tokenCount > 0 && (
                <StatsBar
                  rawTokens={tokenCount}
                  compressedTokens={compressedTokens}
                  selectedModel={selectedModel}
                />
              )}

              {/* Error */}
              {error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }}
                >
                  {error}{" "}
                  <button className="underline" onClick={() => void runImport()}>Retry</button>
                </div>
              )}
            </div>

            {/* Content: Analysis (main) + Chat (secondary right) */}
            <div className="flex flex-1 gap-4 overflow-hidden px-6 pb-6">
              <div className="flex-1 overflow-hidden">
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
                        body: JSON.stringify({ 
                          memory, 
                          analysis,
                          model, 
                          compression,
                          format: "prompt" 
                        }),
                      });
                      const data = await res.json() as { exportText?: string };
                      if (data.exportText) setExportText(data.exportText);
                    } catch { /* silent */ }
                  }}
                  onCopy={async () => {
                    await navigator.clipboard.writeText(exportText);
                    setToast(true);
                    setTimeout(() => setToast(false), 1600);
                  }}
                />
              </div>
              <div className="w-72 shrink-0 overflow-hidden">
                <ChatPreview messages={messages} defaultExpanded />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {toast && <Toast message="Copied to clipboard" />}
    </main>
  );
}
