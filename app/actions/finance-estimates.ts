"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { createAction, requireBlackfox, requireVendor } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type EstimateType = {
    id: number;
    date: Date;
    description: string;
    amount: number;
    categoryId: number;
    notes: string | null;
    status: string;
    transactionId: number | null;
    createdAt: Date;
    updatedAt: Date;
    category: { id: number; name: string; type: string };
};

// ─── BLACKFOX ESTIMATES ─────────────────────────────────────────────────────

export async function getEstimates() {
    return createAction("getEstimates", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const estimates = await prisma.financeEstimate.findMany({
            include: {
                category: { select: { id: true, name: true, type: true } }
            },
            orderBy: { date: "desc" },
        });

        // Convert decimals to numbers for client component
        return { success: true, data: estimates.map(e => ({ ...e, amount: Number(e.amount) })) };
    });
}

export async function createEstimate(data: {
    monthYYYYMM: string;
    entries: {
        description?: string;
        amount: number;
        categoryId: number;
        notes?: string;
    }[];
}) {
    return createAction("createEstimate", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        console.log("[createEstimate] Prisma defined:", !!prisma);
        console.log("[createEstimate] FinanceEstimate model defined:", !!(prisma as any).financeEstimate);
        if (!(prisma as any).financeEstimate) {
            return { success: false, error: "Database mapping error: financeEstimate not found on prisma client." };
        }

        const defaultDate = new Date(`${data.monthYYYYMM}-01T00:00:00Z`);

        await Promise.all(
            data.entries.map((entry) => 
                prisma.financeEstimate.create({
                    data: {
                        date: defaultDate,
                        description: entry.description || "Budget Estimate",
                        amount: new Prisma.Decimal(entry.amount),
                        categoryId: entry.categoryId,
                        notes: entry.notes || null,
                        status: "Pending", // Default status
                    }
                })
            )
        );

        revalidatePath("/finance/estimates");
        return { success: true, data: null };
    });
}

export async function updateEstimateStatus(id: number, status: "Approved" | "Rejected") {
    return createAction("updateEstimateStatus", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const estimate = await prisma.financeEstimate.findUnique({
            where: { id },
            include: { category: true }
        });

        if (!estimate) return { success: false, error: "Estimate not found" };
        if (estimate.status !== "Pending") return { success: false, error: "Estimate is already processed" };

        let transactionId = null;

        if (status === "Approved") {
            const today = new Date();
            // Convert to transaction directly with date of approval (today)
            const amtNum = Number(estimate.amount);
            const signedAmount = estimate.category.type === "Expense" ? -Math.abs(amtNum) : Math.abs(amtNum);
            const transaction = await prisma.financeTransaction.create({
                data: {
                    date: today,
                    description: estimate.description,
                    amount: new Prisma.Decimal(signedAmount),
                    categoryId: estimate.categoryId,
                    notes: `Created from approved estimate #${estimate.id}`,
                }
            });
            transactionId = transaction.id;
            
            // Sync with vendor if applicable
            const { handleVendorSync } = await import("./finance");
            await handleVendorSync(transaction.id, estimate.category.name, transaction.date, transaction.description, Number(transaction.amount), transaction.notes || null);
        }

        const updated = await prisma.financeEstimate.update({
            where: { id },
            data: { 
                status,
                transactionId
            }
        });

        revalidatePath("/finance");
        revalidatePath("/finance/estimates");
        revalidatePath("/finance/dashboard");
        revalidatePath("/finance/profit-loss");
        return { success: true, data: updated };
    });
}

export async function deleteEstimate(id: number) {
    return createAction("deleteEstimate", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const existing = await prisma.financeEstimate.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Estimate not found" };

        await prisma.financeEstimate.delete({ where: { id } });

        revalidatePath("/finance/estimates");
        return { success: true, data: null };
    });
}

