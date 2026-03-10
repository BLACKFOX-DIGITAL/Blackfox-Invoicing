"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth, hasRole, ROLES } from "@/auth";
import { createAction } from "@/lib/action-utils";
import { ActionResult } from "@/lib/types";
import { cache } from "react";

type SerializedService = {
    id: string;
    name: string;
    description: string;
    rate: number;
    customerId: string | null;
    customerName: string | null;
};

export const getServices = cache(async (): Promise<ActionResult<SerializedService[]>> => {
    return createAction("getServices", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const services = await prisma.service.findMany({
            orderBy: { name: 'asc' },
        });

        const isVendor = (session.user as any)?.company === "frameit";

        const data = services.map(service => ({
            ...service,
            customerName: isVendor && service.customerName ? `Confidential` : service.customerName,
            rate: isVendor ? 0 : service.rate.toNumber()
        }));

        return { success: true, data };
    });
});

export const getService = cache(async (id: string) => {
    return createAction("getService", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const service = await prisma.service.findUnique({
            where: { id },
            include: { customer: true }
        });

        if (!service) {
            return { success: false, error: "Service not found" };
        }

        const isVendor = (session.user as any)?.company === "frameit";

        return {
            success: true,
            data: { 
                ...service, 
                customerName: isVendor && service.customerName ? `Confidential` : service.customerName,
                customer: service.customer ? {
                    ...service.customer,
                    name: isVendor ? `Confidential` : service.customer.name,
                    email: isVendor ? null : service.customer.email
                } : null,
                rate: isVendor ? 0 : service.rate.toNumber() 
            }
        };
    });
});

export async function createService(data: {
    name: string;
    description: string;
    rate: number;
    customerId: string;
    customerName: string;
}): Promise<ActionResult<{ id: string }>> {
    return createAction("createService", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        if (!data.customerId) {
            return { success: false, error: "Customer ID is required to create a service." };
        }

        const service = await prisma.service.create({
            data: {
                id: `svc-${crypto.randomUUID()}`,
                name: data.name,
                description: data.description,
                rate: data.rate,
                customerId: data.customerId || null,
                customerName: data.customerName || null
            }
        });

        revalidatePath("/services");
        return { success: true, data: { id: service.id } };
    });
}

export async function updateService(
    id: string,
    data: {
        name?: string;
        description?: string;
        rate?: number;
        customerId?: string | null;
        customerName?: string | null;
    }
): Promise<ActionResult<{ id: string }>> {
    return createAction("updateService", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        // Cascade rate update to all Unbilled work logs linked to this service
        if (data.rate !== undefined) {
            const unbilledLogs = await prisma.workLog.findMany({
                where: {
                    serviceId: id,
                    status: "Unbilled"
                }
            });

            if (unbilledLogs.length > 0) {
                const updates = unbilledLogs.map(log => {
                    const newRate = data.rate!;
                    const newTotal = log.quantity.toNumber() * newRate;
                    return prisma.workLog.update({
                        where: { id: log.id },
                        data: {
                            rate: newRate,
                            total: newTotal
                        }
                    });
                });

                // Atomically update both work logs and the service so nothing breaks in between
                await prisma.$transaction([
                    prisma.service.update({ where: { id }, data }),
                    ...updates
                ]);

                revalidatePath("/services");
                revalidatePath("/work-logs");
                return { success: true, data: { id } };
            }
        }

        const service = await prisma.service.update({
            where: { id },
            data
        });

        revalidatePath("/services");
        revalidatePath("/work-logs");
        return { success: true, data: { id: service.id } };
    });
}

export async function deleteService(id: string): Promise<ActionResult<null>> {
    return createAction("deleteService", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Only Owners can delete services." };

        // Check if service is used in any work logs
        const workLogsCount = await prisma.workLog.count({
            where: { serviceId: id }
        });

        if (workLogsCount > 0) {
            return {
                success: false,
                error: `Cannot delete this service because it is used by ${workLogsCount} work log(s). Please delete the work logs first or archive the service.`
            };
        }

        await prisma.service.delete({ where: { id } });
        revalidatePath("/services");
        return { success: true, data: null };
    });
}
