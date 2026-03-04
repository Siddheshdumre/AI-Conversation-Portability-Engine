import { NextRequest, NextResponse } from "next/server";

// Lightweight middleware that does NOT import next-auth.
// It simply checks for the presence of the NextAuth session cookie.
// This keeps the Edge Function well under the 1MB Vercel size limit.
// The actual session validity is enforced in each API route via the full next-auth handler.

const SESSION_COOKIE = process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Dashboard is public (anonymous extractions are allowed)
    if (pathname.startsWith("/dashboard")) {
        return NextResponse.next();
    }

    // History API requires a session cookie
    if (pathname.startsWith("/api/history")) {
        const hasSession = req.cookies.has(SESSION_COOKIE);
        if (!hasSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/api/import", "/api/export", "/api/history/:path*"],
};
