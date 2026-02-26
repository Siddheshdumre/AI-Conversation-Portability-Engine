import Button from "@/components/Button";

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
  const estimatedTokens = Math.round(exportText.length / 4);
  const contextLimit = selectedModel === "GPT" ? 128000 : 100000;
  const fit = estimatedTokens < contextLimit;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select
          value={selectedModel}
          onChange={(event) => setSelectedModel(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          {['GPT','Gemini','Claude'].map((model) => <option key={model}>{model}</option>)}
        </select>
        <select
          value={compressionLevel}
          onChange={(event) => setCompressionLevel(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          {['Compact','Balanced','Detailed'].map((level) => <option key={level}>{level}</option>)}
        </select>
      </div>

      <div>
        <p className="mb-1 text-xs text-slate-400">Estimated export size: {estimatedTokens.toLocaleString()} tokens</p>
        <div className="h-2 w-full rounded bg-slate-800">
          <div className="h-full rounded bg-indigo-400" style={{ width: `${Math.min((estimatedTokens / contextLimit) * 100, 100)}%` }} />
        </div>
        <p className={`mt-1 text-xs ${fit ? 'text-emerald-300' : 'text-red-300'}`}>
          {fit ? 'Fits within model context window' : 'May exceed context limit'}
        </p>
      </div>

      <textarea readOnly className="h-52 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm" value={exportText} />
      <div className="flex gap-3">
        <Button onClick={onCopy}>Copy</Button>
        <a
          className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm"
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`}
          download="conversation-export.txt"
        >
          Download
        </a>
      </div>
    </div>
  );
}
