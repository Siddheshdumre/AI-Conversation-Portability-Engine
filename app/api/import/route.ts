import { NextRequest, NextResponse } from "next/server";
import { fetchConversationWithMeta } from "@/lib/fetcher";
import { extractMemory } from "@/lib/extractor";
import { generateAnalysis } from "@/lib/analyzer";
import { compressForExport } from "@/lib/compressor";
import { estimateMessagesTokens } from "@/lib/tokenizer";
import { getConversationStats } from "@/lib/chunker";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { checkUsage, LIMITS } from "@/lib/usage";

const MAX_ANONYMOUS_IMPORTS = LIMITS.ANONYMOUS.MAX_IMPORTS;

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

        const session = await auth();

        if (session?.user?.id) {
            const usageCheck = await checkUsage(session.user.id);
            if (!usageCheck.allowed) {
                return NextResponse.json({
                    error: usageCheck.error,
                    code: usageCheck.code
                }, { status: 403 });
            }

            if (stats.totalTokens > (usageCheck.tokenLimit || 0)) {
                return NextResponse.json({
                    error: `Conversation exceeds plan token limit of ${(usageCheck.tokenLimit || 0).toLocaleString()}.`,
                    code: "EXCEEDS_TOKEN_LIMIT"
                }, { status: 413 });
            }
        } else {
            if (stats.totalTokens > LIMITS.ANONYMOUS.MAX_TOKENS_PER_IMPORT) {
                return NextResponse.json({
                    error: `Conversation implies too high complexity. Please sign up to import massive chats.`,
                    code: "EXCEEDS_TOKEN_LIMIT"
                }, { status: 413 });
            }
        }

        // Step 3: Extract structured memory (auto-routes to chunked pipeline if large)
        const memory = await extractMemory(messages);

        // Step 4: Generate analysis from memory
        const analysis = await generateAnalysis(memory);

        // Step 5: Build default export (Balanced, GPT)
        const exportText = compressForExport(memory, "GPT", "Balanced");

        if (session?.user?.id) {
            // Logged in user: persist to DB and increment usage
            await db.$transaction([
                db.chatImport.create({
                    data: {
                        userId: session.user.id,
                        url,
                        title: memory.overview?.slice(0, 80) || new URL(url).hostname,
                        tokenCount,
                        memory: memory as any,
                        analysis: analysis as any,
                    }
                }),
                db.user.update({
                    where: { id: session.user.id },
                    data: {
                        importsThisMonth: { increment: 1 },
                        tokensThisMonth: { increment: tokenCount }
                    }
                })
            ]);
        } else {
            // Anonymous user: track usage in cookie
            const cookieStore = cookies();
            const guestUsageRaw = cookieStore.get("guest_imports")?.value;
            let guestImports = guestUsageRaw ? parseInt(guestUsageRaw, 10) : 0;

            if (guestImports >= MAX_ANONYMOUS_IMPORTS) {
                return NextResponse.json({
                    error: `You've used your ${MAX_ANONYMOUS_IMPORTS} free imports. Please sign up to continue.`,
                    code: "REQUIRES_LOGIN"
                }, { status: 403 });
            }

            guestImports += 1;

            const response = NextResponse.json({
                success: true,
                messages,
                memory,
                analysis,
                exportText,
                tokenCount,
                isDemoData: !isShareLink,
                conversationStats: {
                    totalTokens: stats.totalTokens,
                    estimatedChunks: stats.estimatedChunks,
                    isLarge: stats.isLarge,
                    strategy: stats.strategy,
                },
            });

            // Set cookie expiry for 30 days
            response.cookies.set("guest_imports", guestImports.toString(), {
                maxAge: 30 * 24 * 60 * 60,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });

            return response;
        }

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
