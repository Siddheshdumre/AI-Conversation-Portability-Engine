import type { StructuredMemory } from "./extractor";

type CompressionLevel = "Compact" | "Balanced" | "Detailed";
type ModelType = "GPT" | "Claude" | "Gemini";

/**
 * Formats structured memory into a model-optimized continuation prompt.
 */
export function compressForExport(
    memory: StructuredMemory,
    model: ModelType,
    level: CompressionLevel
): string {
    const sections = buildSections(memory, level);
    return wrapForModel(sections, model, level);
}

function buildSections(memory: StructuredMemory, level: CompressionLevel): string {
    const lines: string[] = [];

    lines.push(`## Conversation Overview\n${memory.overview}`);

    if (memory.topics.length > 0) {
        lines.push(`## Topics Discussed\n${memory.topics.map((t) => `- ${t}`).join("\n")}`);
    }

    if (memory.decisions.length > 0) {
        lines.push(`## Key Decisions\n${memory.decisions.map((d) => `- ${d}`).join("\n")}`);
    }

    // Compact mode: skip examples and code, keep decisions only
    if (level === "Compact") {
        if (memory.action_items.length > 0) {
            lines.push(`## Action Items\n${memory.action_items.map((a) => `- ${a}`).join("\n")}`);
        }
        return lines.join("\n\n");
    }

    // Balanced+: include important points
    if (memory.important_points.length > 0) {
        lines.push(
            `## Important Points\n${memory.important_points.map((p) => `- ${p}`).join("\n")}`
        );
    }

    if (memory.assumptions.length > 0) {
        lines.push(`## Assumptions\n${memory.assumptions.map((a) => `- ${a}`).join("\n")}`);
    }

    if (memory.unresolved_questions.length > 0) {
        lines.push(
            `## Unresolved Questions\n${memory.unresolved_questions.map((q) => `- ${q}`).join("\n")}`
        );
    }

    if (memory.action_items.length > 0) {
        lines.push(`## Action Items\n${memory.action_items.map((a) => `- ${a}`).join("\n")}`);
    }

    // Detailed mode: also include code references
    if (level === "Detailed" && memory.code_references.length > 0) {
        lines.push(
            `## Code & Technical References\n${memory.code_references.map((c) => `- ${c}`).join("\n")}`
        );
    }

    return lines.join("\n\n");
}

function wrapForModel(sections: string, model: ModelType, level: CompressionLevel): string {
    const levelLabel = level.toLowerCase();

    if (model === "GPT") {
        return `Here is prior conversation context (${levelLabel} compression):

---
${sections}
---

Please continue naturally from where we left off, maintaining the context, decisions, and goals outlined above.`;
    }

    if (model === "Claude") {
        return `<context>
The following is structured memory extracted from a previous AI conversation. Use this to maintain continuity.

${sections}
</context>

<instructions>
You are continuing a prior conversation. All decisions, assumptions, and action items listed above are established context. Do not re-establish or re-question them. Continue directly from where the conversation left off.
</instructions>`;
    }

    // Gemini
    return `[CONVERSATION CONTEXT — ${level.toUpperCase()} MODE]

${sections}

[END CONTEXT]

Based on the above conversation history and context, please continue assisting with the established goals and open action items. Maintain consistency with all prior decisions.`;
}
