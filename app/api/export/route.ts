import { NextRequest, NextResponse } from "next/server";
import { compressForExport } from "@/lib/compressor";
import { estimateTokens } from "@/lib/tokenizer";
import { generateMarkdownReport } from "@/lib/report-generator";
import { generatePdfReport } from "@/lib/pdf-generator";
import type { StructuredMemory } from "@/lib/extractor";
import type { ConversationAnalysis } from "@/lib/analyzer";

type ExportBody = {
    memory: StructuredMemory;
    analysis?: ConversationAnalysis;
    model?: "GPT" | "Claude" | "Gemini";
    compression?: "Compact" | "Balanced" | "Detailed";
    format: "prompt" | "markdown" | "pdf";
    title?: string;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as Partial<ExportBody>;
        const { memory, analysis, model, compression, format, title } = body;

        if (!memory || !format) {
            return NextResponse.json(
                { error: "memory and format are required." },
                { status: 400 }
            );
        }

        const validFormats = ["prompt", "markdown", "pdf"];
        if (!validFormats.includes(format)) {
            return NextResponse.json({ error: "Invalid export format." }, { status: 400 });
        }

        // Handle different export formats
        if (format === "prompt") {
            if (!model || !compression) {
                return NextResponse.json(
                    { error: "model and compression are required for prompt format." },
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
        }

        if (format === "markdown") {
            const markdownContent = generateMarkdownReport(memory, analysis || null, title);
            
            return new NextResponse(markdownContent, {
                status: 200,
                headers: {
                    "Content-Type": "text/markdown; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${title || 'conversation-report'}.md"`
                }
            });
        }

        if (format === "pdf") {
            const pdfBuffer = await generatePdfReport(memory, analysis || null, title);
            
            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${title || 'conversation-report'}.pdf"`
                }
            });
        }

        return NextResponse.json({ error: "Unsupported export format." }, { status: 400 });
    } catch (err) {
        console.error("[/api/export]", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
