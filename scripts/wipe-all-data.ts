/**
 * Script: Wipe all old data — invoices, work logs, services, customers.
 * Respects foreign key order.
 *
 * Run with: npx tsx scripts/wipe-all-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Wiping all data...\n");

    // 1. Delete invoice items
    const items = await prisma.invoiceItem.deleteMany({});
    console.log(`  Deleted ${items.count} invoice items`);

    // 2. Delete payments
    const payments = await prisma.payment.deleteMany({});
    console.log(`  Deleted ${payments.count} payments`);

    // 3. Delete invoices
    const invoices = await prisma.invoice.deleteMany({});
    console.log(`  Deleted ${invoices.count} invoices`);

    // 4. Delete work logs
    const workLogs = await prisma.workLog.deleteMany({});
    console.log(`  Deleted ${workLogs.count} work logs`);

    // 5. Delete services
    const services = await prisma.service.deleteMany({});
    console.log(`  Deleted ${services.count} services`);

    // 6. Delete customers
    const customers = await prisma.customer.deleteMany({});
    console.log(`  Deleted ${customers.count} customers`);

    console.log("\nAll data wiped. Fresh start!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
