import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generateHtmlReport } from "./report-generator";
import type { StructuredMemory } from "./extractor";
import type { ConversationAnalysis } from "./analyzer";

export async function generatePdfReport(
    memory: StructuredMemory,
    analysis: ConversationAnalysis | null,
    title?: string
): Promise<Buffer> {
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

        browser = await puppeteer.launch({
            args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
            defaultViewport: { width: 1920, height: 1080 },
            executablePath,
            headless: true,
        });

        const page = await browser.newPage();

        // Generate HTML report
        const htmlContent = generateHtmlReport(memory, analysis, title);

        // Set content and wait for it to load
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        // Generate PDF with options optimized for reports
        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: {
                top: "20mm",
                right: "20mm",
                bottom: "20mm",
                left: "20mm"
            },
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="font-size: 10px; color: #666; width: 100%; text-align: center; margin: 0 20mm;">
                    <span>${title || "AI Conversation Analysis Report"}</span>
                </div>
            `,
            footerTemplate: `
                <div style="font-size: 10px; color: #666; width: 100%; text-align: center; margin: 0 20mm;">
                    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                </div>
            `,
        });

        await browser.close();
        return Buffer.from(pdfBuffer);

    } catch (error) {
        console.error("[pdf-generator] Error generating PDF:", error);
        if (browser) {
            await browser.close();
        }
        throw new Error("Failed to generate PDF report");
    }
}