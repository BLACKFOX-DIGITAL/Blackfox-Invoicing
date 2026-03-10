import { ActionResult } from "@/lib/types";
import { auth } from "@/auth";
import { PRIMARY_COMPANY, VENDOR_COMPANY } from "@/lib/constants/tenant";

/**
 * A wrapper for server actions to provide consistent error handling and logging.
 */
export async function createAction<T>(
    name: string,
    handler: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
    try {
        return await handler();
    } catch (error) {
        console.error(`Action [${name}] failed:`, error);

        if (error instanceof Error) {
            // Only expose internal error details in development — never in production.
            const message = process.env.NODE_ENV === "development"
                ? error.message
                : `An unexpected error occurred in ${name}`;
            return { success: false, error: message };
        }

        return { success: false, error: `An unexpected error occurred in ${name}` };
    }
}

/**
 * Guard: ensures the caller belongs to Blackfox (company !== 'frameit').
 * Returns the session if authorized, or null if not.
 * Usage: const session = await requireBlackfox(); if (!session) return { success: false, error: "Unauthorized" };
 */
export async function requireBlackfox() {
    const session = await auth();
    if (!session?.user) return null;
    const company = (session.user as any).company;
    // If company is not set (legacy users) default to primary access
    if (company && company !== PRIMARY_COMPANY) return null;
    return session;
}

/**
 * Guard: ensures the caller belongs to the vendor company (frameit).
 * Returns the session if authorized, or null if not.
 */
export async function requireVendor() {
    const session = await auth();
    if (!session?.user) return null;
    const company = (session.user as any).company;
    if (company !== VENDOR_COMPANY) return null;
    return session;
}
