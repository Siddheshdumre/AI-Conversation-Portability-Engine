import { NextRequest, NextResponse } from "next/server";
import { fetchConversationWithMeta } from "@/lib/fetcher";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url") || "https://chatgpt.com/share/699fe439-1d38-8002-8576-7602dee4350f";
    const result = await fetchConversationWithMeta(url);
    return NextResponse.json(result);
}
