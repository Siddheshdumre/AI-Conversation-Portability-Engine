import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { Message } from "../fetcher";

/**
 * Fetches a shared Gemini conversation via Puppeteer (primary) and plain HTML (fallback).
 *
 * Gemini share pages are Angular SPAs — we MUST render them in a real browser,
 * then extract conversation turns from the fully-hydrated DOM.
 *
 * All DOM-extraction logic lives **inline** inside `page.evaluate()` so it
 * executes in the browser context (not Node).
 */
export type GeminiFetchResult = {
    messages: Message[];
    error?: "link_invalid" | "parse_failed" | "network_error";
    detail?: string;
};

export async function fetchGeminiConversation(
    url: string,
    shareId: string
): Promise<GeminiFetchResult> {
    console.log(`[gemini] Starting fetch — url=${url}  id=${shareId}`);

    // ── Strategy 1: Puppeteer (renders JS / SPA) ──────────────────────────
    const puppeteerResult = await tryPuppeteer(url);
    if (puppeteerResult) {
        if (puppeteerResult.error) {
            console.log(`[gemini] Puppeteer error: ${puppeteerResult.error} — ${puppeteerResult.detail}`);
            return puppeteerResult;
        }
        if (puppeteerResult.messages.length > 0) {
            console.log(`[gemini] Puppeteer succeeded — ${puppeteerResult.messages.length} msgs`);
            return puppeteerResult;
        }
    }

    // ── Strategy 2: Plain HTTP fetch (picks up SSR / noscript HTML) ───────
    const htmlResult = await tryPlainHtml(url);
    if (htmlResult && htmlResult.messages.length > 0) {
        console.log(`[gemini] Plain-HTML succeeded — ${htmlResult.messages.length} msgs`);
        return htmlResult;
    }

    console.log(`[gemini] All strategies failed — returning []`);
    return { messages: [], error: "parse_failed", detail: "Could not extract conversation from the page" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy 1 — Puppeteer
// ─────────────────────────────────────────────────────────────────────────────

async function tryPuppeteer(url: string): Promise<GeminiFetchResult | null> {
    let browser = null;

    try {
        const isLocal =
            process.env.NODE_ENV === "development" || process.platform === "win32";
        const executablePath = isLocal
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : await chromium.executablePath(
                  "https://github.com/Sparticuz/chromium/releases/download/v122.0.0/chromium-v122.0.0-pack.tar"
              );
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
        page.on("console", (msg) =>
            console.log("[gemini:browser]", msg.text())
        );

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        );
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-US,en;q=0.9",
        });
        page.setDefaultNavigationTimeout(60_000);

        // ── Navigate ──────────────────────────────────────────────────────
        console.log(`[gemini] Navigating to ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Wait for the Angular SPA to hydrate. networkidle2 is friendlier
        // than networkidle0 for SPAs that keep open connections.
        try {
            await page.waitForNetworkIdle({ idleTime: 3000, timeout: 20_000 });
        } catch {
            console.log("[gemini] Network-idle timeout — continuing anyway");
        }

        // Extra wait to let Angular finish rendering
        await new Promise(r => setTimeout(r, 3000));

        // ── Check for error pages ─────────────────────────────────────────
        const isError = await page.evaluate(() => {
            const body = document.body?.innerText ?? "";
            return (
                body.includes("Link doesn't exist") ||
                body.includes("link might have been deleted") ||
                body.includes("Page not found") ||
                body.includes("This shared conversation has expired")
            );
        });
        if (isError) {
            console.log("[gemini] Share page returned an error (link invalid / expired)");
            await browser.close();
            return {
                messages: [],
                error: "link_invalid",
                detail: "This Gemini share link doesn't exist, has expired, or was deleted."
            };
        }

        // ── Extract conversation ──────────────────────────────────────────
        // EVERYTHING below runs in the **browser** context.
        const extraction = await page.evaluate(() => {
            const msgs: { role: "user" | "assistant"; content: string }[] = [];
            const log: string[] = [];

            // Utility — clean text
            const clean = (s: string) =>
                s
                    .replace(/\u200B/g, "")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();

            // ─── S1: query-chip + response pairs ──────────────────────────
            // Gemini renders user turns in `.query-content` / `[class*="query"]`
            // and model turns in `.response-content` / `[class*="response"]` / markdown-rendered divs.
            const querySels = [
                ".query-content",
                '[class*="query-text"]',
                '[class*="user-query"]',
                '[data-message-author-role="user"]',
                "user-query",
                ".user-message",
            ];
            const respSels = [
                ".response-content",
                ".model-response-text",
                '[class*="response-text"]',
                '[class*="model-response"]',
                '[data-message-author-role="assistant"]',
                "model-response",
                ".markdown-main-panel",
                ".assistant-message",
            ];

            const pickAll = (sels: string[]) => {
                for (const s of sels) {
                    const els = document.querySelectorAll(s);
                    if (els.length) return Array.from(els);
                }
                return [] as Element[];
            };

            const queryEls = pickAll(querySels);
            const respEls = pickAll(respSels);
            log.push(
                `S1 queryEls=${queryEls.length}  respEls=${respEls.length}`
            );

            if (queryEls.length > 0 && respEls.length > 0) {
                const pairs = Math.min(queryEls.length, respEls.length);
                for (let i = 0; i < pairs; i++) {
                    const q = clean(queryEls[i].textContent ?? "");
                    const a = clean(respEls[i].textContent ?? "");
                    if (q) msgs.push({ role: "user", content: q });
                    if (a) msgs.push({ role: "assistant", content: a });
                }
                if (msgs.length) {
                    log.push(`S1 success — ${msgs.length} msgs`);
                    return { msgs, log, strategy: "S1-query-response" };
                }
            }

            // ─── S2: conversation-turn elements ───────────────────────────
            const turnSels = [
                "conversation-turn",
                ".conversation-turn",
                '[class*="conversation-turn"]',
                '[class*="turn-container"]',
                ".chat-turn",
                '[role="listitem"]',
                '[class*="message-row"]',
                '[class*="chat-message"]',
            ];
            for (const sel of turnSels) {
                const turns = document.querySelectorAll(sel);
                if (turns.length >= 2) {
                    log.push(`S2 found ${turns.length} turns with [${sel}]`);
                    turns.forEach((turn, idx) => {
                        const text = clean(turn.textContent ?? "");
                        if (text.length < 3) return;

                        // Try to detect role from attributes / classes
                        const attr = (turn.getAttribute("data-role") ??
                            turn.getAttribute("data-author") ??
                            turn.className ??
                            "")
                            .toLowerCase();
                        let role: "user" | "assistant";
                        if (
                            attr.includes("user") ||
                            attr.includes("human")
                        ) {
                            role = "user";
                        } else if (
                            attr.includes("model") ||
                            attr.includes("assistant") ||
                            attr.includes("bot")
                        ) {
                            role = "assistant";
                        } else {
                            role = idx % 2 === 0 ? "user" : "assistant";
                        }
                        msgs.push({ role, content: text });
                    });
                    if (msgs.length) {
                        return { msgs, log, strategy: "S2-turn-elements" };
                    }
                }
            }

            // ─── S3: heading + sibling content blocks ─────────────────────
            // Some shared Gemini pages render with visible "You" / "Gemini"
            // headings followed by content.
            const headings = Array.from(
                document.querySelectorAll("h1, h2, h3, h4, strong, b, [class*='author'], [class*='role-label']")
            );
            log.push(`S3 headings=${headings.length}`);
            for (const h of headings) {
                const label = (h.textContent ?? "").trim().toLowerCase();
                const isUser =
                    label === "you" ||
                    label === "user" ||
                    label === "human";
                const isAssistant =
                    label === "gemini" ||
                    label === "model" ||
                    label === "assistant" ||
                    label === "bard";
                if (!isUser && !isAssistant) continue;

                // Grab following-sibling text (skip the heading itself)
                let node: Element | null = h.nextElementSibling ?? h.parentElement?.nextElementSibling ?? null;
                const parts: string[] = [];
                while (node) {
                    const nodeTxt = (node.textContent ?? "").trim().toLowerCase();
                    // Stop when we hit the next role heading
                    if (
                        nodeTxt === "you" ||
                        nodeTxt === "gemini" ||
                        nodeTxt === "model" ||
                        nodeTxt === "user"
                    ) {
                        break;
                    }
                    const t = clean(node.textContent ?? "");
                    if (t) parts.push(t);
                    node = node.nextElementSibling;
                }
                const content = parts.join("\n\n");
                if (content.length > 3) {
                    msgs.push({
                        role: isUser ? "user" : "assistant",
                        content,
                    });
                }
            }
            if (msgs.length) {
                log.push(`S3 success — ${msgs.length} msgs`);
                return { msgs, log, strategy: "S3-heading-sibling" };
            }

            // ─── S4: Angular web-component shadow DOM ─────────────────────
            // Gemini may use custom elements with shadow roots.
            const customEls = document.querySelectorAll("*");
            let shadowContents: string[] = [];
            customEls.forEach((el) => {
                if (el.shadowRoot) {
                    shadowContents.push(
                        clean(el.shadowRoot.textContent ?? "")
                    );
                }
            });
            log.push(`S4 shadow-roots=${shadowContents.length}`);
            if (shadowContents.length >= 2) {
                shadowContents = shadowContents.filter((s) => s.length > 10);
                shadowContents.forEach((text, idx) => {
                    msgs.push({
                        role: idx % 2 === 0 ? "user" : "assistant",
                        content: text,
                    });
                });
                if (msgs.length) {
                    return { msgs, log, strategy: "S4-shadow-dom" };
                }
            }

            // ─── S5: data-attribute scan (generic) ────────────────────────
            const allEls = document.querySelectorAll("[data-message-id], [data-turn-id], [data-content-id]");
            log.push(`S5 data-attr elements=${allEls.length}`);
            if (allEls.length >= 2) {
                allEls.forEach((el, idx) => {
                    const text = clean(el.textContent ?? "");
                    if (text.length < 5) return;
                    const attr = (
                        el.getAttribute("data-role") ??
                        el.getAttribute("data-author-role") ??
                        ""
                    ).toLowerCase();
                    let role: "user" | "assistant";
                    if (attr.includes("user") || attr.includes("human")) {
                        role = "user";
                    } else if (
                        attr.includes("model") ||
                        attr.includes("assistant")
                    ) {
                        role = "assistant";
                    } else {
                        role = idx % 2 === 0 ? "user" : "assistant";
                    }
                    msgs.push({ role, content: text });
                });
                if (msgs.length) {
                    return { msgs, log, strategy: "S5-data-attrs" };
                }
            }

            // ─── S6: full-body text pattern matching ──────────────────────
            const bodyText = document.body?.innerText ?? "";
            log.push(`S6 bodyText length=${bodyText.length}`);

            // Try splitting on role labels that Gemini renders visibly
            const segments = bodyText.split(
                /\n\s*(?:You|User|Human)\s*\n|\n\s*(?:Gemini|Model|Assistant|Bard)\s*\n/i
            );
            if (segments.length >= 3) {
                // The split drops the delimiters, so we re-scan to know
                // which roles they were.
                const roleMarkers = [
                    ...bodyText.matchAll(
                        /\n\s*(You|User|Human|Gemini|Model|Assistant|Bard)\s*\n/gi
                    ),
                ];
                log.push(`S6 segments=${segments.length}  markers=${roleMarkers.length}`);
                for (let i = 0; i < roleMarkers.length; i++) {
                    const marker = roleMarkers[i][1].toLowerCase();
                    const content = clean(segments[i + 1] ?? "");
                    if (content.length < 5) continue;
                    const role: "user" | "assistant" =
                        marker === "you" ||
                        marker === "user" ||
                        marker === "human"
                            ? "user"
                            : "assistant";
                    msgs.push({ role, content });
                }
                if (msgs.length) {
                    return { msgs, log, strategy: "S6-text-split" };
                }
            }

            // ─── S7: Dump diagnostics if nothing worked ───────────────────
            // Return the body text snapshot and a sample of the DOM so we can
            // iterate on selectors later.
            const domSample = document.body?.innerHTML?.substring(0, 5000) ?? "";
            log.push("All strategies exhausted");
            return {
                msgs: [] as { role: "user" | "assistant"; content: string }[],
                log,
                strategy: "none",
                bodyTextPreview: bodyText.substring(0, 2000),
                domSample,
            };
        });

        // ── Process the extraction result ─────────────────────────────────
        if (extraction) {
            console.log(`[gemini] Strategy used: ${extraction.strategy}`);
            extraction.log.forEach((l: string) =>
                console.log(`[gemini:eval] ${l}`)
            );

            if (extraction.msgs.length > 0) {
                await browser.close();
                return { messages: extraction.msgs };
            }

            // Log diagnostic snippets when extraction fails
            if ("bodyTextPreview" in extraction && extraction.bodyTextPreview) {
                console.log(
                    `[gemini] Body text preview:\n${(extraction.bodyTextPreview as string).substring(0, 500)}`
                );
            }
            if ("domSample" in extraction && extraction.domSample) {
                console.log(
                    `[gemini] DOM sample:\n${(extraction.domSample as string).substring(0, 1000)}`
                );
            }
        }

        await browser.close();
        return { messages: [], error: "parse_failed", detail: "Page loaded but no conversation content found" };
    } catch (err) {
        console.error("[gemini] Puppeteer error:", err);
        if (browser) await browser.close();
        return { messages: [], error: "network_error", detail: String(err) };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy 2 — Plain HTTP fetch (catches SSR / noscript fallback)
// ─────────────────────────────────────────────────────────────────────────────

async function tryPlainHtml(url: string): Promise<GeminiFetchResult | null> {
    console.log(`[gemini] Plain HTML fetch for ${url}`);
    try {
        const axios = (await import("axios")).default;
        const { data: html } = await axios.get<string>(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout: 30_000,
        });

        if (!html || typeof html !== "string") return null;

        // Check for error page
        if (
            html.includes("Link doesn't exist") ||
            html.includes("link might have been deleted")
        ) {
            console.log("[gemini] Plain HTML: error page detected");
            return { messages: [], error: "link_invalid", detail: "This Gemini share link doesn't exist, has expired, or was deleted." };
        }

        // Extract JSON blobs from <script type="application/json"> tags
        const jsonScriptRx =
            /<script[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match: RegExpExecArray | null;
        while ((match = jsonScriptRx.exec(html)) !== null) {
            try {
                const payload = JSON.parse(match[1]);
                const msgs = digForMessages(payload);
                if (msgs.length) return { messages: msgs };
            } catch {
                // ignore parse errors
            }
        }

        // Search for AF_initDataCallback blobs (Google-standard pattern)
        const afRx = /AF_initDataCallback\(\{[^}]*data:\s*(\[[\s\S]*?\])\s*\}\)/g;
        while ((match = afRx.exec(html)) !== null) {
            try {
                const payload = JSON.parse(match[1]);
                const msgs = digForMessages(payload);
                if (msgs.length) return { messages: msgs };
            } catch {
                // ignore
            }
        }

        // Quick body-text extraction (light parsing)
        const textOnly = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, "\n")
            .replace(/&[a-z]+;/gi, " ")
            .replace(/\n{2,}/g, "\n");

        if (textOnly.length > 200) {
            const msgs = textPatternExtract(textOnly);
            if (msgs.length) return { messages: msgs };
        }

        return null;
    } catch (err) {
        console.error("[gemini] Plain HTML error:", err);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — work in Node context
// ─────────────────────────────────────────────────────────────────────────────

/** Deep-walk any JS object looking for arrays that look like chat turns. */
function digForMessages(obj: unknown, depth = 0): Message[] {
    if (depth > 8 || obj == null) return [];

    // If it's an array of objects with role/content fields, great
    if (Array.isArray(obj)) {
        const directMsgs = obj
            .filter(
                (item) =>
                    item &&
                    typeof item === "object" &&
                    ("role" in item || "author" in item) &&
                    ("content" in item || "text" in item || "message" in item)
            )
            .map((item): Message | null => {
                const rawRole = (
                    item.role ??
                    item.author ??
                    item.authorRole ??
                    ""
                )
                    .toString()
                    .toLowerCase();
                const isUser =
                    rawRole.includes("user") || rawRole.includes("human");
                const isAssistant =
                    rawRole.includes("model") ||
                    rawRole.includes("assistant") ||
                    rawRole.includes("bot") ||
                    rawRole.includes("gemini");
                if (!isUser && !isAssistant) return null;

                const content = (
                    item.content ??
                    item.text ??
                    item.message ??
                    ""
                ).toString();
                if (content.length < 2) return null;

                return {
                    role: isUser ? "user" : "assistant",
                    content,
                };
            })
            .filter(Boolean) as Message[];
        if (directMsgs.length >= 2) return directMsgs;

        // Recurse into array elements
        for (const el of obj) {
            const sub = digForMessages(el, depth + 1);
            if (sub.length >= 2) return sub;
        }
    }

    if (typeof obj === "object" && obj !== null) {
        // Check turn/message/conversation keys first
        const priority = [
            "turns",
            "messages",
            "conversation",
            "chat",
            "dialogue",
            "data",
        ];
        for (const key of priority) {
            if (key in (obj as Record<string, unknown>)) {
                const sub = digForMessages(
                    (obj as Record<string, unknown>)[key],
                    depth + 1
                );
                if (sub.length >= 2) return sub;
            }
        }
        // Then everything else
        for (const val of Object.values(obj as Record<string, unknown>)) {
            const sub = digForMessages(val, depth + 1);
            if (sub.length >= 2) return sub;
        }
    }

    return [];
}

/** Extract messages from raw page text using role-label patterns. */
function textPatternExtract(text: string): Message[] {
    const msgs: Message[] = [];
    const rx =
        /(?:^|\n)\s*(You|User|Human|Gemini|Model|Assistant|Bard)\s*[:\n]\s*([\s\S]*?)(?=(?:\n\s*(?:You|User|Human|Gemini|Model|Assistant|Bard)\s*[:\n])|$)/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
        const label = m[1].toLowerCase();
        const content = m[2].trim();
        if (content.length < 5) continue;
        const role: "user" | "assistant" =
            label === "you" || label === "user" || label === "human"
                ? "user"
                : "assistant";
        msgs.push({ role, content });
    }
    return msgs;
}
