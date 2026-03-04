import NextAuth from "next-auth";
import authConfig from "./lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl, auth } = req;
    const isLoggedIn = !!auth;

    const isDashboard = nextUrl.pathname.startsWith("/dashboard");
    const isHistoryApi = nextUrl.pathname.startsWith("/api/history");

    // Allow unauthenticated users to view the dashboard
    if (isDashboard) {
        return NextResponse.next();
    }

    // Protect history API
    if (isHistoryApi && !isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/dashboard/:path*", "/api/import", "/api/export", "/api/history/:path*"]
};
