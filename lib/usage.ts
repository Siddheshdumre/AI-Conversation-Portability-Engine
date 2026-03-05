import { db } from "./db";
import { PlanTier } from "@prisma/client";

export const LIMITS = {
    ANONYMOUS: { MAX_IMPORTS: 3, MAX_TOKENS_PER_IMPORT: 700000 },
    FREE: { MAX_IMPORTS: 30, MAX_TOKENS_PER_IMPORT: 700000 },
    PRO: { MAX_IMPORTS: 500, MAX_TOKENS_PER_IMPORT: 700000 }
};

export async function checkUsage(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { plan: true, importsThisMonth: true, lastUsageReset: true }
    });

    if (!user) return { allowed: false, error: "User not found" };

    const limits = LIMITS[user.plan as keyof typeof LIMITS];

    // Optional: Reset logic if month rolled over
    const now = new Date();
    const resetDate = new Date(user.lastUsageReset);
    let currentImports = user.importsThisMonth;

    if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        // Reset limits for new month
        await db.user.update({
            where: { id: userId },
            data: { importsThisMonth: 0, tokensThisMonth: 0, lastUsageReset: now }
        });
        currentImports = 0;
    }

    if (currentImports >= limits.MAX_IMPORTS) {
        return {
            allowed: false,
            error: `Monthly limit of ${limits.MAX_IMPORTS} reached.`,
            code: "UPGRADE_REQUIRED",
            plan: user.plan,
        };
    }

    return { allowed: true, plan: user.plan, tokenLimit: limits.MAX_TOKENS_PER_IMPORT };
}
