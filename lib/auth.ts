import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

export const {
    handlers: { GET, POST },
    auth,
    signIn,
    signOut,
} = NextAuth({
    adapter: PrismaAdapter(db) as any,
    session: { strategy: "jwt" },
    ...authConfig,
    callbacks: {
        session: ({ session, token }) => {
            if (session.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        }
    },
});
