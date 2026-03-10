import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const {
    auth,
    signIn,
    signOut,
    handlers: { GET, POST }
} = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string }
                });

                if (!user || !user.password) return null;

                const passwordsMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (passwordsMatch) return user;

                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
    },
});

/**
 * Authorization Roles
 */
export const ROLES = {
    OWNER: "Owner",
    MANAGER: "Manager",
    WORKER: "Worker",
    VENDOR_MANAGER: "VendorManager",
    VENDOR_WORKER: "VendorWorker",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Server-side session helper
 */
export const getSession = async () => auth();

/**
 * Check if the user has one of the required roles
 */
export async function hasRole(roles: UserRole[]) {
    const session = await getSession();
    if (!session?.user?.role) return false;
    return roles.includes(session.user.role as UserRole);
}

