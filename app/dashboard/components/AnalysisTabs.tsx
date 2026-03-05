"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ExportPanel from "./ExportPanel";
import type { StructuredMemory } from "@/lib/extractor";
import type { ConversationAnalysis } from "@/lib/analyzer";

type AnalysisTabsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  compressionLevel: string;
  setCompressionLevel: (value: string) => void;
  analysis: ConversationAnalysis | null;
  memory: StructuredMemory | null;
  exportText: string;
  onExportChange: (model: string, compression: string) => Promise<void>;
  onCopy: () => void;
};

const tabs = ["Summary", "Detailed", "Key Points", "Memory", "Export"];

const memorySections: [string, keyof StructuredMemory][] = [
  ["Overview", "overview"],
  ["Decisions", "decisions"],
  ["Key topics", "topics"],
  ["Code references", "code_references"],
  ["Assumptions", "assumptions"],
  ["Open questions", "unresolved_questions"],
  ["Action items", "action_items"],
  ["Important points", "important_points"],
];

function MemorySection({ label, value }: { label: string; value: string | string[] | undefined }) {
  const [open, setOpen] = useState(true);
  const items = Array.isArray(value) ? value : value ? [value] : [];
  if (items.length === 0 || (items.length === 1 && !items[0])) return null;

  return (
    <div>
      <button className="section-toggle transition-colors" onClick={() => setOpen(o => !o)} style={{ outline: "none" }}>
        <span>{label}</span>
        <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{open ? "collapse" : "expand"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-2 pb-4">
              {Array.isArray(value) ? (
                <ul className="space-y-1.5">
                  {(value as string[]).map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--text-muted)", marginTop: "1px" }}>—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{value as string}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Shared highlighted copy button — same look as Export's "Copy context pack"
function CopyButton({ getText, label = "Copy" }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = getText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={() => void handleCopy()}
      className="rounded-md px-4 py-2 text-sm font-medium transition-all"
      style={{
        background: copied ? "var(--accent)" : "var(--accent-muted)",
        border: "1px solid var(--accent-border)",
        color: copied ? "#0a0f0a" : "var(--accent)",
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export default function AnalysisTabs(props: AnalysisTabsProps) {
  const isEmpty = !props.analysis && !props.memory;

  const handleModelChange = async (model: string) => {
    props.setSelectedModel(model);
    await props.onExportChange(model, props.compressionLevel);
  };

  const handleCompressionChange = async (compression: string) => {
    props.setCompressionLevel(compression);
    await props.onExportChange(props.selectedModel, compression);
  };

  const getSummaryText = () => props.analysis?.summary ?? "";
  const getDetailedText = () => props.analysis?.detailed ?? "";
  const getKeyPointsText = () =>
    (props.analysis?.keyPoints ?? []).map((p, i) => `${i + 1}. ${p}`).join("\n");
  const getMemoryText = () => {
    if (!props.memory) return "";
    const sections = [
      ["Overview", props.memory.overview],
      ["Topics", props.memory.topics],
      ["Decisions", props.memory.decisions],
      ["Important Points", props.memory.important_points],
      ["Code References", props.memory.code_references],
      ["Assumptions", props.memory.assumptions],
      ["Unresolved Questions", props.memory.unresolved_questions],
      ["Action Items", props.memory.action_items],
    ] as [string, string | string[]][];
    return sections
      .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
      .map(([label, v]) => {
        const items = Array.isArray(v) ? v.map(i => `  - ${i}`).join("\n") : v;
        return `${label}:\n${items}`;
      })
      .join("\n\n");
  };

  return (
    <section className="card flex h-full flex-col" style={{ overflow: "hidden" }}>
      {/* Underline tabs */}
      <div className="flex gap-5 px-5 pt-4" style={{ borderBottom: "1px solid var(--surface-border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => props.setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors ${props.activeTab === tab ? "tab-active" : "tab-inactive"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isEmpty ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Import a conversation to see its analysis here.
          </p>
        ) : (
          <>
            {props.activeTab === "Summary" && (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {props.analysis?.summary ?? "No summary available."}
                </p>
                <CopyButton getText={getSummaryText} label="Copy summary" />
              </div>
            )}

            {props.activeTab === "Detailed" && (
              <div className="space-y-4">
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {(props.analysis?.detailed ?? "No detailed analysis available.")
                    .split("\n\n")
                    .map((p, i) => <p key={i}>{p}</p>)}
                </div>
                <CopyButton getText={getDetailedText} label="Copy analysis" />
              </div>
            )}

            {props.activeTab === "Key Points" && (
              <div className="space-y-4">
                <ul className="space-y-2">
                  {(props.analysis?.keyPoints ?? []).length > 0 ? (
                    props.analysis!.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                        <span>{point}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm" style={{ color: "var(--text-muted)" }}>No key points extracted.</li>
                  )}
                </ul>
                <CopyButton getText={getKeyPointsText} label="Copy key points" />
              </div>
            )}

            {props.activeTab === "Memory" && props.memory && (
              <div className="space-y-0">
                {memorySections.map(([label, key]) => (
                  <MemorySection key={key} label={label} value={props.memory![key] as string | string[]} />
                ))}
                <div className="pt-4">
                  <CopyButton getText={getMemoryText} label="Copy memory pack" />
                </div>
              </div>
            )}

            {props.activeTab === "Export" && (
              <ExportPanel
                selectedModel={props.selectedModel}
                setSelectedModel={(m) => void handleModelChange(m)}
                compressionLevel={props.compressionLevel}
                setCompressionLevel={(c) => void handleCompressionChange(c)}
                exportText={props.exportText}
                onCopy={props.onCopy}
                memory={props.memory}
                analysis={props.analysis}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
