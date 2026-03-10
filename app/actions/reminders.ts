"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit-utils";
import { ActionResult } from "@/lib/types";

export async function getQueuedReminders(): Promise<ActionResult<any[]>> {
    return createAction("getQueuedReminders", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const invoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["Sent", "Partially Paid", "Overdue"] },
                dueDate: { not: null },
                OR: [
                    { snoozedUntil: null },
                    { snoozedUntil: { lt: today } }
                ]
            },
            include: { customer: true }
        }) as any[];

        const queued = [];

        for (const invoice of invoices) {
            const customerEmail = invoice.customer?.email || invoice.customer?.contactEmail;
            if (!invoice.dueDate || !customerEmail) continue;

            const dueDate = new Date(invoice.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            // Find the earliest upcoming reminder within the next 7 days.
            // Schedule: 3 days before, on due date, 3 days after, then every 15 days.
            for (let i = 0; i <= 7; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(today.getDate() + i);

                const diffTime = checkDate.getTime() - dueDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let type = "";
                if (diffDays === -3) type = "Upcoming (3 Days Before)";
                else if (diffDays === 0) type = "Due Today";
                else if (diffDays === 3) type = "Overdue (3 Days After)";
                else if (diffDays > 3 && (diffDays - 3) % 15 === 0) type = "Overdue (Recurring)";

                if (type) {
                    queued.push({
                        id: invoice.id,
                        invoiceId: invoice.id,
                        customerName: invoice.customer.name,
                        customerEmail: customerEmail,
                        dueDate: invoice.dueDate,
                        reminderDate: checkDate,
                        type,
                        amount: invoice.total.toNumber(),
                        currency: invoice.customer.currency
                    });
                    break; // Only show the earliest next reminder
                }
            }
        }

        return {
            success: true,
            data: queued.sort((a, b) => a.reminderDate.getTime() - b.reminderDate.getTime())
        };
    });
}

export async function snoozeInvoice(invoiceId: string, days: number = 7): Promise<ActionResult<null>> {
    return createAction("snoozeInvoice", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const snoozedUntil = new Date();
        snoozedUntil.setDate(snoozedUntil.getDate() + days);

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: { snoozedUntil } as any
        });

        await logAction({
            action: "SNOOZE_INVOICE_REMINDERS",
            entityType: "Invoice",
            entityId: invoiceId,
            details: { snoozedUntil }
        });

        revalidatePath("/reminders");
        return { success: true, data: null };
    });
}

export async function getSnoozedReminders(): Promise<ActionResult<any[]>> {
    return createAction("getSnoozedReminders", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const invoices = await prisma.invoice.findMany({
            where: {
                snoozedUntil: { gte: today },
                status: { in: ["Sent", "Partially Paid", "Overdue"] }
            },
            include: { customer: true },
            orderBy: { snoozedUntil: 'asc' }
        }) as any[];

        const snoozed = invoices.map(invoice => ({
            id: invoice.id,
            invoiceId: invoice.id,
            customerName: invoice.customer?.name || "Unknown",
            customerEmail: invoice.customer?.email || invoice.customer?.contactEmail || "No Email",
            dueDate: invoice.dueDate,
            snoozedUntil: invoice.snoozedUntil,
            amount: invoice.total.toNumber(),
            currency: invoice.customer?.currency || "USD"
        }));

        return { success: true, data: snoozed };
    });
}

export async function snoozeMultipleInvoices(invoiceIds: string[], days: number = 7): Promise<ActionResult<null>> {
    return createAction("snoozeMultipleInvoices", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const snoozedUntil = new Date();
        snoozedUntil.setDate(snoozedUntil.getDate() + days);

        await prisma.invoice.updateMany({
            where: { id: { in: invoiceIds } },
            data: { snoozedUntil } as any
        });

        await logAction({
            action: "BATCH_SNOOZE_INVOICE_REMINDERS",
            entityType: "Invoice",
            entityId: "Multiple",
            details: { count: invoiceIds.length, invoiceIds, snoozedUntil }
        });

        revalidatePath("/reminders");
        return { success: true, data: null };
    });
}

export async function unsnoozeInvoices(invoiceIds: string[]): Promise<ActionResult<null>> {
    return createAction("unsnoozeInvoices", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        await prisma.invoice.updateMany({
            where: { id: { in: invoiceIds } },
            data: { snoozedUntil: null } as any
        });

        await logAction({
            action: "UNSNOOZE_INVOICE_REMINDERS",
            entityType: "Invoice",
            entityId: "Multiple",
            details: { count: invoiceIds.length, invoiceIds }
        });

        revalidatePath("/reminders");
        return { success: true, data: null };
    });
}
