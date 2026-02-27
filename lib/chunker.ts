import type { Message } from "./fetcher";
import { estimateTokens } from "./tokenizer";

export const CHUNK_TOKEN_BUDGET = 8_000;  // tokens per chunk sent to OpenAI
export const OVERLAP_MESSAGES = 5;       // messages shared between adjacent chunks
export const LARGE_CHAT_THRESHOLD = 20_000; // tokens above which we use chunked path

export type MessageChunk = {
    index: number;
    messages: Message[];
    tokenCount: number;
};

/**
 * Splits a conversation into overlapping chunks that each fit within the token budget.
 * Code blocks and multi-line assistant messages are always kept intact (never split mid-block).
 */
export function chunkMessages(messages: Message[]): MessageChunk[] {
    // If small enough, single chunk
    const total = messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
    if (total <= CHUNK_TOKEN_BUDGET) {
        return [{ index: 0, messages, tokenCount: total }];
    }

    const chunks: MessageChunk[] = [];
    let chunkStart = 0;
    let chunkIndex = 0;

    while (chunkStart < messages.length) {
        let tokenBudget = CHUNK_TOKEN_BUDGET;
        let chunkEnd = chunkStart;

        // Fill up to budget — never split in the middle of a fenced code block
        let insideCodeBlock = false;
        while (chunkEnd < messages.length) {
            const msg = messages[chunkEnd];
            const msgTokens = estimateTokens(msg.content) + 4;

            // Track code block boundaries
            const codeBlockCount = (msg.content.match(/```/g) ?? []).length;
            if (codeBlockCount % 2 !== 0) insideCodeBlock = !insideCodeBlock;

            if (tokenBudget - msgTokens < 0 && chunkEnd > chunkStart && !insideCodeBlock) {
                break; // Budget exceeded and not inside a code block — safe to cut here
            }
            tokenBudget -= msgTokens;
            chunkEnd++;
        }

        const sliced = messages.slice(chunkStart, chunkEnd);
        const usedTokens = CHUNK_TOKEN_BUDGET - tokenBudget;

        chunks.push({ index: chunkIndex, messages: sliced, tokenCount: usedTokens });
        chunkIndex++;

        // Move forward, keeping OVERLAP_MESSAGES of overlap for continuity
        const advance = Math.max(1, chunkEnd - chunkStart - OVERLAP_MESSAGES);
        chunkStart += advance;
    }

    return chunks;
}

/**
 * Returns the overall token strategy for a conversation.
 */
export function getConversationStats(messages: Message[]): {
    totalTokens: number;
    estimatedChunks: number;
    isLarge: boolean;
    strategy: "single" | "chunked" | "hierarchical";
} {
    const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
    const estimatedChunks = Math.ceil(totalTokens / (CHUNK_TOKEN_BUDGET * 0.85));
    const isLarge = totalTokens > LARGE_CHAT_THRESHOLD;

    let strategy: "single" | "chunked" | "hierarchical" = "single";
    if (totalTokens > 80_000) strategy = "hierarchical";
    else if (totalTokens > LARGE_CHAT_THRESHOLD) strategy = "chunked";

    return { totalTokens, estimatedChunks, isLarge, strategy };
}
