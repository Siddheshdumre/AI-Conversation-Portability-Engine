import Groq from "groq-sdk";
import type { StructuredMemory } from "./extractor";

/**
 * Merges an array of per-chunk StructuredMemory objects into a single unified memory.
 *
 * Strategy:
 * - overview:               Generated from the first non-empty chunk
 * - topics / decisions /
 *   important_points /
 *   code_references /
 *   assumptions /
 *   unresolved_questions /
 *   action_items:           Collected from all chunks, then deduplicated
 *
 * Deduplication uses normalized string comparison (lowercased, stripped) to
 * remove near-identical items that OpenAI often repeats across chunk boundaries.
 */
export async function mergeMemories(memories: StructuredMemory[], client: Groq): Promise<StructuredMemory> {
    if (memories.length === 0) return emptyMemory();
    if (memories.length === 1) return memories[0];

    // For 2-3 chunks, standard string deduplication is usually fine, but 
    // since Groq is fast and cheap, we can use it to intelligently synthesize 
    // all chunk memories into one coherent master memory.

    // First, do a rough string merge to cut down tokens
    const roughMerge: StructuredMemory = {
        overview: memories.find((m) => m.overview?.trim())?.overview ?? "",
        topics: deduplicate(memories.flatMap((m) => m.topics)),
        decisions: deduplicate(memories.flatMap((m) => m.decisions)),
        important_points: deduplicate(memories.flatMap((m) => m.important_points)),
        code_references: deduplicate(memories.flatMap((m) => m.code_references)),
        assumptions: deduplicate(memories.flatMap((m) => m.assumptions)),
        unresolved_questions: deduplicate(memories.flatMap((m) => m.unresolved_questions)),
        action_items: deduplicate(memories.flatMap((m) => m.action_items)),
    };

    try {
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an AI tasked with intelligently merging structured memory arrays. Combine, deduplicate, and synthesize the provided JSON into a final, highly accurate JSON object with the exact same keys. Remove redundant points but KEEP all unique technical details."
                },
                {
                    role: "user",
                    content: `Synthesize this raw merged memory:\n\n${JSON.stringify(roughMerge)}`
                },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content ?? null;
        if (!content) return roughMerge;

        let cleanContent = content.trim();
        if (cleanContent.startsWith("\`\`\`json")) cleanContent = cleanContent.replace(/^\`\`\`json\s*/, "").replace(/\s*\`\`\`$/, "");
        else if (cleanContent.startsWith("\`\`\`")) cleanContent = cleanContent.replace(/^\`\`\`\s*/, "").replace(/\s*\`\`\`$/, "");

        const parsed = JSON.parse(cleanContent) as Partial<StructuredMemory>;
        return {
            overview: parsed.overview ?? roughMerge.overview,
            topics: Array.isArray(parsed.topics) ? parsed.topics : roughMerge.topics,
            decisions: Array.isArray(parsed.decisions) ? parsed.decisions : roughMerge.decisions,
            important_points: Array.isArray(parsed.important_points) ? parsed.important_points : roughMerge.important_points,
            code_references: Array.isArray(parsed.code_references) ? parsed.code_references : roughMerge.code_references,
            assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : roughMerge.assumptions,
            unresolved_questions: Array.isArray(parsed.unresolved_questions) ? parsed.unresolved_questions : roughMerge.unresolved_questions,
            action_items: Array.isArray(parsed.action_items) ? parsed.action_items : roughMerge.action_items,
        };
    } catch (err) {
        console.error("[merger] Synthesis LLM error, falling back to rough merge:", err);
        return roughMerge;
    }
}

/**
 * Hierarchical merge for very large conversations (80k+ tokens).
 */
export async function hierarchicalMerge(
    memories: StructuredMemory[],
    client: Groq,
    batchSize = 4
): Promise<StructuredMemory> {
    if (memories.length <= batchSize) {
        return mergeMemories(memories, client);
    }

    const batches: StructuredMemory[][] = [];
    for (let i = 0; i < memories.length; i += batchSize) {
        batches.push(memories.slice(i, i + batchSize));
    }

    const firstLevel = await Promise.all(batches.map(b => mergeMemories(b, client)));
    return hierarchicalMerge(firstLevel, client, batchSize);
}

/**
 * Deduplicates an array of strings using normalized comparison.
 *
 * Two strings are considered duplicates if their normalized form is identical
 * OR if one contains the other (substring dedup for rephrased items).
 */
function deduplicate(items: string[]): string[] {
    const seen: string[] = [];

    for (const item of items) {
        if (!item?.trim()) continue;
        const normalized = normalize(item);

        const isDuplicate = seen.some((s) => {
            const sNorm = normalize(s);
            return (
                sNorm === normalized ||
                sNorm.includes(normalized) ||
                normalized.includes(sNorm)
            );
        });

        if (!isDuplicate) {
            seen.push(item.trim());
        }
    }

    return seen;
}

function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")   // strip punctuation
        .replace(/\s+/g, " ")           // collapse whitespace
        .trim();
}

function emptyMemory(): StructuredMemory {
    return {
        overview: "",
        topics: [],
        decisions: [],
        important_points: [],
        code_references: [],
        assumptions: [],
        unresolved_questions: [],
        action_items: [],
    };
}
