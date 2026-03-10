"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { ActionResult } from "@/lib/types";
import { createAction, requireBlackfox } from "@/lib/action-utils";

import { Prisma } from "@prisma/client";

type DashboardStats = {
    totalRevenue: number;
    activeCustomers: number;
    pendingInvoices: number;
    activeServices: number;
    imageStats: {
        thisMonth: number;
        lastMonth: number;
        thisYear: number;
    };
};

type ActivityItem = {
    id: string;
    action: string;
    target: string;
    type: "invoice" | "work" | "payment";
    time: string;
    timestamp: number;
};

type RevenueTrendItem = {
    date: string; // YYYY-MM
    amount: number;
};

type CashFlowItem = {
    date: string; // YYYY-MM-DD
    amount: number;
};

type InvoiceStatsItem = {
    status: string;
    count: number;
    total: number;
};

import { unstable_cache } from "next/cache";

const queryDashboardStats = async (from?: Date, to?: Date) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Date filter for aggregates
    const dateFilter: Prisma.InvoiceWhereInput = {};
    if (from && to) {
        dateFilter.date = { gte: from, lte: to };
    }

    const [
        totalRevenueResult,
        activeCustomers,
        pendingInvoices,
        activeServices,
        thisMonthImages,
        lastMonthImages,
        thisYearImages
    ] = await Promise.all([
        prisma.invoice.aggregate({
            _sum: { totalPaid: true },
            where: {
                status: { in: ["Paid", "Partially Paid"] },
                ...dateFilter
            }
        }),
        prisma.customer.count({ where: { status: "Active" } }),
        prisma.invoice.count({
            where: {
                NOT: {
                    status: { in: ["Paid", "Draft"] }
                },
                ...dateFilter
            }
        }),
        prisma.service.count({}),
        // Images This Month (Independent of filter, strictly "This Month")
        prisma.workLog.aggregate({
            _sum: { quantity: true },
            where: {
                date: { gte: startOfMonth }
            }
        }),
        // Images Last Month
        prisma.workLog.aggregate({
            _sum: { quantity: true },
            where: {
                date: { gte: startOfLastMonth, lte: endOfLastMonth }
            }
        }),
        // Images This Year
        prisma.workLog.aggregate({
            _sum: { quantity: true },
            where: {
                date: { gte: startOfYear }
            }
        })
    ]);

    const totalRevenue = totalRevenueResult._sum.totalPaid?.toNumber() || 0;

    return {
        success: true as const,
        data: {
            totalRevenue,
            activeCustomers,
            pendingInvoices,
            activeServices,
            imageStats: {
                thisMonth: thisMonthImages._sum.quantity?.toNumber() || 0,
                lastMonth: lastMonthImages._sum.quantity?.toNumber() || 0,
                thisYear: thisYearImages._sum.quantity?.toNumber() || 0
            }
        }
    };
};

export async function getDashboardStats(from?: Date, to?: Date): Promise<ActionResult<DashboardStats>> {
    return createAction("getDashboardStats", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };
        // BUG-05 fix: no caching — dashboard is force-dynamic and date params must always be respected
        return await queryDashboardStats(from, to);
    });
}

const getCachedRevenueTrend = unstable_cache(
    async () => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1); // Start of that month

        const invoices = await prisma.invoice.groupBy({
            by: ['date'],
            _sum: { totalPaid: true },
            where: {
                status: { in: ["Paid", "Partially Paid"] },
                date: { gte: sixMonthsAgo }
            },
            orderBy: { date: 'asc' }
        });

        const monthlyData = new Map<string, number>();

        for (let i = 0; i < 6; i++) {
            const d = new Date(sixMonthsAgo);
            d.setMonth(d.getMonth() + i);
            const key = d.toISOString().slice(0, 7); // YYYY-MM
            monthlyData.set(key, 0);
        }

        invoices.forEach(inv => {
            const key = inv.date.toISOString().slice(0, 7);
            const current = monthlyData.get(key) || 0;
            monthlyData.set(key, current + (inv._sum.totalPaid?.toNumber() || 0));
        });

        const trend: RevenueTrendItem[] = Array.from(monthlyData.entries()).map(([date, amount]) => ({
            date,
            amount
        }));

        return { success: true as const, data: trend };
    },
    ["revenue-trend"],
    { tags: ["dashboard"] }
);

export async function getRevenueTrend(): Promise<ActionResult<RevenueTrendItem[]>> {
    return createAction("getRevenueTrend", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };
        return await getCachedRevenueTrend();
    });
}

const getCachedCashFlowForecast = unstable_cache(
    async () => {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const invoices = await prisma.invoice.findMany({
            where: {
                status: { notIn: ["Paid", "Draft", "Void"] },
                dueDate: {
                    gte: today,
                    lte: thirtyDaysFromNow
                }
            },
            select: {
                dueDate: true,
                total: true,
                totalPaid: true
            }
        });

        const dailyData = new Map<string, number>();

        invoices.forEach(inv => {
            if (!inv.dueDate) return;
            const key = inv.dueDate.toISOString().slice(0, 10);
            const current = dailyData.get(key) || 0;
            const balance = inv.total.toNumber() - (inv.totalPaid?.toNumber() || 0);
            dailyData.set(key, current + balance);
        });

        const forecast: CashFlowItem[] = Array.from(dailyData.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return { success: true as const, data: forecast };
    },
    ["cash-flow-forecast"],
    { tags: ["dashboard"] }
);

export async function getCashFlowForecast(): Promise<ActionResult<CashFlowItem[]>> {
    return createAction("getCashFlowForecast", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };
        return await getCachedCashFlowForecast();
    });
}

const getCachedInvoiceStats = unstable_cache(
    async () => {
        const stats = await prisma.invoice.groupBy({
            by: ['status'],
            _count: { id: true },
            _sum: { total: true }
        });

        const data: InvoiceStatsItem[] = stats.map(s => ({
            status: s.status,
            count: s._count.id,
            total: s._sum.total?.toNumber() || 0
        }));

        return { success: true as const, data };
    },
    ["invoice-stats"],
    { tags: ["dashboard"] }
);

export async function getInvoiceStats(): Promise<ActionResult<InvoiceStatsItem[]>> {
    return createAction("getInvoiceStats", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };
        return await getCachedInvoiceStats();
    });
}

const getCachedRecentActivity = unstable_cache(
    async () => {
        const [latestInvoices, latestLogs] = await Promise.all([
            prisma.invoice.findMany({
                take: 5,
                orderBy: { date: 'desc' },
                include: { customer: true }
            }),
            prisma.workLog.findMany({
                take: 5,
                orderBy: { date: 'desc' },
                include: { customer: true }
            })
        ]);

        const activities: ActivityItem[] = [
            ...latestInvoices.map(inv => ({
                id: `inv-${inv.id}`,
                action: `Invoice #${inv.id} created`,
                target: inv.clientName,
                type: "invoice" as const,
                time: inv.date.toISOString(),
                timestamp: inv.date.getTime()
            })),
            ...latestLogs.map(log => ({
                id: `log-${log.id}`,
                action: `Work Logged (${log.quantity} units)`,
                target: log.customer.name,
                type: "work" as const,
                time: log.date.toISOString(),
                timestamp: log.date.getTime()
            }))
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

        return { success: true as const, data: activities };
    },
    ["recent-activity"],
    { tags: ["dashboard"] }
);

export async function getRecentActivity(): Promise<ActionResult<ActivityItem[]>> {
    return createAction("getRecentActivity", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };
        return await getCachedRecentActivity();
    });
}
