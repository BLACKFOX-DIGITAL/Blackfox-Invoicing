"use server";


import { prisma } from "@/lib/db";
import { Decimal } from "decimal.js";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth, hasRole, ROLES } from "@/auth";
import { calculateInvoiceStatus } from "@/lib/invoice-utils";
import { generateInvoiceId, formatInvoiceId } from "@/lib/id-utils";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { logAction } from "@/lib/audit-utils";
import { cache } from "react";
import crypto from "crypto";

import { ActionResult } from "@/lib/types";

type SerializedInvoice = {
    id: string;
    customerId: string;
    clientName: string;
    clientCompany?: string | null;
    clientEmail?: string | null;
    clientPhone?: string | null;
    clientAddress?: string | null;
    clientTaxId?: string | null;
    date: string;
    dueDate: string | null;
    subtotal: number;
    tax: number;
    discount: number;
    discountType: "fixed" | "percentage";
    discountValue: number;
    total: number;
    totalPaid: number;
    balanceDue: number;
    status: string;
    overdueDays?: number;
    items: SerializedInvoiceItem[];
    payments?: SerializedPayment[];
    customer?: {
        name: string;
        contactFirstName?: string;
        contactName?: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        taxId?: string;
        currency?: string;
        paymentMethod?: {
            id: number;
            type: string;
            name: string;
            details: string;
        } | null;
    };
    publicToken?: string | null;
};

export type SerializedPayment = {
    id: number;
    amount: number;
    method: string;
    date: string;
};

type SerializedInvoiceItem = {
    id: string;
    serviceName: string;
    quantity: number;
    rate: number;
    total: number;
    date?: string | null;
    description?: string | null;
};

export type InvoiceStats = {
    overdue: number;
    open: number;
    paid: number;
    unpaidCount: number;
    draftCount: number;
};

