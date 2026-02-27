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

const tabs = ["Summary", "Detailed", "Key Points", "Structured Memory", "Export"];

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

  return (
    <section className="card flex h-full flex-col p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => props.setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${props.activeTab === tab
                ? "bg-indigo-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
            <p className="text-3xl">🧠</p>
            <p className="text-sm">Import a conversation to see analysis here.</p>
          </div>
        ) : (
          <>
            {props.activeTab === "Summary" && (
              <p className="text-sm leading-relaxed text-slate-200">
                {props.analysis?.summary ?? "No summary available."}
              </p>
            )}

            {props.activeTab === "Detailed" && (
              <div className="space-y-3 text-sm leading-relaxed text-slate-200">
                {(props.analysis?.detailed ?? "No detailed analysis available.")
                  .split("\n\n")
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </div>
            )}

            {props.activeTab === "Key Points" && (
              <ul className="space-y-2 pl-1 text-sm text-slate-200">
                {(props.analysis?.keyPoints ?? []).length > 0 ? (
                  props.analysis!.keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 text-indigo-400">▸</span>
                      <span>{point}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">No key points extracted.</li>
                )}
              </ul>
            )}

            {props.activeTab === "Structured Memory" && props.memory && (
              <div className="space-y-4 text-sm">
                {(
                  [
                    ["Overview", props.memory.overview],
                    ["Topics", props.memory.topics],
                    ["Decisions", props.memory.decisions],
                    ["Important Points", props.memory.important_points],
                    ["Code References", props.memory.code_references],
                    ["Assumptions", props.memory.assumptions],
                    ["Unresolved Questions", props.memory.unresolved_questions],
                    ["Action Items", props.memory.action_items],
                  ] as [string, string | string[]][]
                ).map(([label, value]) => {
                  const items = Array.isArray(value) ? value : [value];
                  if (items.length === 0 || (items.length === 1 && !items[0])) return null;
                  return (
                    <div key={label}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-400">
                        {label}
                      </p>
                      {Array.isArray(value) ? (
                        <ul className="space-y-1 text-slate-300">
                          {(value as string[]).map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-slate-500">–</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-300">{value as string}</p>
                      )}
                    </div>
                  );
                })}
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
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
