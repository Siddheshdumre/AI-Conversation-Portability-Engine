/**
 * Simple character-based token estimator.
 * Uses the ~4 chars/token heuristic (good enough for GPT-4 class models).
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(
    messages: Array<{ role: string; content: string }>
): number {
    return messages.reduce((total, msg) => total + estimateTokens(msg.content) + 4, 0);
}

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
    GPT: 128_000,
    Gemini: 1_000_000,
    Claude: 200_000,
};
