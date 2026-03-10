import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
            const isAuthPage = nextUrl.pathname === "/login";
            // QA-10 fix: exclude cron/webhook API routes from auth — they use their own
            // authentication mechanisms (CRON_SECRET / webhook signatures)
            const isPublicApiRoute = nextUrl.pathname.startsWith("/api/reminders") ||
                nextUrl.pathname.startsWith("/api/webhooks");
            const isPublicRoute = isApiAuthRoute || isAuthPage || isPublicApiRoute;

            if (isAuthPage) {
                if (isLoggedIn) {
                    const params = new URLSearchParams(nextUrl.search);
                    const callbackUrl = params.get("callbackUrl");
                    if (callbackUrl) {
                        return Response.redirect(new URL(callbackUrl, nextUrl));
                    }
                    if ((auth?.user as any)?.role === "VendorWorker") {
                         return Response.redirect(new URL("/work-logs", nextUrl));
                    }
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }
                return true;
            }

            if (!isLoggedIn && !isPublicRoute) {
                return false; // Redirect unauthenticated users to login page
            }

            if (isLoggedIn) {
                const role = (auth?.user as any)?.role;
                if (role === "VendorWorker") {
                    const path = nextUrl.pathname;
                    if (!path.startsWith("/work-logs") && !path.startsWith("/api") && !isPublicRoute) {
                        return Response.redirect(new URL("/work-logs", nextUrl));
                    }
                }
            }

            return true;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            if (token.role && session.user) {
                session.user.role = token.role;
            }
            if (token.company && session.user) {
                session.user.company = token.company;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                // Standardize 'Member' to 'Worker'
                token.role = user.role === "Member" ? "Worker" : user.role;
                token.company = user.company || "blackfox";
            }
            return token;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
