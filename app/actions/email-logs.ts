"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ActionResult } from "@/lib/types";
import { createAction } from "@/lib/action-utils";

export async function getEmailLogs(): Promise<ActionResult<any[]>> {
    return createAction("getEmailLogs", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const logs = await prisma.emailLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return {
            success: true,
            data: logs.map(log => ({
                ...log,
                createdAt: log.createdAt.toISOString()
            }))
        };
    });
}

export async function createEmailLog(data: {
    to: string;
    subject: string;
    body: string;
    status: string;
    invoiceId?: string;
    customerId?: string;
    errorMsg?: string;
    messageId?: string;
}): Promise<ActionResult<{ id: number }>> {
    return createAction("createEmailLog", async () => {
        // QA-09 fix: require a valid session before writing log entries
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const log = await prisma.emailLog.create({
            data: {
                to: data.to,
                subject: data.subject,
                body: data.body,
                status: data.status,
                invoiceId: data.invoiceId || null,
                customerId: data.customerId || null,
                errorMsg: data.errorMsg || null,
                messageId: data.messageId || null
            }
        });

        revalidatePath("/email-logs");
        return { success: true, data: { id: log.id } };
    });
}

export async function getEmailLogStats(): Promise<ActionResult<{
    total: number;
    sent: number;
    failed: number;
}>> {
    return createAction("getEmailLogStats", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const [total, sent, failed] = await Promise.all([
            prisma.emailLog.count(),
            prisma.emailLog.count({ where: { status: "Sent" } }),
            prisma.emailLog.count({ where: { status: "Failed" } })
        ]);

        return {
            success: true,
            data: { total, sent, failed }
        };
    });
}
