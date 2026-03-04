import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

export default {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_ID!,
            clientSecret: process.env.GOOGLE_SECRET!,
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                // Dynamic import bcrypt and Prisma to avoid Edge runtime issues in middleware
                const bcryptjs = (await import("bcryptjs")).default;
                const { db } = await import("./db");

                const user = await db.user.findUnique({
                    where: { email: credentials.email as string }
                });

                if (!user || !user.password) {
                    throw new Error("Invalid credentials");
                }

                const isCorrectPassword = await bcryptjs.compare(credentials.password as string, user.password);
                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }

                return user;
            }
        })
    ]
} satisfies NextAuthConfig;
