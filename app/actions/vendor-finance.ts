"use server";

import { prisma } from "@/lib/db";
import { createAction, requireVendor } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

// ─── Types (mirrors finance.ts types for the vendor) ──────────────────────────

export type VendorFinanceCategoryWithCount = {
    id: number;
    name: string;
    type: string;
    description: string | null;
    createdAt: Date;
    _count: { transactions: number };
};

export type VendorFinanceTransactionWithCategory = {
    id: number;
    date: Date;
    description: string;
    amount: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    categoryId: number;
    category: { id: number; name: string; type: string };
};

export type VendorMonthlyPLData = {
    month: number;
    monthName: string;
    income: number;
    expenses: number;
    profit: number;
};

export type VendorCategoryMonthlyData = {
    categoryId: number;
    categoryName: string;
    categoryType: string;
    monthlyAmounts: number[];
    total: number;
};

export type VendorPLReport = {
    year: number;
    categories: VendorCategoryMonthlyData[];
    monthlyTotals: VendorMonthlyPLData[];
    ytdIncome: number;
    ytdExpenses: number;
    ytdProfit: number;
};

export type VendorFinanceDashboard = {
    ytdIncome: number;
    ytdProfit: number;
    ytdExpenses: number;
    monthlyData: { month: string; income: number; expenses: number; profit: number }[];
    expenseByCategory: { name: string; value: number; percentage: number }[];
    highestIncomeMonths: { month: string; amount: number }[];
    lowestIncomeMonths: { month: string; amount: number }[];
    mostProfitableMonths: { month: string; amount: number }[];
    leastProfitableMonths: { month: string; amount: number }[];
    topExpenses: { category: string; amount: number }[];
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getVendorCategories() {
    return createAction("getVendorCategories", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const categories = await prisma.vendorFinanceCategory.findMany({
            orderBy: [{ type: "asc" }, { name: "asc" }],
            include: { _count: { select: { transactions: true } } },
        });

        return { success: true, data: categories as VendorFinanceCategoryWithCount[] };
    });
}

export async function createVendorCategory(data: { name: string; type: string; description?: string }) {
    return createAction("createVendorCategory", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const existing = await prisma.vendorFinanceCategory.findUnique({ where: { name: data.name } });
        if (existing) return { success: false, error: "A category with this name already exists." };

        const category = await prisma.vendorFinanceCategory.create({ data });
        revalidatePath("/finance");
        return { success: true, data: category };
    });
}

export async function updateVendorCategory(id: number, data: { name: string; type: string; description?: string }) {
    return createAction("updateVendorCategory", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const existing = await prisma.vendorFinanceCategory.findFirst({ where: { name: data.name, NOT: { id } } });
        if (existing) return { success: false, error: "A category with this name already exists." };

        const updated = await prisma.vendorFinanceCategory.update({ where: { id }, data });
        revalidatePath("/finance");
        return { success: true, data: updated };
    });
}

export async function deleteVendorCategory(id: number) {
    return createAction("deleteVendorCategory", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const count = await prisma.vendorFinanceTransaction.count({ where: { categoryId: id } });
        if (count > 0) {
            return {
                success: false,
                error: `Cannot delete — this category has ${count} transaction(s). Reassign or delete them first.`,
            };
        }

        await prisma.vendorFinanceCategory.delete({ where: { id } });
        revalidatePath("/finance");
        return { success: true, data: null };
    });
}

// ─── Loans & Employee Payments ───────────────────────────────────────────

export async function getVendorFinanceEmployees() {
    return createAction("getVendorFinanceEmployees", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const company = (session.user as any).company;
        const employees = await prisma.employee.findMany({
            where: { company },
            select: { id: true, firstName: true, lastName: true, designation: true }
        });

        return { success: true, data: employees };
    });
}

export async function recordVendorLoanDisbursement(data: {
    employeeId: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    return createAction("recordVendorLoanDisbursement", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
        if (!employee) return { success: false, error: "Employee not found." };

        let category = await prisma.vendorFinanceCategory.findUnique({ where: { name: "Loans to Employees" } });
        if (!category) {
            category = await prisma.vendorFinanceCategory.create({
                data: { name: "Loans to Employees", type: "Expense", description: "Loan given to employee" }
            });
        }

        const tx = await prisma.vendorFinanceTransaction.create({
            data: {
                date: new Date(data.date),
                description: `Loan Disbursement: ${employee.firstName} ${employee.lastName}`,
                amount: new Decimal(-Math.abs(data.amount)),
                categoryId: category.id,
                notes: data.notes || null,
            }
        });

        revalidatePath("/finance");
        return { success: true, data: tx };
    });
}

