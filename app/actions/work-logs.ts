"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

import { auth, hasRole, ROLES } from "@/auth";

// Types for better type safety
type WorkLogWithRelations = {
    id: number;
    date: string;
    customerId: string;
    serviceId: string;
    quantity: number;
    rate: number;
    total: number;
    status: string;
    description: string | null;
    customer: { id: string; name: string; email: string | null } | null;
    service: { id: string; name: string; rate: number };
};

import { ActionResult } from "@/lib/types";
import { createAction } from "@/lib/action-utils";

export async function getWorkLogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'Unbilled' | 'Billed' | 'Archived' | 'All';
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<ActionResult<{
    logs: WorkLogWithRelations[];
    totalCount: number;
    totalPages: number;
}>> {
    return createAction("getWorkLogs", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const userCompany = (session.user as any)?.company || "blackfox";
        const userRole = (session.user as any)?.role || "Worker";
        const userId = (session.user as any)?.id;

        const page = params?.page || 1;
        const limit = params?.limit || 50;
        const search = params?.search || "";
        const status = params?.status || "Unbilled";
        const skip = (page - 1) * limit;

        const where: any = {};

        // Company / role scoping
        // VendorWorker and VendorManager see all work logs; Blackfox users see all — no extra filter
        // VendorManager sees all work logs; Blackfox users see all — no extra filter

        const isVendor = userCompany === "frameit";

        // Search Logic
        if (search) {
            if (isVendor) {
                // Vendors cannot search by customer name
                where.OR = [
                    { description: { contains: search, mode: 'insensitive' } },
                    { service: { name: { contains: search, mode: 'insensitive' } } }
                ];
            } else {
                where.OR = [
                    { description: { contains: search, mode: 'insensitive' } },
                    { customer: { name: { contains: search, mode: 'insensitive' } } },
                    { service: { name: { contains: search, mode: 'insensitive' } } }
                ];
            }
        }

        // Customer Filter
        if (params?.customerId) {
            where.customerId = params.customerId;
        }

        // Date Range Filter
        if (params?.dateFrom || params?.dateTo) {
            where.date = {};
            if (params.dateFrom) where.date.gte = new Date(params.dateFrom);
            if (params.dateTo) where.date.lte = new Date(params.dateTo);
        }

        // Status Logic
        const fortyFiveDaysAgo = new Date();
        fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

        if (status === 'Unbilled') {
            where.status = 'Unbilled';
        } else if (status === 'Billed') {
            where.status = 'Billed';
            // Optional: Filter recently billed if needed, but existing logic was just status
            where.date = { ...where.date, gte: fortyFiveDaysAgo };
        } else if (status === 'Archived') {
            where.OR = [
                { status: 'Paid' },
                {
                    status: 'Billed',
                    date: { lt: fortyFiveDaysAgo }
                }
            ];
            // If we have other search params, we need to be careful with OR
            // Prisma AND/OR structure can be tricky.
            // Let's Simplify: If status is Archived, we enforce the archiving rules.
            // If user searches within Archived, it applies to both conditions.
        }

        // Combine Status OR with Search OR if both exist?
        // Actually, for Archived, it's specific.
        // Let's refine the Status Logic to be safer with other filters.
        if (status === 'Archived') {
            const archiveCondition = {
                OR: [
                    { status: 'Paid' },
                    { status: 'Billed', date: { lt: fortyFiveDaysAgo } }
                ]
            };

            if (where.OR) {
                where.AND = [
                    archiveCondition,
                    { OR: where.OR }
                ];
                delete where.OR; // Move search OR to AND
            } else {
                Object.assign(where, archiveCondition);
            }
        }

        const [logs, totalCount] = await Promise.all([
            prisma.workLog.findMany({
                where,
                orderBy: { date: 'desc' },
                include: {
                    customer: true,
                    service: true
                },
                skip,
                take: limit
            }),
            prisma.workLog.count({ where })
        ]);


        const serializedLogs: WorkLogWithRelations[] = logs.map(log => ({
            ...log,
            id: log.id,
            date: log.date.toISOString().split('T')[0],
            quantity: log.quantity.toNumber(),
            rate: isVendor ? 0 : log.rate.toNumber(),
            total: isVendor ? 0 : log.total.toNumber(),
            customer: log.customer ? {
                id: log.customer.id,
                name: isVendor ? `Confidential` : log.customer.name,
                email: isVendor ? null : log.customer.email
            } : null,
            service: {
                id: log.service.id,
                name: log.service.name,
                rate: isVendor ? 0 : log.service.rate.toNumber()
            }
        }));

        const totalPages = Math.ceil(totalCount / limit);

        return {
            success: true,
            data: {
                logs: serializedLogs,
                totalCount,
                totalPages
            }
        };
    });
}

