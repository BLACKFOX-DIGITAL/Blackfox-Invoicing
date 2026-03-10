"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAction } from "@/lib/action-utils";
import { ActionResult } from "@/lib/types";

export type AuditNotification = {
    id: string;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    date: string;
    read: boolean;
};

/**
 * QA-02: Map AuditLog entries to the Notification format.
 * "Read" state is ephemeral (client-side only) since AuditLog has no read flag.
 */
export async function getAuditNotifications(): Promise<ActionResult<AuditNotification[]>> {
    return createAction("getAuditNotifications", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        const data: AuditNotification[] = logs.map((log) => {
            // Derive notification type from action verb
            let type: AuditNotification["type"] = "info";
            const action = log.action.toUpperCase();
            if (action.startsWith("DELETE")) type = "warning";
            else if (action.startsWith("CREATE")) type = "success";
            else if (action.includes("PAYMENT")) type = "success";
            else if (action.includes("FAIL") || action.includes("ERROR")) type = "error";

            // Human-readable title
            const title = log.action
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase());

            // Detail message
            let message = `${log.entityType} #${log.entityId}`;
            if (log.details) {
                try {
                    const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
                    if (details.name) message = `${log.entityType}: ${details.name}`;
                    else if (details.amount) message = `${log.entityType} — Amount: $${details.amount}`;
                } catch {
                    // use default message
                }
            }

            return {
                id: log.id,
                title,
                message,
                type,
                date: log.createdAt.toISOString(),
                read: false, // ephemeral; managed client-side
            };
        });

        return { success: true, data };
    });
}
