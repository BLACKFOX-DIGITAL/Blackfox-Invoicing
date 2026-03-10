"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/types";

export async function logStatementActivity(data: {
    customerId: string;
    startDate: string;
    endDate: string;
    itemCount: number;
    totalAmount: number;
    status: "Sent" | "Downloaded";
}): Promise<ActionResult<null>> {
    return createAction("logStatementActivity", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        await (prisma as any).statementLog.create({
            data: {
                customerId: data.customerId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                itemCount: data.itemCount,
                totalAmount: data.totalAmount,
                status: data.status
            }
        });

        revalidatePath("/statements");
        return { success: true, data: null };
    });
}

export async function getStatementHistory(customerId: string): Promise<ActionResult<any[]>> {
    return createAction("getStatementHistory", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const logs = await (prisma as any).statementLog.findMany({
            where: { customerId },
            orderBy: { sentAt: "desc" },
            take: 10
        });

        return {
            success: true,
            data: logs.map((log: any) => ({
                id: log.id,
                sentAt: log.sentAt.toISOString(),
                startDate: log.startDate.toISOString().split('T')[0],
                endDate: log.endDate.toISOString().split('T')[0],
                itemCount: log.itemCount,
                totalAmount: log.totalAmount.toNumber(),
                status: log.status
            }))
        };
    });
}
