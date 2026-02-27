import OpenAI from "openai";
import type { StructuredMemory } from "./extractor";

export type ConversationAnalysis = {
    summary: string;
    detailed: string;
    keyPoints: string[];
};

export async function generateAnalysis(memory: StructuredMemory): Promise<ConversationAnalysis> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return buildFallbackAnalysis(memory);
    }

    const client = new OpenAI({ apiKey });
    const memoryText = JSON.stringify(memory, null, 2);

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are a technical analyst. Given structured conversation memory, produce three analysis outputs.
Return JSON with exactly these keys:
- summary: string (2-3 sentence executive summary, plain English)
- detailed: string (3-5 paragraph detailed analysis of what was discussed, decisions made, and why they matter)
- keyPoints: string[] (5-8 bullet point key takeaways)`,
                },
                {
                    role: "user",
                    content: `Generate analysis from this structured conversation memory:\n\n${memoryText}`,
                },
            ],
            max_tokens: 1500,
            temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return buildFallbackAnalysis(memory);

        const parsed = JSON.parse(content) as Partial<ConversationAnalysis>;
        return {
            summary: parsed.summary ?? buildFallbackAnalysis(memory).summary,
            detailed: parsed.detailed ?? buildFallbackAnalysis(memory).detailed,
            keyPoints: parsed.keyPoints ?? buildFallbackAnalysis(memory).keyPoints,
        };
    } catch {
        return buildFallbackAnalysis(memory);
    }
}

function buildFallbackAnalysis(memory: StructuredMemory): ConversationAnalysis {
    return {
        summary: memory.overview,
        detailed: [
            memory.overview,
            memory.topics.length > 0
                ? `Topics covered include: ${memory.topics.join(", ")}.`
                : "",
            memory.decisions.length > 0
                ? `Key decisions: ${memory.decisions.join(" | ")}`
                : "",
            memory.unresolved_questions.length > 0
                ? `Open questions remain: ${memory.unresolved_questions.join("; ")}`
                : "",
        ]
            .filter(Boolean)
            .join("\n\n"),
        keyPoints: [
            ...memory.important_points.slice(0, 4),
            ...memory.decisions.slice(0, 2),
            ...memory.action_items.slice(0, 2),
        ].filter(Boolean),
    };
}
