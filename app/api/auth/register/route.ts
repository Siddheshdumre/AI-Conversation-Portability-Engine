import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { email?: string; password?: string; name?: string };
        const { email, password, name } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
        }

        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }

        const hashedPassword = await bcryptjs.hash(password, 12);

        const user = await db.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
            },
        });

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error("[REGISTER]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
