import { MODEL_CONTEXT_LIMITS } from "@/lib/tokenizer";

type ExportPanelProps = {
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  compressionLevel: string;
  setCompressionLevel: (value: string) => void;
  exportText: string;
  onCopy: () => void;
};

const MODEL_URLS: Record<string, string> = {
  GPT: "https://chat.openai.com/",
  Claude: "https://claude.ai/",
  Gemini: "https://gemini.google.com/",
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

  const selectStyle = {
    width: "100%",
    borderRadius: "6px",
    border: "1px solid var(--surface-border)",
    background: "var(--surface)",
    color: "var(--text-primary)",
    padding: "7px 10px",
    fontSize: "13px",
    outline: "none",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs" style={{ color: "var(--text-muted)" }}>Target model</label>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={selectStyle}>
            {["GPT", "Gemini", "Claude"].map((model) => (
              <option key={model}>{model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs" style={{ color: "var(--text-muted)" }}>Compression</label>
          <select value={compressionLevel} onChange={(e) => setCompressionLevel(e.target.value)} style={selectStyle}>
            {["Compact", "Balanced", "Detailed"].map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>~{estimatedTokens.toLocaleString()} tokens</p>
          <p className="text-xs font-medium" style={{ color: fit ? "var(--accent)" : "#f87171" }}>
            {fit ? "Fits in context" : "May exceed limit"}
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${usage}%`, background: fit ? "var(--accent)" : "#f87171" }}
          />
        </div>
        <p className="mt-1 text-right text-xs" style={{ color: "var(--text-muted)" }}>
          {contextLimit.toLocaleString()} limit ({selectedModel})
        </p>
      </div>

      <textarea
        readOnly
        className="w-full resize-none rounded-lg p-3 font-mono text-xs leading-relaxed focus:outline-none"
        style={{
          height: "160px",
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          color: "var(--text-secondary)",
        }}
        value={exportText || "Extract a conversation first to build a context pack."}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onCopy}
          disabled={!exportText}
          className="rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ background: "var(--accent-muted)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}
        >
          Copy context pack
        </button>

        {exportText && (
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`}
            download="context-pack.txt"
            className="rounded-md px-4 py-2 text-sm transition-colors"
            style={{ background: "var(--surface-border)", color: "var(--text-secondary)" }}
          >
            Download .txt
          </a>
        )}
      </div>

      {/* Continue in model buttons */}
      {exportText && (
        <div>
          <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>Continue in</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MODEL_URLS).map(([model, url]) => (
              <a
                key={model}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: "var(--surface-border)", color: "var(--text-secondary)", border: "1px solid var(--surface-border)" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--surface-border)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
                }}
              >
                {model}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
