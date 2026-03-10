"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { ActionResult } from "@/lib/types";
import { cache } from "react";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";
import { formatPeriodLabel } from "@/lib/format";
export type ReportData = {
    totalRevenue: number;
    avgRevenuePerCustomer: number;
    totalWorkUnits: number;
    activeCustomers: number;
    revenueData: { name: string; revenue: number }[];
    workVolume: { name: string; units: number }[];
    customerActivity: { name: string; value: number; color: string }[];
};

export const getReportKPIs = cache(async (params?: { startDate?: string; endDate?: string }) => {
    return createAction("getReportKPIs", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const where: any = {};
        if (params?.startDate || params?.endDate) {
            where.date = {};
            if (params.startDate) where.date.gte = new Date(params.startDate);
            if (params.endDate) where.date.lte = new Date(params.endDate);
        }

        const [invoices, customers, workLogs] = await Promise.all([
            prisma.invoice.findMany({ where: { ...where, status: { in: ["Paid", "Partially Paid"] } }, select: { totalPaid: true } }),
            prisma.customer.findMany({ select: { status: true } }),
            prisma.workLog.findMany({ where, select: { quantity: true } })
        ]);

        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalPaid?.toNumber() || 0), 0);
        const activeCustomers = customers.filter(c => c.status === "Active").length;
        const totalWorkUnits = workLogs.reduce((sum, log) => sum + (log.quantity?.toNumber() || 0), 0);
        const avgRevenuePerCustomer = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

        return { success: true, data: { totalRevenue, activeCustomers, totalWorkUnits, avgRevenuePerCustomer } };
    });
});

export const getRevenueSeries = cache(async (params?: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month" }) => {
    return createAction("getRevenueSeries", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const where: any = {};
        if (params?.startDate || params?.endDate) {
            where.date = {};
            if (params.startDate) where.date.gte = new Date(params.startDate);
            if (params.endDate) where.date.lte = new Date(params.endDate);
        }

        const invoices = await prisma.invoice.findMany({
            where: { ...where, status: { in: ["Paid", "Partially Paid"] } },
            select: { totalPaid: true, date: true },
            orderBy: { date: 'asc' }
        });

        const groupBy = params?.groupBy || "month";
        const revenueByPeriod = invoices.reduce((acc: Record<string, number>, inv) => {
            const label = formatPeriodLabel(inv.date, groupBy);
            acc[label] = (acc[label] || 0) + (inv.totalPaid?.toNumber() || 0);
            return acc;
        }, {});

        const data = Object.entries(revenueByPeriod)
            .map(([name, revenue]) => ({ name, revenue }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        return { success: true, data };
    });
});

export const getWorkVolumeSeries = cache(async (params?: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month" }) => {
    return createAction("getWorkVolumeSeries", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const where: any = {};
        if (params?.startDate || params?.endDate) {
            where.date = {};
            if (params.startDate) where.date.gte = new Date(params.startDate);
            if (params.endDate) where.date.lte = new Date(params.endDate);
        }

        const workLogs = await prisma.workLog.findMany({
            where,
            select: { quantity: true, date: true },
            orderBy: { date: 'asc' }
        });

        const groupBy = params?.groupBy || "month";
        const volumeByPeriod = workLogs.reduce((acc: Record<string, number>, log) => {
            const label = formatPeriodLabel(log.date, groupBy);
            acc[label] = (acc[label] || 0) + (log.quantity?.toNumber() || 0);
            return acc;
        }, {});

        const data = Object.entries(volumeByPeriod)
            .map(([name, units]) => ({ name, units }));

        return { success: true, data };
    });
});

export const getServiceDistribution = cache(async (params?: { startDate?: string; endDate?: string }) => {
    return createAction("getServiceDistribution", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const where: any = {};
        if (params?.startDate || params?.endDate) {
            where.date = {};
            if (params.startDate) where.date.gte = new Date(params.startDate);
            if (params.endDate) where.date.lte = new Date(params.endDate);
        }

        // We need invoice items to link revenue to services/descriptions
        const paidInvoices = await prisma.invoice.findMany({
            where: { ...where, status: { in: ["Paid", "Partially Paid"] } },
            include: { items: true }
        });

        const serviceRevenue: Record<string, number> = {};

        paidInvoices.forEach(inv => {
            const totalInv = inv.total.toNumber();
            const totalPaid = inv.totalPaid?.toNumber() || 0;
            const ratio = totalInv > 0 ? totalPaid / totalInv : 0;

            inv.items.forEach(item => {
                const name = item.description || "Unknown Service";
                const itemTotal = item.quantity.toNumber() * item.rate.toNumber();
                // Attribute revenue proportionally based on how much of the invoice is paid
                serviceRevenue[name] = (serviceRevenue[name] || 0) + (itemTotal * ratio);
            });
        });

        const data = Object.entries(serviceRevenue)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 services

        return { success: true, data };
    });
});

export const getTopCustomers = cache(async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    return createAction("getTopCustomers", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const where: any = {};
        if (params?.startDate || params?.endDate) {
            where.date = {};
            if (params.startDate) where.date.gte = new Date(params.startDate);
            if (params.endDate) where.date.lte = new Date(params.endDate);
        }

        const paidInvoices = await prisma.invoice.findMany({
            where: { ...where, status: { in: ["Paid", "Partially Paid"] } },
            select: { totalPaid: true, customerId: true, customer: { select: { name: true, email: true } } }
        });

        const customerRevenue: Record<string, { name: string; email: string | null; revenue: number; count: number }> = {};

        paidInvoices.forEach(inv => {
            if (!inv.customerId) return;
            const id = inv.customerId;
            if (!customerRevenue[id]) {
                customerRevenue[id] = {
                    name: inv.customer?.name || "Unknown",
                    email: inv.customer?.email || null,
                    revenue: 0,
                    count: 0
                };
            }
            customerRevenue[id].revenue += (inv.totalPaid?.toNumber() || 0);
            customerRevenue[id].count += 1;
        });

        const limit = params?.limit || 5;
        const data = Object.values(customerRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);

        return { success: true, data };
    });
});
