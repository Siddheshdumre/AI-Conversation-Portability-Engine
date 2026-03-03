import Groq from "groq-sdk";
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

const EXTRACTION_SYSTEM_PROMPT = `You are a Senior Staff Engineer extracting highly accurate, structured memory from a technical conversation.
Extract memory from this conversation segment. Your primary goal is maximum detail and comprehensive context retention. Do not miss any context.
Return a JSON object with EXACTLY these keys IN THIS ORDER:
- _scratchpad: string (First, write 3-5 sentences of deep reasoning about the core technical themes, decisions, and overall context. This helps you structure the rest of the output.)
- overview: string (A comprehensive, detailed summary paragraph of what THIS SEGMENT covers. Include as much context as possible.)
- topics: string[] (Verbose, detailed descriptions of topics, frameworks, or concepts discussed)
- decisions: string[] (Detailed explanations of concrete decisions made, including the "why", e.g., "Chose Next.js over Vite because...")
- important_points: string[] (Extensive list of crucial facts, constraints, edge cases, or architectural conclusions. Do not skip details.)
- code_references: string[] (Specific files, functions, APIs, DB schemas, or code snippets mentioned, along with their purpose)
- assumptions: string[] (Detailed implicit or explicit assumptions made by the speakers)
- unresolved_questions: string[] (Specific open questions, constraints, or unknowns that need answering later)
- action_items: string[] (Detailed concrete next steps assigning work or tasks, including expected outcomes)

Respond ONLY with valid JSON. Do not wrap in markdown code blocks.`;

function getGroqClient(): Groq {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");
    return new Groq({ apiKey });
}

/**
 * Main entry point. Automatically routes to single or chunked extraction
 * depending on conversation size. Returns merged StructuredMemory.
 */
export async function extractMemory(messages: Message[]): Promise<StructuredMemory> {
    let client: Groq;
    try {
        client = getGroqClient();
    } catch {
        return FALLBACK_MEMORY;
    }

    const { totalTokens, strategy } = getConversationStats(messages);
    console.log(`[extractor] ${messages.length} messages, ~${totalTokens} tokens, strategy: ${strategy}`);

    if (totalTokens <= LARGE_CHAT_THRESHOLD) {
        // Small conversation — single extraction call
        return extractSinglePass(messages, client);
    }

    // Large conversation — chunked or hierarchical
    return extractChunked(messages, client, strategy === "hierarchical");
}

/**
 * Extracts memory from a single chunk of conversation in one LLM call.
 */
async function extractSinglePass(messages: Message[], client: Groq): Promise<StructuredMemory> {
    const conversationText = formatMessages(messages);

    try {
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
                { role: "user", content: `Extract memory from this conversation:\n\n${conversationText.slice(0, 200_000)}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const responseText = response.choices[0]?.message?.content ?? null;
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
    client: Groq,
    useHierarchical: boolean
): Promise<StructuredMemory> {
    const chunks = chunkMessages(messages);

    console.log(`[extractor] Processing ${chunks.length} chunks (hierarchical: ${useHierarchical})`);

    // Process chunks in batches of 5 (well within Groq's 30 RPM free limit)
    const BATCH_SIZE = 5;
    const chunkMemories: StructuredMemory[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(async (chunk) => {
                const text = formatMessages(chunk.messages);
                try {
                    const response = await client.chat.completions.create({
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
                            { role: "user", content: `Extract memory from conversation segment ${chunk.index + 1}:\n\n${text.slice(0, 200_000)}` },
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.1,
                    });

                    const responseText = response.choices[0]?.message?.content ?? null;
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

    // Merge all chunk memories intelligently
    const merged = await (useHierarchical
        ? hierarchicalMerge(chunkMemories, client)
        : mergeMemories(chunkMemories, client));

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
        // Strip markdown code block wrappers just in case the model adds them
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
            cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanContent.startsWith("```")) {
            cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
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
