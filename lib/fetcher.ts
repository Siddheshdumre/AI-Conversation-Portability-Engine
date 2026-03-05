import axios from "axios";
import { detectPlatform, getPlatformInfo, getDemoConversationForPlatform, getPlatformError } from "./platform-detector";
import { fetchGeminiConversation, type GeminiFetchResult } from "./fetchers/gemini-fetcher";

export type Message = {
    role: "user" | "assistant" | "system";
    content: string;
};

export type FetchResult =
    | { success: true; messages: Message[]; isDemo: false; platform: string }
    | { success: false; messages: Message[]; isDemo: true; reason: string; platform: string };

/**
 * Fetches a shared conversation from any supported AI platform and parses it into an ordered list of messages.
 *
 * Supported platforms:
 * - ChatGPT (chatgpt.com/share/...)
 * - Gemini (gemini.google.com/share/...)
 * - Claude (claude.ai/chat/...) [Future]
 *
 * Strategy (in priority order): 
 * 1. Platform detection → route to platform-specific fetcher
 * 2. Platform-specific API/DOM scraping
 * 3. Fallback to demo data with platform-specific messaging
 */
export async function fetchConversation(url: string): Promise<Message[]> {
    const result = await fetchConversationWithMeta(url);
    return result.messages;
}

export async function fetchConversationWithMeta(url: string): Promise<FetchResult> {
    const platformInfo = getPlatformInfo(url);
    const { platform, id, hostname } = platformInfo;
    
    console.log(`[fetcher] Platform detected: ${platform}, ID: ${id}, Host: ${hostname}`);
    
    // Route to platform-specific fetcher
    switch (platform) {
        case "chatgpt":
            return await fetchChatGPTConversationWithMeta(url, id);
        case "gemini":
            return await fetchGeminiConversationWithMeta(url, id);
        case "claude":
            // Future implementation
            return {
                success: false,
                messages: getDemoConversationForPlatform(platform),
                isDemo: true,
                platform,
                reason: "Claude conversation import is not yet supported. Please use ChatGPT or Gemini links."
            };
        default:
            return {
                success: false,
                messages: getDemoConversationForPlatform("unknown" as any),
                isDemo: true,
                platform: "unknown",
                reason: "Unsupported platform. Please use ChatGPT (chatgpt.com/share/...) or Gemini (gemini.google.com/share/...) share links."
            };
    }
}

// ─── Platform-Specific Fetchers ─────────────────────────────────────────────

async function fetchChatGPTConversationWithMeta(url: string, shareId: string | null): Promise<FetchResult> {
    if (!shareId) {
        return {
            success: false,
            messages: getDemoConversationForPlatform("chatgpt"),
            isDemo: true,
            platform: "chatgpt",
            reason: getPlatformError("chatgpt", shareId || undefined)
        };
    }

    // Strategy 1: ChatGPT backend JSON API (most reliable)
    const apiResult = await tryChatGPTApi(shareId);
    if (apiResult && apiResult.length > 0) {
        return { success: true, messages: apiResult, isDemo: false, platform: "chatgpt" };
    }

    // Strategy 2: Public API variant
    const publicApiResult = await tryChatGPTPublicApi(shareId);
    if (publicApiResult && publicApiResult.length > 0) {
        return { success: true, messages: publicApiResult, isDemo: false, platform: "chatgpt" };
    }

    // Strategy 3: HTML scraping (last resort for real links)
    if (isHttpUrl(url)) {
        const scraped = await tryHtmlScrape(url);
        if (scraped && scraped.length > 0) {
            return { success: true, messages: scraped, isDemo: false, platform: "chatgpt" };
        }
    }

    // Strategy 4: Demo — clearly flagged
    return {
        success: false,
        messages: getDemoConversationForPlatform("chatgpt"),
        isDemo: true,
        platform: "chatgpt",
        reason: getPlatformError("chatgpt", shareId)
    };
}

async function fetchGeminiConversationWithMeta(url: string, shareId: string | null): Promise<FetchResult> {
    console.log(`[fetcher] Gemini fetch attempt - URL: ${url}, ID: ${shareId}`);
    
    if (!shareId) {
        console.log(`[fetcher] No Gemini share ID found`);
        return {
            success: false,
            messages: getDemoConversationForPlatform("gemini"),
            isDemo: true,
            platform: "gemini",
            reason: getPlatformError("gemini", shareId || undefined)
        };
    }

    try {
        console.log(`[fetcher] Calling fetchGeminiConversation with URL: ${url}, ID: ${shareId}`);
        const result = await fetchGeminiConversation(url, shareId);
        console.log(`[fetcher] Gemini fetch result: ${result.messages.length} messages, error: ${result.error ?? 'none'}`);
        
        if (result.messages.length > 0) {
            return { success: true, messages: result.messages, isDemo: false, platform: "gemini" };
        }

        // Return specific error if the link is invalid
        if (result.error === "link_invalid") {
            return {
                success: false,
                messages: getDemoConversationForPlatform("gemini"),
                isDemo: true,
                platform: "gemini",
                reason: result.detail ?? "This Gemini share link doesn't exist, has expired, or was deleted. Please check the URL and try again."
            };
        }
    } catch (error) {
        console.error("[fetcher] Gemini fetch error:", error);
    }

    // Fallback to demo
    console.log(`[fetcher] Falling back to Gemini demo data`);
    return {
        success: false,
        messages: getDemoConversationForPlatform("gemini"),
        isDemo: true,
        platform: "gemini",
        reason: getPlatformError("gemini", shareId)
    };
}