export type SerializedInvoiceData = {
    invoices: SerializedInvoice[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    stats: InvoiceStats;
};

export const getInvoices = cache(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    customerId?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<ActionResult<SerializedInvoiceData>> => {
    return createAction("getInvoices", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const page = params?.page || 1;
        const limit = params?.limit || 100; // Default limit
        const skip = (page - 1) * limit;

        const whereWithoutStatus: any = {};

        if (params?.search) {
            whereWithoutStatus.OR = [
                { id: { contains: params.search } },
                { clientName: { contains: params.search } },
            ];
        }

        if (params?.startDate || params?.endDate) {
            whereWithoutStatus.date = {};
            if (params.startDate) whereWithoutStatus.date.gte = new Date(params.startDate);
            if (params.endDate) whereWithoutStatus.date.lte = new Date(params.endDate);
        }

        if (params?.customerId) {
            whereWithoutStatus.customerId = params.customerId;
        }

        const where: any = { ...whereWithoutStatus };

        if (params?.status && params.status !== "all") {
            if (params.status === 'unpaid') {
                where.status = { in: ["Pending", "Sent", "Partially Paid", "Overdue"] };
            } else if (params.status === 'draft') {
                where.status = "Draft";
            } else {
                where.status = params.status;
            }
        }

        const validSortFields = ['id', 'date', 'dueDate', 'total', 'clientName', 'status'];
        const orderBy: any = {};
        if (params?.sortField && validSortFields.includes(params.sortField)) {
            orderBy[params.sortField] = params.sortOrder || 'desc';
        } else {
            orderBy.date = 'desc'; // Default
        }

        // BUG-07 fix: Use parallel DB-side aggregates instead of loading all invoices into memory.
        // The 'whereWithoutStatus' filter is used so stats represent the full filtered set,
        // not just the current page.
        const today = new Date();
        const [invoices, totalCount, overdueAgg, openAgg, paidAgg, draftCount] = await Promise.all([
            prisma.invoice.findMany({
                where,
                orderBy,
                include: { items: true },
                skip,
                take: limit,
            }),
            prisma.invoice.count({ where }),
            // Overdue: status=Overdue OR (Sent/Partially Paid + dueDate in past)
            prisma.invoice.aggregate({
                _sum: { total: true, totalPaid: true },
                where: {
                    ...whereWithoutStatus,
                    OR: [
                        { status: "Overdue" },
                        { status: { in: ["Sent", "Partially Paid"] }, dueDate: { lt: today } }
                    ]
                }
            }),
            // Open: Sent/Pending/Partially Paid, not yet due
            prisma.invoice.aggregate({
                _sum: { total: true, totalPaid: true },
                where: {
                    ...whereWithoutStatus,
                    status: { in: ["Sent", "Pending", "Partially Paid"] },
                    OR: [
                        { dueDate: null },
                        { dueDate: { gte: today } }
                    ]
                }
            }),
            // Paid
            prisma.invoice.aggregate({
                _sum: { totalPaid: true },
                where: {
                    ...whereWithoutStatus,
                    status: { in: ["Paid", "Partially Paid"] }
                }
            }),
            // Draft count
            prisma.invoice.count({
                where: { ...whereWithoutStatus, status: "Draft" }
            })
        ]);

        const overdueBalance = (overdueAgg._sum.total?.toNumber() || 0) - (overdueAgg._sum.totalPaid?.toNumber() || 0);
        const openBalance = (openAgg._sum.total?.toNumber() || 0) - (openAgg._sum.totalPaid?.toNumber() || 0);
        const paidTotal = paidAgg._sum.totalPaid?.toNumber() || 0;
        // unpaidCount = non-paid, non-draft invoices
        const unpaidCount = await prisma.invoice.count({
            where: { ...whereWithoutStatus, status: { in: ["Overdue", "Sent", "Pending", "Partially Paid"] } }
        });

        const stats: InvoiceStats = {
            overdue: overdueBalance,
            open: openBalance,
            paid: paidTotal,
            unpaidCount,
            draftCount
        };


        const data = invoices.map(inv => {
            const { status: derivedStatus, overdueDays } = calculateInvoiceStatus({
                status: inv.status,
                date: inv.date,
                dueDate: inv.dueDate,
                total: inv.total,
                totalPaid: inv.totalPaid || 0
            });

            const totalPaid = inv.totalPaid ? inv.totalPaid.toNumber() : 0;
            const balanceDue = inv.total.toNumber() - totalPaid;

            return {
                id: inv.id,
                customerId: inv.customerId,
                clientName: inv.clientName,
                clientCompany: (inv as any).clientCompany,
                clientEmail: (inv as any).clientEmail,
                clientPhone: (inv as any).clientPhone,
                clientAddress: (inv as any).clientAddress,
                clientTaxId: (inv as any).clientTaxId,
                date: inv.date.toISOString().split('T')[0],
                dueDate: inv.dueDate?.toISOString().split('T')[0] || null,
                subtotal: inv.subtotal.toNumber(),
                tax: inv.tax.toNumber(),
                discount: inv.discount.toNumber(),
                discountType: inv.discountType as "fixed" | "percentage",
                discountValue: inv.discountValue.toNumber(),
                total: inv.total.toNumber(),
                totalPaid,
                balanceDue,
                status: derivedStatus,
                overdueDays: overdueDays > 0 ? overdueDays : undefined,
                items: inv.items.map(item => ({
                    id: item.id,
                    serviceName: item.serviceName,
                    quantity: item.quantity.toNumber(),
                    rate: item.rate.toNumber(),
                    total: item.total.toNumber(),
                    date: item.date ? (typeof (item.date as any) === 'string' ? (item.date as any) : (item.date as unknown as Date).toISOString().split('T')[0]) : undefined,
                    description: item.description || undefined
                })),
                publicToken: inv.publicToken,
            };
        });

        return {
            success: true,
            data: {
                invoices: data,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                stats
            }
        };
    });
});


