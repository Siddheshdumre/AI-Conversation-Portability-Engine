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
export function mergeMemories(memories: StructuredMemory[]): StructuredMemory {
    if (memories.length === 0) {
        return emptyMemory();
    }
    if (memories.length === 1) {
        return memories[0];
    }

    const overview = memories.find((m) => m.overview?.trim())?.overview ?? "";

    return {
        overview,
        topics: deduplicate(memories.flatMap((m) => m.topics)),
        decisions: deduplicate(memories.flatMap((m) => m.decisions)),
        important_points: deduplicate(memories.flatMap((m) => m.important_points)),
        code_references: deduplicate(memories.flatMap((m) => m.code_references)),
        assumptions: deduplicate(memories.flatMap((m) => m.assumptions)),
        unresolved_questions: deduplicate(memories.flatMap((m) => m.unresolved_questions)),
        action_items: deduplicate(memories.flatMap((m) => m.action_items)),
    };
}

/**
 * Hierarchical merge for very large conversations (80k+ tokens).
 * Groups memories into batches, merges each batch, then merges the results.
 * This prevents the merged overview from becoming incoherent.
 */
export function hierarchicalMerge(
    memories: StructuredMemory[],
    batchSize = 4
): StructuredMemory {
    if (memories.length <= batchSize) {
        return mergeMemories(memories);
    }

    // Split into batches
    const batches: StructuredMemory[][] = [];
    for (let i = 0; i < memories.length; i += batchSize) {
        batches.push(memories.slice(i, i + batchSize));
    }

    // First-level merge
    const firstLevel = batches.map(mergeMemories);

    // Second-level merge (recursive so it works for any depth)
    return hierarchicalMerge(firstLevel, batchSize);
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