export async function createWorkLog(data: {
    date: string;
    customerId: string;
    serviceId: string;
    description?: string;
    quantity: number;
    rate: number;
}): Promise<ActionResult<{ id: number }>> {
    return createAction("createWorkLog", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const isRestricted = (session.user as any)?.role === "Worker" || (session.user as any)?.role === "VendorWorker" || (session.user as any)?.role === "VendorManager" || (session.user as any)?.company === "frameit";

        let finalRate = data.rate;
        if (isRestricted || data.rate === 0) {
            const service = await prisma.service.findUnique({ where: { id: data.serviceId }, select: { rate: true } });
            finalRate = service ? service.rate.toNumber() : 0;
        }

        const total = data.quantity * finalRate;

        const log = await prisma.workLog.create({
            data: {
                date: new Date(data.date),
                customerId: data.customerId,
                serviceId: data.serviceId,
                description: data.description,
                quantity: data.quantity,
                rate: finalRate,
                total: total,
                status: "Unbilled",
                createdByUserId: session.user?.id || null
            }
        });

        revalidatePath("/work-logs");
        return { success: true, data: { id: log.id } };
    });
}

export async function createWorkLogsBatch(logs: {
    date: string;
    customerId: string;
    serviceId?: string;
    serviceName?: string;
    description?: string;
    quantity: number;
    rate: number;
}[]): Promise<ActionResult<{ count: number }>> {
    return createAction("createWorkLogsBatch", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        // Find existing customers and create placeholders for any missing ones
        const uniqueCustomerIds = Array.from(new Set(logs.map(l => l.customerId)));
        const existingCustomers = await prisma.customer.findMany({
            where: { id: { in: uniqueCustomerIds } },
            select: { id: true }
        });
        const existingIds = new Set(existingCustomers.map(c => c.id));
        const missingIds = uniqueCustomerIds.filter(id => !existingIds.has(id));

        if (missingIds.length > 0) {
            const placeholders = missingIds.map(id => ({
                id,
                name: `Missing Customer (${id})`,
                status: 'Active',
                currency: 'USD'
            }));
            await prisma.customer.createMany({
                data: placeholders
            });
        }

        // Find existing services to avoid duplicates
        const currentServices = await prisma.service.findMany({ select: { id: true, name: true, customerId: true, rate: true } });
        const createdServicesMap = new Map<string, { id: string, rate: number }>(); // 'serviceName-customerId' -> object

        const isRestricted = (session.user as any)?.role === "Worker" || (session.user as any)?.role === "VendorWorker" || (session.user as any)?.role === "VendorManager" || (session.user as any)?.company === "frameit";

        const formattedLogs = [];
        for (const log of logs) {
            let finalServiceId = log.serviceId;
            let finalRate = log.rate;

            if (!finalServiceId && log.serviceName) {
                const mapKey = `${log.serviceName}-${log.customerId}`;
                // Check if it exists in DB (case-insensitive)
                const existing = currentServices.find(s =>
                    s.name.toLowerCase() === log.serviceName!.toLowerCase() &&
                    (s.customerId === log.customerId || !s.customerId)
                );

                if (existing) {
                    finalServiceId = existing.id;
                    if (isRestricted || log.rate === 0) finalRate = existing.rate.toNumber();
                } else if (createdServicesMap.has(mapKey)) {
                    finalServiceId = createdServicesMap.get(mapKey)!.id;
                    if (isRestricted || log.rate === 0) finalRate = createdServicesMap.get(mapKey)!.rate;
                } else {
                    // Create new service
                    const generatedId = `svc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    const newServiceRate = log.rate || 0;
                    const newService = await prisma.service.create({
                        data: {
                            id: generatedId,
                            name: log.serviceName,
                            description: `Auto-created from bulk import`,
                            rate: newServiceRate,
                            customerId: log.customerId
                        }
                    });
                    finalServiceId = newService.id;
                    createdServicesMap.set(mapKey, { id: finalServiceId, rate: newServiceRate });
                    if (isRestricted || log.rate === 0) finalRate = newServiceRate;
                }
            } else if (finalServiceId) {
                if (isRestricted || log.rate === 0) {
                     const existing = currentServices.find(s => s.id === finalServiceId);
                     if (existing) finalRate = existing.rate.toNumber();
                }
            }

            if (!finalServiceId) {
                throw new Error("Missing required service ID");
            }

            formattedLogs.push({
                date: new Date(log.date),
                customerId: log.customerId,
                serviceId: finalServiceId as string,
                description: log.description,
                quantity: log.quantity,
                rate: finalRate,
                total: log.quantity * finalRate,
                status: "Unbilled",
                createdByUserId: session.user?.id || null
            });
        }

        // createMany is supported in SQLite for recent Prisma versions
        const result = await prisma.workLog.createMany({
            data: formattedLogs
        });

        revalidatePath("/work-logs");
        return { success: true, data: { count: result.count } };
    });
}

export async function updateWorkLog(
    id: number,
    data: {
        date?: string;
        customerId?: string;
        serviceId?: string;
        description?: string;
        quantity?: number;
        rate?: number;
        status?: string;
    }
): Promise<ActionResult<{ id: number }>> {
    return createAction("updateWorkLog", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        // Check if work log is Billed (immutable)
        const existing = await prisma.workLog.findUnique({ where: { id } });
        if (existing?.status === "Billed") {
            return { success: false, error: "Cannot edit a billed work log. It has already been invoiced." };
        }
        if (!existing) {
            return { success: false, error: "Work log not found." };
        }

        // SEC-M3: Ownership check — Workers can only edit their own logs
        const userRole = (session.user as any)?.role;
        const userId = (session.user as any)?.id;
        const isManager = ["Owner", "Manager", "VendorManager"].includes(userRole);
        if (!isManager && existing.createdByUserId !== userId) {
            return { success: false, error: "Unauthorized: You can only edit your own work logs." };
        }

        const updateData: any = { ...data };

        if (data.date) updateData.date = new Date(data.date);

        const isRestricted = (session.user as any)?.role === "Worker" || (session.user as any)?.role === "VendorWorker" || (session.user as any)?.role === "VendorManager" || (session.user as any)?.company === "frameit";

        let newRate = data.rate ?? existing.rate.toNumber();
        const newQuantity = data.quantity ?? existing.quantity.toNumber();

        if (isRestricted || data.rate === 0) {
            const targetServiceId = data.serviceId || existing.serviceId;
            const service = await prisma.service.findUnique({ where: { id: targetServiceId }, select: { rate: true } });
            newRate = service ? service.rate.toNumber() : 0;
            updateData.rate = newRate; 
        }

        if (data.quantity !== undefined || data.rate !== undefined || isRestricted) {
            updateData.total = newQuantity * newRate;
        }

        const log = await prisma.workLog.update({
            where: { id },
            data: updateData
        });

        revalidatePath("/work-logs");
        return { success: true, data: { id: log.id } };
    });
}

export async function deleteWorkLog(id: number): Promise<ActionResult<null>> {
    return createAction("deleteWorkLog", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        // Check if work log is Billed (immutable)
        const existing = await prisma.workLog.findUnique({ where: { id } });
        if (existing?.status === "Billed") {
            return { success: false, error: "Cannot delete a billed work log. It has already been invoiced." };
        }
        if (!existing) {
            return { success: false, error: "Work log not found." };
        }

        // SEC-M3: Ownership check
        const userRole = (session.user as any)?.role;
        const userId = (session.user as any)?.id;
        const isManager = ["Owner", "Manager", "VendorManager"].includes(userRole);
        if (!isManager && existing.createdByUserId !== userId) {
            return { success: false, error: "Unauthorized: You can only delete your own work logs." };
        }

        await prisma.workLog.delete({ where: { id } });
        revalidatePath("/work-logs");
        return { success: true, data: null };
    });
}

export async function deleteWorkLogsBatch(ids: number[]): Promise<ActionResult<{ count: number }>> {
    return createAction("deleteWorkLogsBatch", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const userRole = (session.user as any)?.role;
        const userId = (session.user as any)?.id;
        const isManager = ["Owner", "Manager", "VendorManager"].includes(userRole);

        // Find existing to ensure we don't delete billed logs
        const existing = await prisma.workLog.findMany({
            where: { id: { in: ids } }
        });

        const unbilledIds = existing
            .filter(log => log.status !== "Billed")
            // SEC-M3: Workers can only delete their own logs
            .filter(log => isManager || log.createdByUserId === userId)
            .map(log => log.id);

        if (unbilledIds.length === 0 && ids.length > 0) {
            return { success: false, error: "Cannot delete billed work logs. They have already been invoiced." };
        }

        const result = await prisma.workLog.deleteMany({
            where: { id: { in: unbilledIds } }
        });

        revalidatePath("/work-logs");
        return { success: true, data: { count: result.count } };
    });
}

export async function getMonthlyImageCount(): Promise<ActionResult<number>> {
    return createAction("getMonthlyImageCount", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const result = await prisma.workLog.aggregate({
            _sum: {
                quantity: true
            },
            where: {
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const totalImages = result._sum.quantity ? result._sum.quantity.toNumber() : 0;

        return { success: true, data: totalImages };
    });
}

export async function getLastMonthImageCount(): Promise<ActionResult<number>> {
    return createAction("getLastMonthImageCount", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const now = new Date();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        endOfLastMonth.setHours(23, 59, 59, 999);

        const result = await prisma.workLog.aggregate({
            _sum: {
                quantity: true
            },
            where: {
                date: {
                    gte: startOfLastMonth,
                    lte: endOfLastMonth
                }
            }
        });

        const totalImages = result._sum.quantity ? result._sum.quantity.toNumber() : 0;

        return { success: true, data: totalImages };
    });
}

export async function getYearlyImageCount(): Promise<ActionResult<number>> {
    return createAction("getYearlyImageCount", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

        const result = await prisma.workLog.aggregate({
            _sum: {
                quantity: true
            },
            where: {
                date: {
                    gte: startOfYear,
                    lte: endOfYear
                }
            }
        });

        const totalImages = result._sum.quantity ? result._sum.quantity.toNumber() : 0;

        return { success: true, data: totalImages };
    });
}
