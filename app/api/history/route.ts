import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const history = await db.chatImport.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                url: true,
                tokenCount: true,
                createdAt: true,
            },
            take: 50,
        });

        return NextResponse.json({ success: true, history });
    } catch (error) {
        console.error("[GET /api/history]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