export async function updateEstimate(id: number, data: {
    description?: string;
    amount?: number;
    categoryId?: number;
    notes?: string;
    date?: Date;
    status?: string;
}) {
    return createAction("updateEstimate", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const updated = await prisma.financeEstimate.update({
            where: { id },
            data: {
                ...data,
                amount: data.amount ? new Prisma.Decimal(data.amount) : undefined,
            }
        });

        revalidatePath("/finance/estimates");
        return { success: true, data: updated };
    });
}

// ─── VENDOR ESTIMATES ───────────────────────────────────────────────────────

export async function getVendorEstimates() {
    return createAction("getVendorEstimates", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const estimates = await prisma.vendorFinanceEstimate.findMany({
            include: {
                category: { select: { id: true, name: true, type: true } }
            },
            orderBy: { date: "desc" },
        });

        return { success: true, data: estimates.map(e => ({ ...e, amount: Number(e.amount) })) };
    });
}

export async function createVendorEstimate(data: {
    monthYYYYMM: string;
    entries: {
        description?: string;
        amount: number;
        categoryId: number;
        notes?: string;
    }[];
}) {
    return createAction("createVendorEstimate", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        console.log("[createVendorEstimate] Prisma defined:", !!prisma);
        console.log("[createVendorEstimate] VendorFinanceEstimate model defined:", !!(prisma as any).vendorFinanceEstimate);
        if (!(prisma as any).vendorFinanceEstimate) {
            return { success: false, error: "Database mapping error: vendorFinanceEstimate not found on prisma client." };
        }

        const defaultDate = new Date(`${data.monthYYYYMM}-01T00:00:00Z`);

        await Promise.all(
            data.entries.map((entry) => 
                prisma.vendorFinanceEstimate.create({
                    data: {
                        date: defaultDate,
                        description: entry.description || "Budget Estimate",
                        amount: new Prisma.Decimal(entry.amount),
                        categoryId: entry.categoryId,
                        notes: entry.notes || null,
                        status: "Pending",
                    }
                })
            )
        );

        revalidatePath("/finance/estimates");
        return { success: true, data: null };
    });
}

export async function updateVendorEstimateStatus(id: number, status: "Approved" | "Rejected") {
    return createAction("updateVendorEstimateStatus", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const estimate = await prisma.vendorFinanceEstimate.findUnique({
            where: { id },
            include: { category: true }
        });

        if (!estimate) return { success: false, error: "Estimate not found" };
        if (estimate.status !== "Pending") return { success: false, error: "Estimate is already processed" };

        let transactionId = null;

        if (status === "Approved") {
            const today = new Date();
            const amtNum = Number(estimate.amount);
            const signedAmount = estimate.category.type === "Expense" ? -Math.abs(amtNum) : Math.abs(amtNum);
            const transaction = await prisma.vendorFinanceTransaction.create({
                data: {
                    date: today,
                    description: estimate.description,
                    amount: new Prisma.Decimal(signedAmount),
                    categoryId: estimate.categoryId,
                    notes: `Created from approved estimate #${estimate.id}`,
                }
            });
            transactionId = transaction.id;
        }

        const updated = await prisma.vendorFinanceEstimate.update({
            where: { id },
            data: { 
                status,
                transactionId
            }
        });

        revalidatePath("/finance");
        revalidatePath("/finance/estimates");
        return { success: true, data: updated };
    });
}

export async function deleteVendorEstimate(id: number) {
    return createAction("deleteVendorEstimate", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const existing = await prisma.vendorFinanceEstimate.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Estimate not found" };

        await prisma.vendorFinanceEstimate.delete({ where: { id } });

        revalidatePath("/finance/estimates");
        return { success: true, data: null };
    });
}

export async function updateVendorEstimate(id: number, data: {
    description?: string;
    amount?: number;
    categoryId?: number;
    notes?: string;
    date?: Date;
    status?: string;
}) {
    return createAction("updateVendorEstimate", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const updated = await prisma.vendorFinanceEstimate.update({
            where: { id },
            data: {
                ...data,
                amount: data.amount ? new Prisma.Decimal(data.amount) : undefined,
            }
        });

        revalidatePath("/finance/estimates");
        return { success: true, data: updated };
    });
}
