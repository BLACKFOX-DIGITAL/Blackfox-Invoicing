/**
 * Backfill script: Populate missing date/description on InvoiceItem
 * from their linked WorkLog records.
 *
 * Run with: npx tsx scripts/backfill-invoice-items.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Find all invoice items missing date or description
    const items = await prisma.invoiceItem.findMany({
        where: {
            OR: [
                { date: null },
                { date: "" },
                { description: null },
                { description: "" }
            ]
        },
        include: {
            invoice: true
        }
    });

    console.log(`Found ${items.length} invoice items with missing date/description.`);

    let updated = 0;

    for (const item of items) {
        // Find matching work log(s) for this invoice
        const workLogs = await prisma.workLog.findMany({
            where: {
                invoiceId: item.invoiceId,
            },
            include: {
                service: true
            }
        });

        if (workLogs.length === 0) {
            console.log(`  [SKIP] Item ${item.id} (invoice ${item.invoiceId}) — no linked work logs found.`);
            continue;
        }

        // Try to match by service name
        const matchedLog = workLogs.find(wl => {
            const serviceName = wl.service?.name || "";
            return serviceName.toLowerCase() === item.serviceName.toLowerCase();
        }) || workLogs[0]; // Fallback to first work log

        const updates: { date?: string; description?: string } = {};

        if (!item.date || item.date === "") {
            updates.date = matchedLog.date.toISOString().split("T")[0];
        }

        if (!item.description || item.description === "") {
            if (matchedLog.description) {
                updates.description = matchedLog.description;
            }
        }

        if (Object.keys(updates).length > 0) {
            await prisma.invoiceItem.update({
                where: { id: item.id },
                data: updates
            });
            updated++;
            console.log(`  [OK] Item ${item.id} (invoice ${item.invoiceId}, "${item.serviceName}") → date: ${updates.date || "(kept)"}, desc: ${updates.description || "(kept)"}`);
        }
    }

    console.log(`\nDone. Updated ${updated} of ${items.length} items.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
