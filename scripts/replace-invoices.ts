/**
 * Script: Remove old seeded invoices and create new ones from work logs.
 *
 * Run with: npx tsx scripts/replace-invoices.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // ---- STEP 1: Delete old seeded invoices ----
    const oldInvoiceIds = [
        "INV-001", "INV-002", "INV-003", "INV-004", "INV-005",
        "INV-006", "INV-007", "INV-008", "INV-009"
    ];

    // Delete items first (foreign key)
    await prisma.invoiceItem.deleteMany({
        where: { invoiceId: { in: oldInvoiceIds } }
    });

    // Unlink work logs that were tied to old invoices
    await prisma.workLog.updateMany({
        where: { invoiceId: { in: oldInvoiceIds } },
        data: { invoiceId: null, status: "Unbilled" }
    });

    // Delete payments linked to old invoices
    await prisma.payment.deleteMany({
        where: { invoiceId: { in: oldInvoiceIds } }
    });

    // Delete the invoices
    const deleted = await prisma.invoice.deleteMany({
        where: { id: { in: oldInvoiceIds } }
    });
    console.log(`Deleted ${deleted.count} old invoices.`);

    // ---- STEP 2: Gather unbilled work logs grouped by customer ----
    const unbilledLogs = await prisma.workLog.findMany({
        where: { status: "Unbilled" },
        include: { service: true },
        orderBy: { date: "asc" }
    });

    console.log(`Found ${unbilledLogs.length} unbilled work logs.`);

    // Group by customer
    const byCustomer: Record<string, typeof unbilledLogs> = {};
    for (const log of unbilledLogs) {
        const cid = log.customerId;
        if (!byCustomer[cid]) byCustomer[cid] = [];
        byCustomer[cid].push(log);
    }

    const customerIds = Object.keys(byCustomer);
    console.log(`Customers with unbilled logs: ${customerIds.join(", ")}`);

    if (customerIds.length === 0) {
        console.log("No unbilled work logs found. Creating sample invoices with manual items...");

        // Create some sample invoices with manual items
        const customers = await prisma.customer.findMany({ take: 3 });
        const year = new Date().getFullYear();
        let invoiceNum = 1;

        for (const customer of customers) {
            const id = `${year}${String(invoiceNum).padStart(5, "0")}`;
            const invoiceDate = new Date();
            invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 30));
            const dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + 14);

            const items = [
                {
                    serviceName: "Image Retouching",
                    quantity: 50,
                    rate: 5.00,
                    total: 250.00,
                    date: invoiceDate.toISOString().split("T")[0],
                    description: "Batch retouching for product catalog"
                },
                {
                    serviceName: "Clipping Path",
                    quantity: 30,
                    rate: 0.50,
                    total: 15.00,
                    date: invoiceDate.toISOString().split("T")[0],
                    description: "Background removal for e-commerce"
                }
            ];

            const subtotal = items.reduce((s, i) => s + i.total, 0);

            await prisma.invoice.create({
                data: {
                    id,
                    customerId: customer.id,
                    clientName: customer.name,
                    date: invoiceDate,
                    dueDate,
                    subtotal,
                    tax: 0,
                    total: subtotal,
                    status: "Draft",
                    items: { create: items }
                }
            });

            console.log(`  Created invoice ${id} for ${customer.id} — $${subtotal.toFixed(2)}`);
            invoiceNum++;
        }

        console.log(`\nDone. Created ${invoiceNum - 1} new invoices.`);
        return;
    }

    // ---- STEP 3: Create invoices from actual unbilled work logs ----
    const year = new Date().getFullYear();

    // Find the latest numeric invoice ID to avoid conflicts
    const lastInvoice = await prisma.invoice.findFirst({
        where: { id: { lt: "a" } },
        orderBy: { id: "desc" }
    });

    let invoiceNum = 1;
    if (lastInvoice && /^\d+$/.test(lastInvoice.id)) {
        // Extract the sequence number from e.g. "202600001"
        const numStr = lastInvoice.id.slice(-5);
        invoiceNum = parseInt(numStr) + 1;
    }

    for (const customerId of customerIds) {
        const logs = byCustomer[customerId];
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) continue;

        const id = `${year}${String(invoiceNum).padStart(5, "0")}`;

        const items = logs.map(log => ({
            serviceName: log.service?.name || "Service",
            quantity: log.quantity.toNumber(),
            rate: log.rate.toNumber(),
            total: log.total.toNumber(),
            date: log.date.toISOString().split("T")[0],
            description: log.description || ""
        }));

        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const invoiceDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (customer.paymentTerms || 14));

        const invoice = await prisma.invoice.create({
            data: {
                id,
                customerId,
                clientName: customer.name,
                date: invoiceDate,
                dueDate,
                subtotal,
                tax: 0,
                total: subtotal,
                status: "Draft",
                items: { create: items }
            }
        });

        // Mark work logs as Billed
        await prisma.workLog.updateMany({
            where: { id: { in: logs.map(l => l.id) } },
            data: { status: "Billed", invoiceId: invoice.id }
        });

        console.log(`  Created invoice ${id} for ${customerId} (${customer.name}) — $${subtotal.toFixed(2)} with ${logs.length} items`);
        invoiceNum++;
    }

    console.log(`\nDone. Created ${invoiceNum - 1} new invoices from work logs.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