export async function recordVendorLoanRepayment(data: {
    employeeId: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    return createAction("recordVendorLoanRepayment", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
        if (!employee) return { success: false, error: "Employee not found." };

        let category = await prisma.vendorFinanceCategory.findUnique({ where: { name: "Loan Repayments" } });
        if (!category) {
            category = await prisma.vendorFinanceCategory.create({
                data: { name: "Loan Repayments", type: "Revenue", description: "Loan repayment from employee" }
            });
        }

        const tx = await prisma.vendorFinanceTransaction.create({
            data: {
                date: new Date(data.date),
                description: `Loan Repayment: ${employee.firstName} ${employee.lastName}`,
                amount: new Decimal(Math.abs(data.amount)),
                categoryId: category.id,
                notes: data.notes || null,
            }
        });

        revalidatePath("/finance");
        return { success: true, data: tx };
    });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getVendorTransactions(filters?: {
    year?: number;
    month?: number;
    categoryId?: number;
    type?: string;
    search?: string;
}) {
    return createAction("getVendorTransactions", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const where: any = {};

        if (filters?.year) {
            const startDate = new Date(filters.year, (filters.month ?? 1) - 1, 1);
            const endDate = filters.month
                ? new Date(filters.year, filters.month, 0, 23, 59, 59)
                : new Date(filters.year, 11, 31, 23, 59, 59);
            where.date = { gte: startDate, lte: endDate };
        }

        if (filters?.categoryId) where.categoryId = filters.categoryId;
        if (filters?.type) where.category = { type: filters.type };
        if (filters?.search) where.description = { contains: filters.search };

        const transactions = await prisma.vendorFinanceTransaction.findMany({
            where,
            include: { category: { select: { id: true, name: true, type: true } } },
            orderBy: { date: "asc" },
        });

        const data: VendorFinanceTransactionWithCategory[] = transactions.map((t) => ({
            ...t,
            amount: t.amount.toNumber(),
        }));

        return { success: true, data };
    });
}

export async function createVendorTransaction(data: {
    date: string;
    description: string;
    amount: number;
    categoryId: number;
    notes?: string;
}) {
    return createAction("createVendorTransaction", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const category = await prisma.vendorFinanceCategory.findUnique({ where: { id: data.categoryId } });
        if (!category) return { success: false, error: "Category not found." };

        const signedAmount = category.type === "Expense" ? -Math.abs(data.amount) : Math.abs(data.amount);

        const tx = await prisma.vendorFinanceTransaction.create({
            data: {
                date: new Date(data.date),
                description: data.description,
                amount: new Decimal(signedAmount),
                categoryId: data.categoryId,
                notes: data.notes || null,
            },
            include: { category: { select: { id: true, name: true, type: true } } },
        });

        revalidatePath("/finance");
        return { success: true, data: { ...tx, amount: tx.amount.toNumber() } };
    });
}

export async function createVendorBatchTransactions(transactions: {
    date: string;
    description: string;
    amount: number;
    categoryId: number;
    notes?: string;
}[]) {
    return createAction("createVendorBatchTransactions", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const categoryIds = [...new Set(transactions.map(t => t.categoryId))];
        const categories = await prisma.vendorFinanceCategory.findMany({ where: { id: { in: categoryIds } } });
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        const dataToCreate = transactions.map(t => {
            const category = categoryMap.get(t.categoryId);
            if (!category) throw new Error(`Category ${t.categoryId} not found.`);
            const signedAmount = category.type === "Expense" ? -Math.abs(t.amount) : Math.abs(t.amount);
            return {
                date: new Date(t.date),
                description: t.description,
                amount: new Decimal(signedAmount),
                categoryId: t.categoryId,
                notes: t.notes || null,
            };
        });

        await prisma.vendorFinanceTransaction.createMany({ data: dataToCreate });
        revalidatePath("/finance");
        return { success: true, data: null };
    });
}

