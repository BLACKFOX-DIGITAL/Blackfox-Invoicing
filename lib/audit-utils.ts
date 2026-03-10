import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function logAction(params: {
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
}) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        await prisma.auditLog.create({
            data: {
                userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: params.details ? JSON.stringify(params.details) : null,
                // ipAddress could be added here if we had access to headers, 
                // but in Server Actions it's harder without passing it.
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // We don't want to fail the main action if logging fails
    }
}
