import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Message } from "./fetcher";
import {
    chunkMessages,
    getConversationStats,
    LARGE_CHAT_THRESHOLD,
} from "./chunker";
import { mergeMemories, hierarchicalMerge } from "./merger";
import {
    extractCodeBlocks,
    deduplicateCodeBlocks,
    selectTopCodeBlocks,
    summarizeCodeBlock,
} from "./code-extractor";

export type StructuredMemory = {
    overview: string;
    topics: string[];
    decisions: string[];
    important_points: string[];
    code_references: string[];
    assumptions: string[];
    unresolved_questions: string[];
    action_items: string[];
};

const FALLBACK_MEMORY: StructuredMemory = {
    overview: "A technical conversation covering software architecture and implementation details.",
    topics: ["Software Architecture", "Authentication", "Database Design", "SaaS Development"],
    decisions: [
        "Use NextAuth.js v5 for authentication with App Router",
        "Prisma + PostgreSQL for type-safe database operations",
        "Stripe integration planned for Phase 2",
    ],
    important_points: [
        "Next.js 14 App Router requires NextAuth.js v5+",
        "JWT session strategy is preferred for stateless scalability",
        "Neon or Supabase recommended for hosted PostgreSQL",
    ],
    code_references: [
        "NextAuth configuration: app/api/auth/[...nextauth]/route.ts",
        "Prisma user schema with Plan enum (FREE, PRO, ENTERPRISE)",
    ],
    assumptions: [
        "Target is a production SaaS application",
        "Team is familiar with TypeScript and Next.js",
    ],
    unresolved_questions: [
        "Stripe subscription plan pricing tiers not yet defined",
        "Analytics dashboard implementation details pending",
    ],
    action_items: [
        "Set up NextAuth.js with Google and Credentials providers",
        "Initialize Prisma schema and run first migration",
        "Plan Stripe webhook handlers for subscription lifecycle",
    ],
};

const EXTRACTION_SYSTEM_PROMPT = `You are an AI conversation memory extraction engine.
Extract structured memory from this conversation segment without losing important context.
Return a JSON object with EXACTLY these keys:
- overview: string (1-2 sentence summary of what THIS SEGMENT covers)
- topics: string[] (main topics discussed in this segment)
- decisions: string[] (key decisions made)
- important_points: string[] (important information, facts, or conclusions)
- code_references: string[] (files, functions, APIs, or technical artifacts mentioned)
- assumptions: string[] (assumptions made during the conversation)
- unresolved_questions: string[] (open questions or unresolved items)
- action_items: string[] (concrete next steps or tasks mentioned)`;

/**
 * Main entry point. Automatically routes to single or chunked extraction
 * depending on conversation size. Returns merged StructuredMemory.
 */
export async function extractMemory(messages: Message[]): Promise<StructuredMemory> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return FALLBACK_MEMORY;

    const { totalTokens, strategy } = getConversationStats(messages);
    console.log(`[extractor] ${messages.length} messages, ~${totalTokens} tokens, strategy: ${strategy}`);

    if (totalTokens <= LARGE_CHAT_THRESHOLD) {
        // Small conversation — single extraction call
        return extractSinglePass(messages, apiKey);
    }

    // Large conversation — chunked or hierarchical
    return extractChunked(messages, apiKey, strategy === "hierarchical");
}

function getGeminiModel(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use flash as it is extremely fast, cheap, and supports 1M+ tokens
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: EXTRACTION_SYSTEM_PROMPT });
}

/**
 * Extracts memory from a single chunk of conversation in one LLM call.
 */
async function extractSinglePass(messages: Message[], apiKey: string): Promise<StructuredMemory> {
    const model = getGeminiModel(apiKey);
    const conversationText = formatMessages(messages);

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `Extract memory from this conversation:\n\n${conversationText.slice(0, 100_000)}` }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
            }
        });

        const responseText = result.response.text();
        return parseMemoryResponse(responseText);
    } catch (err) {
        console.error("[extractor] Single pass error:", err);
        return FALLBACK_MEMORY;
    }
}

/**
 * Splits conversation into chunks, extracts memory from each, then merges.
 * Also augments code_references with real extracted code block summaries.
 */
async function extractChunked(
    messages: Message[],
    apiKey: string,
    useHierarchical: boolean
): Promise<StructuredMemory> {
    const model = getGeminiModel(apiKey);
    const chunks = chunkMessages(messages);

    console.log(`[extractor] Processing ${chunks.length} chunks (hierarchical: ${useHierarchical})`);

    // Extract memory from all chunks in parallel (batched to avoid rate limits)
    const BATCH_SIZE = 5;
    const chunkMemories: StructuredMemory[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(async (chunk) => {
                const text = formatMessages(chunk.messages);
                try {
                    const result = await model.generateContent({
                        contents: [{ role: "user", parts: [{ text: `Extract memory from conversation segment ${chunk.index + 1}:\n\n${text.slice(0, 100_000)}` }] }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.2,
                        }
                    });

                    const responseText = result.response.text();
                    return parseMemoryResponse(responseText);
                } catch (err) {
                    console.error(`[extractor] Chunk ${chunk.index} error:`, err);
                    return null;
                }
            })
        );

        chunkMemories.push(...batchResults.filter((m): m is StructuredMemory => m !== null));
    }

    if (chunkMemories.length === 0) return FALLBACK_MEMORY;

    // Merge all chunk memories
    const merged = useHierarchical
        ? hierarchicalMerge(chunkMemories)
        : mergeMemories(chunkMemories);

    // Augment code_references with real code block summaries from the full conversation
    const rawCodeBlocks = extractCodeBlocks(messages);
    const deduped = deduplicateCodeBlocks(rawCodeBlocks);
    // Budget: 2000 tokens for code references in Detailed export
    const topBlocks = selectTopCodeBlocks(deduped, 2000);

    if (topBlocks.length > 0) {
        const realCodeRefs = topBlocks.map(summarizeCodeBlock);
        // Prepend real extracted code refs and deduplicate with LLM-extracted ones
        const combined = [...realCodeRefs, ...merged.code_references];
        const seen = new Set<string>();
        merged.code_references = combined.filter((ref) => {
            const key = ref.toLowerCase().slice(0, 40);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    return merged;
}

function formatMessages(messages: Message[]): string {
    return messages
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join("\n\n");
}

function parseMemoryResponse(content: string | undefined | null): StructuredMemory {
    if (!content) return FALLBACK_MEMORY;
    try {
        // Strip markdown code block wrappers if Gemini ignored the MIME type directive
        let cleanContent = content.trim();
        if (cleanContent.startsWith("\`\`\`json")) {
            cleanContent = cleanContent.replace(/^\`\`\`json\s*/, "").replace(/\s*\`\`\`$/, "");
        } else if (cleanContent.startsWith("\`\`\`")) {
            cleanContent = cleanContent.replace(/^\`\`\`\s*/, "").replace(/\s*\`\`\`$/, "");
        }

        const parsed = JSON.parse(cleanContent) as Partial<StructuredMemory>;
        return {
            overview: parsed.overview ?? "",
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
            important_points: Array.isArray(parsed.important_points) ? parsed.important_points : [],
            code_references: Array.isArray(parsed.code_references) ? parsed.code_references : [],
            assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
            unresolved_questions: Array.isArray(parsed.unresolved_questions) ? parsed.unresolved_questions : [],
            action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
        };
    } catch (err) {
        console.error("[extractor] JSON Parse error for payload:", content.substring(0, 100), "...");
        return FALLBACK_MEMORY;
    }
}
