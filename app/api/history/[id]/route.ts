import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const chat = await db.chatImport.findUnique({
            where: { id: params.id },
        });

        if (!chat || chat.userId !== session.user.id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, chat });
    } catch (error) {
        console.error("[GET /api/history/[id]]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
