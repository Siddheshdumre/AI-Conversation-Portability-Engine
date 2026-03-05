export type Platform = "chatgpt" | "gemini" | "claude" | "unknown";

export type PlatformInfo = {
    platform: Platform;
    id: string | null;
    hostname: string;
};

/**
 * Detects the AI platform from a share URL
 */
export function detectPlatform(url: string): Platform {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        // ChatGPT patterns
        if (hostname.includes("chatgpt.com") || hostname.includes("chat.openai.com")) {
            return "chatgpt";
        }

        // Gemini patterns  
        if (hostname.includes("gemini.google.com") || 
            hostname.includes("bard.google.com") ||
            (hostname.includes("g.co") && parsed.pathname.includes("gemini"))) {
            return "gemini";
        }

        // Claude patterns (future)
        if (hostname.includes("claude.ai")) {
            return "claude";
        }

        return "unknown";
    } catch {
        return "unknown";
    }
}

/**
 * Extracts platform-specific conversation ID from URL
 */
export function extractPlatformId(url: string, platform: Platform): string | null {
    try {
        const parsed = new URL(url);
        
        switch (platform) {
            case "chatgpt":
                return extractChatGPTId(parsed);
            case "gemini":
                return extractGeminiId(parsed);
            case "claude":
                return extractClaudeId(parsed);
            default:
                return null;
        }
    } catch {
        return null;
    }
}

/**
 * Gets complete platform information from URL
 */
export function getPlatformInfo(url: string): PlatformInfo {
    const platform = detectPlatform(url);
    const id = extractPlatformId(url, platform);
    
    try {
        const hostname = new URL(url).hostname;
        return { platform, id, hostname };
    } catch {
        return { platform: "unknown", id: null, hostname: "" };
    }
}

// Platform-specific ID extractors

function extractChatGPTId(parsed: URL): string | null {
    // Matches /share/{uuid} on chatgpt.com or chat.openai.com
    const match = parsed.pathname.match(
        /\/share\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
    return match ? match[1] : null;
}

function extractGeminiId(parsed: URL): string | null {
    // Gemini share patterns (research-based assumptions)
    
    // Pattern 1: /share/{conversation_id}
    let match = parsed.pathname.match(/\/share\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    
    // Pattern 2: /c/{conversation_id} (potential Bard legacy)
    match = parsed.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    
    // Pattern 3: Query parameter based
    const conversationId = parsed.searchParams.get('conversation') || 
                          parsed.searchParams.get('c') ||
                          parsed.searchParams.get('id');
    if (conversationId) return conversationId;
    
    // Pattern 4: Hash-based routing
    if (parsed.hash) {
        const hashMatch = parsed.hash.match(/#\/share\/([a-zA-Z0-9_-]+)/);
        if (hashMatch) return hashMatch[1];
    }
    
    return null;
}

function extractClaudeId(parsed: URL): string | null {
    // Claude share patterns (placeholder for future implementation)
    const match = parsed.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

/**
 * Gets platform-specific demo conversation
 */
export function getDemoConversationForPlatform(platform: Platform): Array<{role: "user" | "assistant" | "system", content: string}> {
    switch (platform) {
        case "gemini":
            return [
                {
                    role: "user",
                    content: "⚠️ This is demo data — could not fetch the real Gemini conversation. Paste a valid public Gemini share link (gemini.google.com/share/...) to see your actual conversation."
                },
                {
                    role: "assistant", 
                    content: "If the link is public, the issue might be that Gemini's sharing format changed or the conversation is private. Try creating a new share link from Gemini."
                }
            ];
        case "claude":
            return [
                {
                    role: "user",
                    content: "⚠️ This is demo data — could not fetch the real Claude conversation. Paste a valid public Claude share link (claude.ai/chat/...) to see your actual conversation."
                },
                {
                    role: "assistant",
                    content: "Claude share link processing is not yet implemented. Please use ChatGPT or Gemini links for now."
                }
            ];
        case "chatgpt":
        default:
            return [
                {
                    role: "user",
                    content: "⚠️ This is demo data — could not fetch the real conversation. Paste a valid public ChatGPT share link (chatgpt.com/share/...) to see your actual conversation."
                },
                {
                    role: "assistant",
                    content: "If the link is public, the issue is likely that ChatGPT's API returned an unexpected format. Try refreshing the share link or creating a new one."
                }
            ];
    }
}

/**
 * Gets platform-specific error messages
 */
export function getPlatformError(platform: Platform, shareId?: string): string {
    switch (platform) {
        case "gemini":
            return shareId 
                ? `Could not fetch Gemini conversation '${shareId}'. The link may be private, expired, or Gemini's sharing format changed.`
                : "Not a recognized Gemini share link. Please check the URL format.";
        case "claude":
            return "Claude conversation import is not yet supported. Please use ChatGPT or Gemini links.";
        case "chatgpt":
            return shareId
                ? `Could not fetch ChatGPT conversation '${shareId}'. The link may be private, deleted, or ChatGPT's API structure changed.`
                : "Not a recognized ChatGPT share link. Showing demo data.";
        default:
            return "Unsupported platform. Please use ChatGPT or Gemini share links.";
    }
}