// ─── Strategy 1: Puppeteer Headless Scrape (Bypasses Cloudflare) ─────────────

import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

async function tryChatGPTApi(shareId: string): Promise<Message[] | null> {
    const url = `https://chatgpt.com/share/${shareId}`;
    let browser = null;

    try {
        // Determine the Chrome executable path based on environment
        const isLocal = process.env.NODE_ENV === "development" || process.platform === "win32";

        // Vercel deployment requires a precompiled Chromium binary due to serverless limits
        const executablePath = isLocal
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : await chromium.executablePath(
                "https://github.com/Sparticuz/chromium/releases/download/v122.0.0/chromium-v122.0.0-pack.tar"
            );

        // chromium.args is only available in serverless (Sparticuz) — use simple args locally
        const browserArgs = isLocal
            ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
            : [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"];

        browser = await puppeteer.launch({
            args: browserArgs,
            defaultViewport: { width: 1920, height: 1080 },
            executablePath,
            headless: true,
        });

        const page = await browser.newPage();

        page.on('console', msg => console.log('[Puppeteer Browser]', msg.text()));

        // Set a realistic User-Agent to avoid early blocks
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        );

        page.setDefaultNavigationTimeout(60000);

        console.log(`[fetcher] Visiting URL: ${url}`);
        // 1. Visit the actual user-facing share URL
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Ensure page fully hydrates (important for large chats)
        try {
            await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 });
        } catch (e) {
            console.log("[fetcher] Timeout waiting for network idle. Proceeding anyway.");
        }

        // 2. Try to evaluate __reactRouterContext or __remixContext from the page source safely
        const remixStateStr = await page.evaluate(() => {
            const ctx = (window as any).__reactRouterContext || (window as any).__remixContext;
            return ctx ? JSON.stringify(ctx) : null;
        });

        if (remixStateStr) {
            console.log(`[fetcher] Found __remixContext, length: ${remixStateStr.length}`);
            try {
                const parsed = JSON.parse(remixStateStr);
                const loaderData = parsed?.state?.loaderData;

                if (loaderData) {
                    for (const key of Object.keys(loaderData)) {
                        const routeData = loaderData[key] as Record<string, any>;
                        // Try mapping
                        const mapping = routeData?.serverResponse?.data?.mapping || routeData?.data?.mapping || routeData?.serverResponse?.conversation?.mapping || routeData?.conversation?.mapping || routeData?.mapping;

                        if (mapping && typeof mapping === 'object') {
                            const messages = flattenMapping(mapping);
                            console.log(`[fetcher] Extracted ${messages.length} messages from Remix mapping (${key})`);
                            if (messages.length > 0) return messages;
                        }

                        // Try linear
                        const linear = routeData?.serverResponse?.data?.linear_conversation || routeData?.data?.linear_conversation || routeData?.linear_conversation;
                        if (Array.isArray(linear)) {
                            const messages = flattenLinearConversation(linear);
                            console.log(`[fetcher] Extracted ${messages.length} messages from Remix linear (${key})`);
                            if (messages.length > 0) return messages;
                        }
                    }
                }
            } catch (err) {
                console.log("[fetcher] Ignore parse errors on __remixContext", err);
            }
        } else {
            console.log("[fetcher] __remixContext not found on the page.");
            const bodyHTML = await page.evaluate(() => document.body.innerHTML);
            console.log(`[fetcher] Page body starts with: ${bodyHTML.substring(0, 200)}...`);

            // Try NEXT_DATA as fallback
            const nextDataStr = await page.evaluate(() => {
                const script = document.querySelector('#__NEXT_DATA__');
                return script ? script.innerHTML : null;
            });

            if (nextDataStr) {
                console.log(`[fetcher] Found fallback __NEXT_DATA__, length: ${nextDataStr.length}`);
                try {
                    const parsed = JSON.parse(nextDataStr);
                    const messages = extractFromNextData(parsed);
                    console.log(`[fetcher] Extracted ${messages.length} messages from __NEXT_DATA__`);
                    if (messages.length > 0) return messages;
                } catch (err) {
                    console.log("[fetcher] Ignore parse errors on __NEXT_DATA__", err);
                }
            }
        }

        // 3. Fallback: try the backend API directly in the same browser session
        const apiUrl = `https://chatgpt.com/backend-api/share/link/${shareId}`;
        console.log(`[fetcher] Visiting backend API: ${apiUrl}`);
        await page.goto(apiUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

        const jsonText = await page.evaluate(() => document.body.innerText);
        console.log(`[fetcher] Backend API response length: ${jsonText?.length || 0}`);

        if (jsonText && jsonText.trim().startsWith("{")) {
            const data = JSON.parse(jsonText);
            const messages = parseApiResponse(data);
            console.log(`[fetcher] Extracted ${messages.length} messages from backend API`);
            if (messages.length > 0) return messages;
        } else {
            console.log(`[fetcher] Backend API did not return JSON. Starts with: ${jsonText?.substring(0, 50)}`);
        }

    } catch (error) {
        console.error("[fetcher] Puppeteer outer block error:", error);
    } finally {
        if (browser) await browser.close();
    }

    return null;
}

