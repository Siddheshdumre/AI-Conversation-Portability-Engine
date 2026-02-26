import ExportPanel from "./ExportPanel";

type AnalysisTabsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  compressionLevel: string;
  setCompressionLevel: (value: string) => void;
  onCopy: () => void;
};

const tabs = ["Summary", "Detailed", "Key Points", "Structured Memory", "Export"];

export default function AnalysisTabs(props: AnalysisTabsProps) {
  const exportText = `Model: ${props.selectedModel}\nCompression: ${props.compressionLevel}\n\nContinue from this session with preserved user goals, open tasks, and assistant commitments.`;

  return (
    <section className="card h-full p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => props.setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              props.activeTab === tab ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {props.activeTab === "Summary" && <p className="text-sm text-slate-200">This conversation focuses on building a frontend MVP for a structured conversation portability workflow with import, analysis, and export capabilities.</p>}
      {props.activeTab === "Detailed" && <p className="text-sm text-slate-200">Detailed analysis includes architecture decisions, UX expectations, state handling strategy, and edge-case safeguards for invalid links and timeout states.</p>}
      {props.activeTab === "Key Points" && <ul className="list-disc space-y-2 pl-4 text-sm text-slate-200"><li>Structured import flow with progress tracking</li><li>Chat preview with role-based alignment</li><li>Model-aware export controls</li></ul>}
      {props.activeTab === "Structured Memory" && <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-200">{`{
  "user_goals": ["Import chat links", "Generate summary"],
  "assistant_commitments": ["Render preview", "Provide export prompt"],
  "open_tasks": ["Connect real API", "Persist history"]
}`}</pre>}
      {props.activeTab === "Export" && (
        <ExportPanel
          selectedModel={props.selectedModel}
          setSelectedModel={props.setSelectedModel}
          compressionLevel={props.compressionLevel}
          setCompressionLevel={props.setCompressionLevel}
          exportText={exportText}
          onCopy={props.onCopy}
        />
      )}
    </section>
  );
}