export const getInvoice = cache(async (id: string): Promise<ActionResult<SerializedInvoice>> => {
    return createAction("getInvoice", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const inv = await prisma.invoice.findUnique({
            where: { id },
            include: {
                items: {
                    orderBy: { date: 'asc' }
                },
                payments: {
                    orderBy: { date: 'asc' }
                },
                customer: {
                    include: { paymentMethod: true }
                }
            }
        });

        if (!inv) {
            return { success: false, error: "Invoice not found" };
        }

        const { status: derivedStatus, overdueDays } = calculateInvoiceStatus({
            status: inv.status,
            date: inv.date,
            dueDate: inv.dueDate,
            total: inv.total,
            totalPaid: inv.totalPaid || 0
        });

        const totalPaid = inv.totalPaid ? inv.totalPaid.toNumber() : 0;
        const balanceDue = inv.total.toNumber() - totalPaid;

        return {
            success: true,
            data: {
                id: inv.id,
                customerId: inv.customerId,
                clientName: inv.clientName,
                clientCompany: (inv as any).clientCompany,
                clientEmail: (inv as any).clientEmail,
                clientPhone: (inv as any).clientPhone,
                clientAddress: (inv as any).clientAddress,
                clientTaxId: (inv as any).clientTaxId,
                date: inv.date.toISOString().split('T')[0],
                dueDate: inv.dueDate?.toISOString().split('T')[0] || null,
                subtotal: inv.subtotal.toNumber(),
                tax: inv.tax.toNumber(),
                discount: inv.discount.toNumber(),
                discountType: inv.discountType as "fixed" | "percentage",
                discountValue: inv.discountValue.toNumber(),
                total: inv.total.toNumber(),
                totalPaid,
                balanceDue,
                status: derivedStatus,
                overdueDays: overdueDays > 0 ? overdueDays : undefined,
                items: inv.items.map(item => ({
                    id: item.id,
                    serviceName: item.serviceName,
                    quantity: item.quantity.toNumber(),
                    rate: item.rate.toNumber(),
                    total: item.total.toNumber(),
                    date: item.date ? (typeof item.date === 'string' ? item.date : (item.date as Date).toISOString().split('T')[0]) : undefined,
                    description: item.description || undefined
                })),
                payments: inv.payments ? inv.payments.map((p: any) => ({
                    id: p.id,
                    amount: p.amount?.toNumber ? p.amount.toNumber() : Number(p.amount),
                    method: p.method,
                    date: p.date.toISOString().split('T')[0]
                })) : [],
                customer: inv.customer ? {
                    name: inv.customer.name,
                    contactFirstName: (inv.customer as any).contactFirstName || undefined,
                    contactName: [(inv.customer as any).contactFirstName, (inv.customer as any).contactMiddleName, (inv.customer as any).contactLastName].filter(Boolean).join(" ") || undefined,
                    email: inv.customer.email || "",
                    phone: inv.customer.phone || undefined,
                    address: inv.customer.address || undefined,
                    city: inv.customer.city || undefined,
                    state: inv.customer.state || undefined,
                    zip: inv.customer.zip || undefined,
                    country: inv.customer.country || undefined,
                    taxId: inv.customer.taxId || undefined,
                    currency: inv.customer.currency || undefined,
                    paymentMethod: inv.customer.paymentMethod ? {
                        id: inv.customer.paymentMethod.id,
                        type: inv.customer.paymentMethod.type,
                        name: inv.customer.paymentMethod.name,
                        details: inv.customer.paymentMethod.details,
                    } : null
                } : undefined,
                publicToken: inv.publicToken,
            }
        };
    });
});

import { z } from "zod";

