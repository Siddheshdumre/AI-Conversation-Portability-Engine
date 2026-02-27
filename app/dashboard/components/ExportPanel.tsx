import Button from "@/components/Button";
import { MODEL_CONTEXT_LIMITS } from "@/lib/tokenizer";

type ExportPanelProps = {
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  compressionLevel: string;
  setCompressionLevel: (value: string) => void;
  exportText: string;
  onCopy: () => void;
};

export default function ExportPanel({
  selectedModel,
  setSelectedModel,
  compressionLevel,
  setCompressionLevel,
  exportText,
  onCopy,
}: ExportPanelProps) {
  const estimatedTokens = Math.ceil(exportText.length / 4);
  const contextLimit = MODEL_CONTEXT_LIMITS[selectedModel] ?? 128_000;
  const usage = Math.min((estimatedTokens / contextLimit) * 100, 100);
  const fit = estimatedTokens < contextLimit;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Target Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            {["GPT", "Gemini", "Claude"].map((model) => (
              <option key={model}>{model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Compression</label>
          <select
            value={compressionLevel}
            onChange={(e) => setCompressionLevel(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            {["Compact", "Balanced", "Detailed"].map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            ~{estimatedTokens.toLocaleString()} tokens
          </p>
          <p className={`text-xs font-medium ${fit ? "text-emerald-400" : "text-red-400"}`}>
            {fit ? "✓ Fits in context" : "⚠ May exceed limit"}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${fit ? "bg-indigo-400" : "bg-red-400"}`}
            style={{ width: `${usage}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">
          {contextLimit.toLocaleString()} token limit ({selectedModel})
        </p>
      </div>

      <textarea
        readOnly
        className="h-48 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 focus:outline-none"
        value={exportText || "Import a conversation first to generate an export prompt."}
      />

      <div className="flex gap-3">
        <Button onClick={onCopy} disabled={!exportText}>
          Copy
        </Button>
        {exportText && (
          <a
            className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`}
            download="conversation-export.txt"
          >
            Download .txt
          </a>
        )}
      </div>
    </div>
  );
}
