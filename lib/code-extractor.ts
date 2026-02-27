export type ExtractedCodeBlock = {
    language: string;
    code: string;
    tokenCount: number;
    messageIndex: number;
    summary?: string;
};

/**
 * Extracts all fenced code blocks from a list of messages.
 * Each block is tagged with the message index it came from.
 */
export function extractCodeBlocks(
    messages: Array<{ role: string; content: string }>
): ExtractedCodeBlock[] {
    const blocks: ExtractedCodeBlock[] = [];
    // Matches ```lang\n...code...\n``` (greedy, multiline)
    const FENCE_REGEX = /```([a-zA-Z0-9._-]*)\n?([\s\S]*?)```/g;

    for (let i = 0; i < messages.length; i++) {
        const content = messages[i].content;
        let match: RegExpExecArray | null;
        FENCE_REGEX.lastIndex = 0;

        while ((match = FENCE_REGEX.exec(content)) !== null) {
            const language = match[1].trim() || "text";
            const code = match[2].trim();
            if (code.length < 20) continue; // skip tiny snippets like single-liners

            blocks.push({
                language,
                code,
                tokenCount: Math.ceil(code.length / 4),
                messageIndex: i,
            });
        }
    }

    return blocks;
}

/**
 * Deduplicates code blocks by similarity (exact + near-duplicate).
 * Two blocks are considered duplicates if they share > 80% of their lines.
 */
export function deduplicateCodeBlocks(blocks: ExtractedCodeBlock[]): ExtractedCodeBlock[] {
    const seen: ExtractedCodeBlock[] = [];

    for (const block of blocks) {
        const isDup = seen.some((s) => cosineSimilarityLines(s.code, block.code) > 0.8);
        if (!isDup) seen.push(block);
    }

    return seen;
}

/**
 * Returns the top N most significant code blocks by size (a proxy for importance).
 * In future, this can be replaced by embedding-based relevance scoring.
 */
export function selectTopCodeBlocks(
    blocks: ExtractedCodeBlock[],
    maxTokens: number
): ExtractedCodeBlock[] {
    // Sort by size descending (larger blocks = more content = more important)
    const sorted = [...blocks].sort((a, b) => b.tokenCount - a.tokenCount);
    const selected: ExtractedCodeBlock[] = [];
    let budget = maxTokens;

    for (const block of sorted) {
        if (budget - block.tokenCount < 0) continue;
        selected.push(block);
        budget -= block.tokenCount;
    }

    // Re-sort by original message order for readability
    return selected.sort((a, b) => a.messageIndex - b.messageIndex);
}

/**
 * Generates a compact one-line description of a code block for memory references.
 */
export function summarizeCodeBlock(block: ExtractedCodeBlock): string {
    const lines = block.code.split("\n").filter((l) => l.trim());
    const firstMeaningfulLine = lines.find(
        (l) => !l.startsWith("//") && !l.startsWith("#") && !l.startsWith("*") && l.trim().length > 5
    ) ?? lines[0] ?? "";

    const preview = firstMeaningfulLine.slice(0, 60).trim();
    return `[${block.language || "code"}] ${preview}${preview.length >= 60 ? "…" : ""}`;
}

/** Simple line-overlap similarity between two code strings */
function cosineSimilarityLines(a: string, b: string): number {
    const linesA = new Set(a.split("\n").map((l) => l.trim()).filter(Boolean));
    const linesB = new Set(b.split("\n").map((l) => l.trim()).filter(Boolean));
    if (linesA.size === 0 || linesB.size === 0) return 0;

    let overlap = 0;
    for (const line of linesA) {
        if (linesB.has(line)) overlap++;
    }

    return overlap / Math.max(linesA.size, linesB.size);
}