const CreateInvoiceSchema = z.object({
    customerId: z.string().min(1, "Customer ID is required"),
    clientName: z.string().min(1, "Client name is required"),
    clientCompany: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),
    clientTaxId: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    dueDate: z.string().optional(),
    subtotal: z.number().min(0),
    tax: z.number().min(0),
    discount: z.number().min(0).default(0),
    discountType: z.enum(["fixed", "percentage"]).default("fixed"),
    discountValue: z.number().min(0).default(0),
    total: z.number().min(0),
    workLogIds: z.array(z.number()).optional(),
    id: z.string().optional(), // Allow custom ID
    items: z.array(z.object({
        serviceName: z.string().min(1),
        quantity: z.number().min(0.01),
        rate: z.number().min(0),
        total: z.number().min(0),
        date: z.string().optional(),
        description: z.string().optional(),
    })).min(1, "At least one item is required"),
    rateOverrides: z.record(z.string(), z.number()).optional(),
});

export async function createInvoice(rawData: z.infer<typeof CreateInvoiceSchema>): Promise<ActionResult<{ id: string }>> {
    return createAction("createInvoice", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const data = CreateInvoiceSchema.parse(rawData);

        // Atomic ID generation inside a transaction with 10s timeout
        return await prisma.$transaction(async (tx) => {
            let id = data.id;

            if (!id) {
                // Use robust counter-based ID generation
                // Pass 'tx' to share the transaction context and avoid timeouts
                id = await generateInvoiceId(tx);
            } else {
                // Check for duplicate ID if custom provided
                const existing = await tx.invoice.findUnique({ where: { id } });
                if (existing) {
                    throw new Error(`Invoice ID ${id} already exists.`);
                }

                // Auto-sync sequence generator based on manual ID input
                try {
                    const currentYearStr = new Date().getFullYear().toString();
                    let sequenceNum: number | null = null;

                    if (id.startsWith(currentYearStr) && id.length > 4 && !isNaN(Number(id))) {
                        // If it's the current year sequence, but we want to store the WHOLE number 
                        // so that generateInvoiceId (using formatInvoiceId) works correctly.
                        sequenceNum = parseInt(id, 10);
                    } else if (!isNaN(Number(id))) {
                        sequenceNum = parseInt(id, 10);
                    } else {
                        const match = id.match(/\d+$/);
                        if (match) sequenceNum = parseInt(match[0], 10);
                    }

                    if (sequenceNum !== null && !isNaN(sequenceNum)) {
                        const existingCounter = await tx.counter.findUnique({ where: { id: "invoice" } });
                        if (!existingCounter || existingCounter.count < sequenceNum) {
                            await tx.counter.upsert({
                                where: { id: "invoice" },
                                update: { count: sequenceNum },
                                create: { id: "invoice", count: sequenceNum }
                            });
                        }
                    }
                } catch (err) {
                    console.error("Failed to sync manual invoice id logic", err);
                }
            }

            const createData: any = {
                id,
                customerId: data.customerId,
                clientName: data.clientName,
                clientCompany: data.clientCompany,
                clientEmail: data.clientEmail,
                clientPhone: data.clientPhone,
                clientAddress: data.clientAddress,
                clientTaxId: data.clientTaxId,
                date: new Date(data.date),
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                subtotal: data.subtotal,
                tax: data.tax,
                discount: data.discount,
                discountType: data.discountType,
                discountValue: data.discountValue,
                total: data.total,
                status: "Draft",
                items: {
                    create: data.items.map(item => ({
                        serviceName: item.serviceName,
                        quantity: item.quantity,
                        rate: item.rate,
                        total: item.total,
                        date: item.date ? (typeof item.date === 'string' ? item.date : new Date(item.date).toISOString()) : null,
                        description: item.description
                    }))
                },
                publicToken: crypto.randomUUID()
            };

            const invoice = await tx.invoice.create({
                data: createData
            });

            // Mark work logs as Billed and link to invoice
            if (data.workLogIds && data.workLogIds.length > 0) {
                // If there are bulk rate overrides, update the original associated work logs 
                if (data.rateOverrides && Object.keys(data.rateOverrides).length > 0) {
                    const logsToUpdate = await tx.workLog.findMany({
                        where: {
                            id: { in: data.workLogIds },
                            status: "Unbilled"
                        },
                        include: { service: true }
                    });

                    for (const log of logsToUpdate) {
                        const serviceName = log.service?.name || (log as any).serviceName || "Service";
                        const overrideRate = data.rateOverrides[serviceName];

                        // Apply new custom rate if it matches the service name mapped
                        if (overrideRate !== undefined) {
                            const newTotal = new Decimal(overrideRate).times(log.quantity).toNumber();
                            await tx.workLog.update({
                                where: { id: log.id },
                                data: {
                                    rate: overrideRate,
                                    total: newTotal,
                                    status: "Billed",
                                    invoiceId: invoice.id
                                }
                            });
                        } else {
                            // Standard billed status update without rate override
                            await tx.workLog.update({
                                where: { id: log.id },
                                data: {
                                    status: "Billed",
                                    invoiceId: invoice.id
                                }
                            });
                        }
                    }
                } else {
                    // Update all with standard billed status if no overrides
                    await tx.workLog.updateMany({
                        where: {
                            id: { in: data.workLogIds },
                            status: "Unbilled"
                        },
                        data: {
                            status: "Billed",
                            invoiceId: invoice.id
                        }
                    });
                }
            }

            await logAction({
                action: "CREATE_INVOICE",
                entityType: "Invoice",
                entityId: invoice.id,
                details: { total: data.total }
            });

            revalidatePath("/invoices");
            revalidatePath("/work-logs");
            revalidateTag("dashboard", "default");
            return { success: true, data: { id: invoice.id } };
        }, { timeout: 10000 });
    });
}