export async function updateVendorTransaction(id: number, data: {
    date: string;
    description: string;
    amount: number;
    categoryId: number;
    notes?: string;
}) {
    return createAction("updateVendorTransaction", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const category = await prisma.vendorFinanceCategory.findUnique({ where: { id: data.categoryId } });
        if (!category) return { success: false, error: "Category not found." };

        const signedAmount = category.type === "Expense" ? -Math.abs(data.amount) : Math.abs(data.amount);

        const tx = await prisma.vendorFinanceTransaction.update({
            where: { id },
            data: {
                date: new Date(data.date),
                description: data.description,
                amount: new Decimal(signedAmount),
                categoryId: data.categoryId,
                notes: data.notes || null,
            },
            include: { category: { select: { id: true, name: true, type: true } } },
        });

        revalidatePath("/finance");
        return { success: true, data: { ...tx, amount: tx.amount.toNumber() } };
    });
}

export async function deleteVendorTransaction(id: number) {
    return createAction("deleteVendorTransaction", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        await prisma.vendorFinanceTransaction.delete({ where: { id } });
        revalidatePath("/finance");
        return { success: true, data: null };
    });
}

// ─── P&L Report ───────────────────────────────────────────────────────────────

export async function getVendorProfitLossReport(year: number) {
    return createAction("getVendorProfitLossReport", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const transactions = await prisma.vendorFinanceTransaction.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            include: { category: true },
            orderBy: { date: "asc" },
        });

        const categoryMap = new Map<number, { name: string; type: string; months: number[] }>();

        for (const tx of transactions) {
            const month = tx.date.getMonth();
            const amount = tx.amount.toNumber();
            if (!categoryMap.has(tx.categoryId)) {
                categoryMap.set(tx.categoryId, { name: tx.category.name, type: tx.category.type, months: Array(12).fill(0) });
            }
            const entry = categoryMap.get(tx.categoryId)!;
            entry.months[month] += Math.abs(amount);
        }

        const categories: VendorCategoryMonthlyData[] = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
            categoryId,
            categoryName: data.name,
            categoryType: data.type,
            monthlyAmounts: data.months,
            total: data.months.reduce((sum, v) => sum + v, 0),
        }));

        const monthlyTotals: VendorMonthlyPLData[] = MONTH_NAMES.map((monthName, i) => {
            const income = categories.filter(c => c.categoryType === "Revenue").reduce((sum, c) => sum + c.monthlyAmounts[i], 0);
            const expenses = categories.filter(c => c.categoryType === "Expense").reduce((sum, c) => sum + c.monthlyAmounts[i], 0);
            return { month: i + 1, monthName, income, expenses, profit: income - expenses };
        });

        const ytdIncome = monthlyTotals.reduce((s, m) => s + m.income, 0);
        const ytdExpenses = monthlyTotals.reduce((s, m) => s + m.expenses, 0);
        const ytdProfit = ytdIncome - ytdExpenses;

        return {
            success: true,
            data: {
                year,
                categories: categories.sort((a, b) => {
                    if (a.categoryType !== b.categoryType) return a.categoryType === "Revenue" ? -1 : 1;
                    return a.categoryName.localeCompare(b.categoryName);
                }),
                monthlyTotals,
                ytdIncome,
                ytdExpenses,
                ytdProfit,
            } as VendorPLReport
        };
    });
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export async function getVendorFinanceDashboard(year: number) {
    return createAction("getVendorFinanceDashboard", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const transactions = await prisma.vendorFinanceTransaction.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            include: { category: { select: { name: true, type: true } } },
        });

        const monthly = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], income: 0, expenses: 0, profit: 0 }));
        const expenseByCat: Record<string, number> = {};

        for (const tx of transactions) {
            const month = tx.date.getMonth();
            const amt = Math.abs(tx.amount.toNumber());
            if (tx.category.type === "Revenue") {
                monthly[month].income += amt;
            } else {
                monthly[month].expenses += amt;
                expenseByCat[tx.category.name] = (expenseByCat[tx.category.name] || 0) + amt;
            }
        }

        for (const m of monthly) {
            m.profit = m.income - m.expenses;
        }

        const ytdIncome = monthly.reduce((s, m) => s + m.income, 0);
        const ytdExpenses = monthly.reduce((s, m) => s + m.expenses, 0);
        const ytdProfit = ytdIncome - ytdExpenses;

        const totalExpenses = ytdExpenses || 1;
        const expenseByCategory = Object.entries(expenseByCat)
            .map(([name, value]) => ({ name, value, percentage: Math.round((value / totalExpenses) * 1000) / 10 }))
            .sort((a, b) => b.value - a.value);

        const topExpenses = expenseByCategory.slice(0, 3).map(e => ({ category: e.name, amount: e.value }));
        const incomeMonths = monthly.filter(m => m.income > 0).sort((a, b) => b.income - a.income);
        const highestIncomeMonths = incomeMonths.slice(0, 3).map(m => ({ month: m.month, amount: m.income }));
        const lowestIncomeMonths = [...incomeMonths].reverse().slice(0, 3).map(m => ({ month: m.month, amount: m.income }));
        const activeMonths = monthly.filter(m => m.income > 0 || m.expenses > 0);
        const sortedByProfit = [...activeMonths].sort((a, b) => b.profit - a.profit);
        const mostProfitableMonths = sortedByProfit.slice(0, 3).map(m => ({ month: m.month, amount: m.profit }));
        const leastProfitableMonths = sortedByProfit.reverse().slice(0, 3).map(m => ({ month: m.month, amount: m.profit }));

        return {
            success: true,
            data: {
                ytdIncome, ytdProfit, ytdExpenses,
                monthlyData: monthly,
                expenseByCategory,
                highestIncomeMonths, lowestIncomeMonths,
                mostProfitableMonths, leastProfitableMonths,
                topExpenses,
            } as VendorFinanceDashboard
        };
    });
}

