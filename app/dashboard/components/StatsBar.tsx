import { MODEL_CONTEXT_LIMITS } from "@/lib/tokenizer";
import { motion } from "framer-motion";

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
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
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
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{ width: `${100 - reduction}%` }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full"
                            style={{ background: "var(--accent)" }}
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
                        <motion.span
                            key={model}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={
                                fits
                                    ? { background: "rgba(163,230,53,0.12)", color: "var(--accent)", border: "1px solid var(--accent-border)" }
                                    : { background: "var(--surface-border)", color: "var(--text-muted)" }
                            }
                        >
                            {model}
                        </motion.span>
                    );
                })}
            </div>
        </motion.div>
    );
}