export async function updateInvoiceStatus(
    id: string,
    status: string
): Promise<ActionResult<{ id: string }>> {
    try {
        const invoice = await prisma.invoice.update({
            where: { id },
            data: { status }
        });

        await logAction({
            action: "UPDATE_INVOICE_STATUS",
            entityType: "Invoice",
            entityId: id,
            details: { status }
        });

        revalidatePath("/invoices");
        revalidatePath(`/invoices/${id}`);
        revalidateTag("dashboard", "default");
        return { success: true, data: { id: invoice.id } };
    } catch (error) {
        console.error("Failed to update invoice status:", error);
        return { success: false, error: "Failed to update invoice" };
    }
}

const UpdateInvoiceSchema = z.object({
    id: z.string().min(1),
    date: z.string().min(1),
    dueDate: z.string().optional(),
    subtotal: z.number().min(0),
    total: z.number().min(0),
    items: z.array(z.object({
        serviceName: z.string().min(1),
        quantity: z.number().min(0.01),
        rate: z.number().min(0),
        total: z.number().min(0),
        date: z.string().optional(),
        description: z.string().optional(),
    })).min(1),
});

export async function updateInvoiceDetails(
    rawData: z.infer<typeof UpdateInvoiceSchema>
): Promise<ActionResult<{ id: string }>> {
    return createAction("updateInvoiceDetails", async () => {
        const data = UpdateInvoiceSchema.parse(rawData);
        const { id, items, ...updateData } = data;

        // Verify Not Paid
        const existing = await prisma.invoice.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Invoice not found" };
        if (existing.status === "Paid") return { success: false, error: "Cannot edit paid invoice" };

        // Transaction: Update Invoice Metadata & Replace Items
        await prisma.$transaction(async (tx) => {
            // 1. Update Invoice Metadata
            await tx.invoice.update({
                where: { id },
                data: {
                    date: new Date(updateData.date),
                    dueDate: updateData.dueDate ? new Date(updateData.dueDate) : null,
                    subtotal: updateData.subtotal,
                    total: updateData.total,
                    // If status was Draft, keep it. If Sent/Overdue/Partially Paid, logic remains same.
                }
            });

            // 2. Delete existing items
            await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

            // 3. Create new items
            await tx.invoiceItem.createMany({
                data: items.map(item => ({
                    invoiceId: id,
                    serviceName: item.serviceName,
                    quantity: item.quantity,
                    rate: item.rate,
                    total: item.total,
                    date: item.date,
                    description: item.description
                }))
            });

            // Note: We are NOT touching WorkLogs here. Editing an invoice decouples it from worklogs
            // unless we want to complexity of syncing back.
            // For now, assume edits are local to the invoice document.
        }, { timeout: 10000 });

        await logAction({
            action: "UPDATE_INVOICE_DETAILS",
            entityType: "Invoice",
            entityId: id,
            details: { total: updateData.total }
        });

        revalidatePath("/invoices");
        revalidatePath(`/invoices/${id}`);
        revalidateTag("dashboard", "default");
        return { success: true, data: { id } };
    });
}