// Disable the old axios-based scrapers as they will fail on Cloudflare
async function tryChatGPTPublicApi(shareId: string): Promise<Message[] | null> {
    return null;
}

async function tryHtmlScrape(url: string): Promise<Message[] | null> {
    return null;
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

/**
 * Parses the JSON response from ChatGPT's backend API.
 * Handles multiple known response shapes.
 */
function parseApiResponse(data: unknown): Message[] {
    if (!data || typeof data !== "object") return [];
    const d = data as Record<string, unknown>;

    // Shape 1: { linear_conversation: [...] }
    if (Array.isArray(d.linear_conversation)) {
        return flattenLinearConversation(d.linear_conversation);
    }

    // Shape 2: { mapping: { ... } }
    if (d.mapping && typeof d.mapping === "object") {
        return flattenMapping(d.mapping as Record<string, ConvNode>);
    }

    // Shape 3: nested inside { data: { ... } }
    if (d.data && typeof d.data === "object") {
        return parseApiResponse(d.data);
    }

    // Shape 4: nested inside { conversation: { ... } }
    if (d.conversation && typeof d.conversation === "object") {
        return parseApiResponse(d.conversation);
    }

    // Shape 5: array of messages directly
    if (Array.isArray(data)) {
        return flattenLinearConversation(data);
    }

    return [];
}

function extractFromNextData(data: Record<string, unknown>): Message[] {
    try {
        const props = data?.props as Record<string, unknown>;
        const pageProps = props?.pageProps as Record<string, unknown>;
        const serverResponse = pageProps?.serverResponse as Record<string, unknown>;
        const shareData = (serverResponse?.data ?? pageProps?.data) as Record<string, unknown>;

        if (!shareData) return [];
        return parseApiResponse(shareData);
    } catch {
        return [];
    }
}

type ConvNode = {
    id?: string;
    parent?: string | null;
    children?: string[];
    message?: {
        author?: { role: string };
        content?: { content_type: string; parts: unknown[] };
        create_time?: number;
        status?: string;
    };
};

function flattenMapping(mapping: Record<string, ConvNode>): Message[] {
    const messages: Message[] = [];

    // Find the absolute root node (it will have parent: null, undefined, or "")
    const root = Object.values(mapping).find(
        (node) => node.parent === null || node.parent === undefined || node.parent === ""
    );

    if (!root) return [];

    let current: ConvNode | undefined = root;

    while (current) {
        // Extract message if it exists and has content
        const msg = current.message;
        if (msg?.content?.content_type === "text" && msg.author?.role) {
            const role = msg.author.role;
            if (role === "user" || role === "assistant" || role === "system") {
                const content = (msg.content.parts ?? [])
                    .filter((p) => typeof p === "string")
                    .join("\n") // Use newline joining as recommended
                    .trim();

                if (content) {
                    messages.push({ role, content });
                }
            }
        }

        // Stop if no children
        if (!current.children || current.children.length === 0) {
            break;
        }

        // Always follow the first child (main branch of the conversation DAG)
        const nextId: string = current.children[0];
        current = mapping[nextId];
    }

    return messages;
}

function flattenLinearConversation(linear: unknown[]): Message[] {
    const messages: Message[] = [];
    for (const item of linear) {
        const node = item as ConvNode;
        const msg = node?.message;
        if (!msg) continue;
        const role = msg.author?.role ?? "";
        if (role !== "user" && role !== "assistant" && role !== "system") continue;
        const content = (msg.content?.parts ?? [])
            .filter((p) => typeof p === "string")
            .join("")
            .trim();
        if (content) messages.push({ role: role as "user" | "assistant" | "system", content });
    }
    return messages;
}

// ─── Legacy ChatGPT Helpers (kept for backward compatibility) ──────────────

/**
 * Legacy ChatGPT share ID extraction (now handled by platform-detector)
 * @deprecated Use getPlatformInfo() instead
 */
function extractShareId(url: string): string | null {
    try {
        const parsed = new URL(url);
        // Matches /share/{uuid} on chatgpt.com or chat.openai.com
        const match = parsed.pathname.match(
            /\/share\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
        );
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function isHttpUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
}

function commonHeaders() {
    return {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://chatgpt.com/",
    };
}

/**
 * Legacy demo conversation (now handled by platform-detector)
 * @deprecated Use getDemoConversationForPlatform() instead 
 */
function getDemoConversation(): Message[] {
    return getDemoConversationForPlatform("chatgpt");
}
