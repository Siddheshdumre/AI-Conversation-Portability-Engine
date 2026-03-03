import { NextRequest, NextResponse } from "next/server";
import { fetchConversationWithMeta } from "@/lib/fetcher";
import { extractMemory } from "@/lib/extractor";
import { generateAnalysis } from "@/lib/analyzer";
import { compressForExport } from "@/lib/compressor";
import { estimateMessagesTokens } from "@/lib/tokenizer";
import { getConversationStats } from "@/lib/chunker";

// Vercel hobby plan max is 60s. We need this because Puppeteer + Groq takes ~20s.
// Without this, Vercel will kill the request after 10s or 15s and return a 504.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { url?: string };
        const { url } = body;

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "URL is required." }, { status: 400 });
        }

        // Basic URL validation
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
        }

        // Warn but don't block — allow any URL for demo purposes
        const isShareLink =
            parsedUrl.hostname.includes("chatgpt.com") ||
            parsedUrl.hostname.includes("chat.openai.com");

        if (!isShareLink) {
            console.warn("Non-ChatGPT URL submitted:", url);
        }

        // Step 1: Fetch & parse conversation
        const fetchResult = await fetchConversationWithMeta(url);
        const messages = fetchResult.messages;

        if (messages.length === 0) {
            const errorMessage =
                fetchResult.isDemo && fetchResult.reason
                    ? fetchResult.reason
                    : "Could not extract messages from this link. It may be private or unsupported.";
            return NextResponse.json({ error: errorMessage }, { status: 422 });
        }

        // Step 2: Analyse conversation size and determine strategy
        const stats = getConversationStats(messages);
        const tokenCount = estimateMessagesTokens(messages);

        console.log(
            `[import] ${messages.length} messages | ~${stats.totalTokens} tokens | strategy: ${stats.strategy} | chunks: ~${stats.estimatedChunks}`
        );

        // Step 3: Extract structured memory (auto-routes to chunked pipeline if large)
        const memory = await extractMemory(messages);

        // Step 4: Generate analysis from memory
        const analysis = await generateAnalysis(memory);

        // Step 5: Build default export (Balanced, GPT)
        const exportText = compressForExport(memory, "GPT", "Balanced");

        return NextResponse.json({
            success: true,
            messages,
            memory,
            analysis,
            exportText,
            tokenCount,
            isDemoData: !isShareLink,
            // Expose size metadata so the frontend can inform the user
            conversationStats: {
                totalTokens: stats.totalTokens,
                estimatedChunks: stats.estimatedChunks,
                isLarge: stats.isLarge,
                strategy: stats.strategy,
            },
        });
    } catch (err) {
        console.error("[/api/import]", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