export async function deleteInvoice(id: string): Promise<ActionResult<null>> {
    return createAction("deleteInvoice", async () => {
        // RBAC: Only Owners can delete invoices
        const isAuthorized = await hasRole([ROLES.OWNER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions to delete invoices." };

        // 1. Release Work Logs (Revert to Unbilled and Unlink)
        await prisma.workLog.updateMany({
            where: { invoiceId: id },
            data: {
                status: "Unbilled",
                invoiceId: null
            }
        });

        // 2. Delete items (cascade should handle this, but being explicit)
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await prisma.invoice.delete({ where: { id } });

        await logAction({
            action: "DELETE_INVOICE",
            entityType: "Invoice",
            entityId: id
        });

        revalidatePath("/invoices");
        revalidatePath("/work-logs"); // Revalidate work logs to show them again
        revalidateTag("dashboard", "default");
        return { success: true, data: null };
    });
}
export async function createInvoiceFromWorkLogs(workLogIds: number[]): Promise<ActionResult<{ id: string }>> {
    return createAction("createInvoiceFromWorkLogs", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        return await prisma.$transaction(async (tx) => {
            // Fetch work logs and ensure they are all Unbilled and belong to same customer
            const logs = await tx.workLog.findMany({
                where: { id: { in: workLogIds } },
                include: { customer: true, service: true }
            });

            if (logs.length === 0) throw new Error("No work logs found");
            if (logs.some(l => l.status !== "Unbilled")) throw new Error("Some work logs are already billed");

            const customerId = logs[0].customerId;
            if (logs.some(l => l.customerId !== customerId)) throw new Error("All work logs must belong to the same customer");

            const customer = logs[0].customer;
            const subtotal = logs.reduce((acc, log) => acc + (log.quantity.toNumber() * log.rate.toNumber()), 0);
            const tax = 0; // Default tax
            const total = subtotal + tax;

            // 2. Generate ID and create invoice
            const invoiceId = await generateInvoiceId(tx);
            const invoice = await tx.invoice.create({
                data: {
                    id: invoiceId,
                    customerId: customerId,
                    clientName: customer?.name || "Unknown Customer",
                    date: new Date(),
                    subtotal: subtotal,
                    tax: tax,
                    total: total,
                    status: "Draft",
                    items: {
                        create: logs.map(log => ({
                            serviceName: log.service?.name || "Service",
                            quantity: log.quantity,
                            rate: log.rate,
                            total: log.quantity.toNumber() * log.rate.toNumber(),
                            date: log.date.toISOString().split('T')[0],
                            description: log.description
                        }))
                    },
                    publicToken: crypto.randomUUID()
                }
            });

            // 3. Mark logs as Billed
            await tx.workLog.updateMany({
                where: { id: { in: workLogIds } },
                data: {
                    status: "Billed",
                    invoiceId: invoice.id
                }
            });

            await logAction({
                action: "CREATE_INVOICE_FROM_WORK_LOGS",
                entityType: "Invoice",
                entityId: invoice.id,
                details: { workLogCount: workLogIds.length, total }
            });

            revalidatePath("/invoices");
            revalidatePath("/work-logs");
            revalidateTag("dashboard", "default");
            return { success: true, data: { id: invoice.id } };
        }, { timeout: 10000 });
    });
}

export async function peekNextInvoiceId(): Promise<ActionResult<string>> {
    return createAction("peekNextInvoiceId", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const counter = await prisma.counter.findUnique({ where: { id: "invoice" } });
        const currentCount = counter ? counter.count : 0;
        const nextVal = currentCount + 1;
        const currentYear = new Date().getFullYear();

        return { success: true, data: formatInvoiceId(nextVal, currentYear) };
    });
}

