import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
    // SEC-H3: Only exclude specific public API routes — new routes are protected by default
    matcher: ['/((?!api/auth|api/webhooks|api/reminders|uploads|fonts|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|ttf)$).*)'],
};
