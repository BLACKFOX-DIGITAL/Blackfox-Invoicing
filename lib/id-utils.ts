import { prisma } from "@/lib/db";

/**
 * Gets the next available ID from a named counter.
 * Uses a transaction to ensure atomicity.
 */
export async function getNextCounterValue(name: string, tx?: any): Promise<number> {
    const client = tx || prisma;
    const counter = await client.counter.upsert({
        where: { id: name },
        update: { count: { increment: 1 } },
        create: { id: name, count: 1 },
    });
    return counter.count;
}

/**
 * Formats an invoice counter value into a string ID.
 * If the value looks like a full YYYY00000 style ID, returns it as-is.
 * Otherwise, prepends the given year and pads the sequence.
 */
export function formatInvoiceId(count: number, year: number): string {
    // If the count is already a full numeric ID (e.g. 202600001), just return it.
    // Threshold is 100,000,000 (8 digits) to clearly distinguish from small sequences.
    if (count > 10000000) {
        // Optional: If the year in the sequence is older than current year, 
        // we could jump, but per user request we "follow the last manual input".
        return count.toString();
    }
    return `${year}${count.toString().padStart(5, '0')}`;
}

/**
 * Generates a formatted invoice ID (e.g., 202600001)
 */
export async function generateInvoiceId(tx?: any): Promise<string> {
    const nextVal = await getNextCounterValue("invoice", tx);
    const currentYear = new Date().getFullYear();
    return formatInvoiceId(nextVal, currentYear);
}