export async function getPublicInvoice(id: string, token: string): Promise<ActionResult<SerializedInvoice>> {
    // No auth check - public endpoint
    const inv = await prisma.invoice.findFirst({
        where: { id, publicToken: token },
        include: {
            items: {
                orderBy: { date: 'asc' }
            },
            payments: {
                orderBy: { date: 'asc' }
            },
            customer: {
                include: { paymentMethod: true }
            }
        }
    });

    if (!inv) {
        return { success: false, error: "Invoice not found or invalid token" };
    }

    const { status: derivedStatus, overdueDays } = calculateInvoiceStatus({
        status: inv.status,
        date: inv.date,
        dueDate: inv.dueDate,
        total: inv.total,
        totalPaid: inv.totalPaid || 0
    });

    const totalPaid = inv.totalPaid ? inv.totalPaid.toNumber() : 0;
    const balanceDue = inv.total.toNumber() - totalPaid;

    return {
        success: true,
        data: {
            id: inv.id,
            customerId: inv.customerId,
            clientName: inv.clientName,
            clientCompany: (inv as any).clientCompany,
            clientEmail: (inv as any).clientEmail,
            clientPhone: (inv as any).clientPhone,
            clientAddress: (inv as any).clientAddress,
            clientTaxId: (inv as any).clientTaxId,
            date: inv.date.toISOString().split('T')[0],
            dueDate: inv.dueDate?.toISOString().split('T')[0] || null,
            subtotal: inv.subtotal.toNumber(),
            tax: inv.tax.toNumber(),
            discount: inv.discount.toNumber(),
            discountType: inv.discountType as "fixed" | "percentage",
            discountValue: inv.discountValue.toNumber(),
            total: inv.total.toNumber(),
            totalPaid,
            balanceDue,
            status: derivedStatus,
            overdueDays: overdueDays > 0 ? overdueDays : undefined,
            items: inv.items.map(item => ({
                id: item.id,
                serviceName: item.serviceName,
                quantity: item.quantity.toNumber(),
                rate: item.rate.toNumber(),
                total: item.total.toNumber(),
                date: item.date ? (typeof item.date === 'string' ? item.date : (item.date as Date).toISOString().split('T')[0]) : undefined,
                description: item.description || undefined
            })),
            payments: inv.payments ? inv.payments.map((p: any) => ({
                id: p.id,
                amount: p.amount?.toNumber ? p.amount.toNumber() : Number(p.amount),
                method: p.method,
                date: p.date.toISOString().split('T')[0]
            })) : [],
            customer: inv.customer ? {
                name: inv.customer.name,
                contactFirstName: (inv.customer as any).contactFirstName || undefined,
                contactName: [(inv.customer as any).contactFirstName, (inv.customer as any).contactMiddleName, (inv.customer as any).contactLastName].filter(Boolean).join(" ") || undefined,
                email: inv.customer.email || "",
                phone: inv.customer.phone || undefined,
                address: inv.customer.address || undefined,
                city: inv.customer.city || undefined,
                state: inv.customer.state || undefined,
                zip: inv.customer.zip || undefined,
                country: inv.customer.country || undefined,
                taxId: inv.customer.taxId || undefined,
                currency: inv.customer.currency || undefined,
                paymentMethod: inv.customer.paymentMethod ? {
                    id: inv.customer.paymentMethod.id,
                    type: inv.customer.paymentMethod.type,
                    name: inv.customer.paymentMethod.name,
                    details: inv.customer.paymentMethod.details,
                } : null
            } : undefined
        }
    };
}
