import { NextRequest, NextResponse } from "next/server";
import { compressForExport } from "@/lib/compressor";
import { estimateTokens } from "@/lib/tokenizer";
import type { StructuredMemory } from "@/lib/extractor";

type ExportBody = {
    memory: StructuredMemory;
    model: "GPT" | "Claude" | "Gemini";
    compression: "Compact" | "Balanced" | "Detailed";
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as Partial<ExportBody>;
        const { memory, model, compression } = body;

        if (!memory || !model || !compression) {
            return NextResponse.json(
                { error: "memory, model, and compression are required." },
                { status: 400 }
            );
        }

        const validModels = ["GPT", "Claude", "Gemini"];
        const validLevels = ["Compact", "Balanced", "Detailed"];

        if (!validModels.includes(model) || !validLevels.includes(compression)) {
            return NextResponse.json({ error: "Invalid model or compression level." }, { status: 400 });
        }

        const exportText = compressForExport(memory, model, compression);
        const tokenCount = estimateTokens(exportText);

        return NextResponse.json({ exportText, tokenCount });
    } catch (err) {
        console.error("[/api/export]", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