// ─── Available years ──────────────────────────────────────────────────────────

export async function getVendorFinanceYears() {
    return createAction("getVendorFinanceYears", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.vendorFinanceTransaction.findMany({
            select: { date: true },
            orderBy: { date: "asc" },
        });

        const years = [...new Set(transactions.map(t => t.date.getFullYear()))];
        const currentYear = new Date().getFullYear();
        if (!years.includes(currentYear)) years.push(currentYear);

        return { success: true, data: years.sort((a, b) => b - a) };
    });
}

export type VendorCategoryYearlyData = {
    categoryId: number;
    categoryName: string;
    categoryType: string;
    yearlyAmounts: Record<number, number>;
    total: number;
};

export type VendorYearlyPLData = {
    year: number;
    income: number;
    expenses: number;
    profit: number;
};

export type VendorYearlyComparisonReport = {
    years: number[];
    categories: VendorCategoryYearlyData[];
    yearlyTotals: VendorYearlyPLData[];
};

export async function getVendorYearlyComparisonReport() {
    return createAction("getVendorYearlyComparisonReport", async () => {
        const session = await requireVendor();
        if (!session) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.vendorFinanceTransaction.findMany({
            include: { category: true },
            orderBy: { date: "asc" },
        });

        const dataWithYear = transactions.map(t => ({
            ...t,
            year: t.date.getFullYear() as number
        }));

        const years = Array.from(new Set<number>(dataWithYear.map((t) => t.year))).sort((a, b) => b - a);

        const categoryMap = new Map<
            number,
            { name: string; type: string; years: Record<number, number> }
        >();

        for (const tx of dataWithYear) {
            const year = tx.year;
            const amount = tx.amount.toNumber();
            if (!categoryMap.has(tx.categoryId)) {
                categoryMap.set(tx.categoryId, {
                    name: tx.category.name,
                    type: tx.category.type,
                    years: {},
                });
            }
            const entry = categoryMap.get(tx.categoryId)!;
            entry.years[year] = (entry.years[year] || 0) + Math.abs(amount);
        }

        const categories: VendorCategoryYearlyData[] = Array.from(categoryMap.entries()).map(
            ([categoryId, data]) => ({
                categoryId,
                categoryName: data.name,
                categoryType: data.type,
                yearlyAmounts: data.years,
                total: Object.values(data.years).reduce((sum, v) => sum + v, 0),
            })
        );

        const yearlyTotals: VendorYearlyPLData[] = years.map((year) => {
            const income = categories
                .filter((c) => c.categoryType === "Revenue")
                .reduce((sum, c) => sum + (c.yearlyAmounts[year] || 0), 0);
            const expenses = categories
                .filter((c) => c.categoryType === "Expense")
                .reduce((sum, c) => sum + (c.yearlyAmounts[year] || 0), 0);
            return { year, income, expenses, profit: income - expenses };
        });

        const report: VendorYearlyComparisonReport = {
            years,
            categories: categories.sort((a, b) => {
                if (a.categoryType !== b.categoryType) return a.categoryType === "Revenue" ? -1 : 1;
                return a.categoryName.localeCompare(b.categoryName);
            }),
            yearlyTotals,
        };

        return { success: true, data: report };
    });
}
