import { MODEL_CONTEXT_LIMITS } from "@/lib/tokenizer";

type StatsBarProps = {
    rawTokens: number;
    compressedTokens: number;
    selectedModel: string;
};

export default function StatsBar({ rawTokens, compressedTokens, selectedModel }: StatsBarProps) {
    if (!rawTokens) return null;

    const reduction = rawTokens > 0 ? Math.round(((rawTokens - compressedTokens) / rawTokens) * 100) : 0;
    const contextLimit = MODEL_CONTEXT_LIMITS[selectedModel] ?? 128_000;
    const models = ["GPT", "Claude", "Gemini"];

    return (
        <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg px-4 py-3 text-xs"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--surface-border)" }}
        >
            <div>
                <span style={{ color: "var(--text-muted)" }}>Context size</span>{" "}
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>~{rawTokens.toLocaleString()} tokens</span>
            </div>

            {reduction > 0 && (
                <div className="flex items-center gap-2">
                    <span style={{ color: "var(--text-muted)" }}>Compressed</span>
                    <div className="flex h-1.5 w-20 overflow-hidden rounded-full" style={{ background: "var(--surface-border)" }}>
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${100 - reduction}%`, background: "var(--accent)" }}
                        />
                    </div>
                    <span className="font-medium" style={{ color: "var(--accent)" }}>{reduction}% smaller</span>
                </div>
            )}

            <div className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }}>Model fit</span>
                {models.map(model => {
                    const limit = MODEL_CONTEXT_LIMITS[model] ?? 128_000;
                    const fits = compressedTokens < limit;
                    return (
                        <span
                            key={model}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={
                                fits
                                    ? { background: "rgba(163,230,53,0.12)", color: "var(--accent)", border: "1px solid var(--accent-border)" }
                                    : { background: "var(--surface-border)", color: "var(--text-muted)" }
                            }
                        >
                            {model}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
