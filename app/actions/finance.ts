"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FinanceCategoryWithCount = {
    id: number;
    name: string;
    type: string;
    description: string | null;
    createdAt: Date;
    _count: { transactions: number };
};

export type FinanceTransactionWithCategory = {
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

export type MonthlyPLData = {
    month: number; // 1-12
    monthName: string;
    income: number;
    expenses: number;
    profit: number;
};

export type CategoryMonthlyData = {
    categoryId: number;
    categoryName: string;
    categoryType: string;
    monthlyAmounts: number[]; // index 0 = Jan, 11 = Dec
    total: number;
};

export type PLReport = {
    year: number;
    categories: CategoryMonthlyData[];
    monthlyTotals: MonthlyPLData[];
    ytdIncome: number;
    ytdExpenses: number;
    ytdProfit: number;
};

export type YearlyPLData = {
    year: number;
    income: number;
    expenses: number;
    profit: number;
};

export type CategoryYearlyData = {
    categoryId: number;
    categoryName: string;
    categoryType: string;
    yearlyAmounts: Record<number, number>;
    total: number;
};

export type YearlyComparisonReport = {
    years: number[];
    categories: CategoryYearlyData[];
    yearlyTotals: YearlyPLData[];
};

export type FinanceDashboard = {
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

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories() {
    return createAction("getCategories", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const categories = await prisma.financeCategory.findMany({
            orderBy: [{ type: "asc" }, { name: "asc" }],
            include: { _count: { select: { transactions: true } } },
        });

        return { success: true, data: categories as FinanceCategoryWithCount[] };
    });
}

export async function createCategory(data: { name: string; type: string; description?: string }) {
    return createAction("createCategory", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const existing = await prisma.financeCategory.findUnique({ where: { name: data.name } });
        if (existing) return { success: false, error: "A category with this name already exists." };

        const category = await prisma.financeCategory.create({ data });
        revalidatePath("/finance");
        return { success: true, data: category };
    });
}

export async function updateCategory(id: number, data: { name: string; type: string; description?: string }) {
    return createAction("updateCategory", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const existing = await prisma.financeCategory.findFirst({
            where: { name: data.name, NOT: { id } },
        });
        if (existing) return { success: false, error: "A category with this name already exists." };

        const updated = await prisma.financeCategory.update({ where: { id }, data });
        revalidatePath("/finance");
        return { success: true, data: updated };
    });
}

export async function deleteCategory(id: number) {
    return createAction("deleteCategory", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const count = await prisma.financeTransaction.count({ where: { categoryId: id } });
        if (count > 0) {
            return {
                success: false,
                error: `Cannot delete — this category has ${count} transaction(s). Reassign or delete them first.`,
            };
        }

        await prisma.financeCategory.delete({ where: { id } });
        revalidatePath("/finance");
        return { success: true, data: null };
    });
}

// ─── Loans & Employee Payments ───────────────────────────────────────────

export async function getFinanceEmployees() {
    return createAction("getFinanceEmployees", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const company = (session.user as any).company || "blackfox";
        const employees = await prisma.employee.findMany({
            where: { company },
            select: { id: true, firstName: true, lastName: true, designation: true }
        });

        return { success: true, data: employees };
    });
}

/**
 * Marks a payment from the company to an employee as a Loan (Expense).
 * This creates a transaction in Blackfox Finance.
 */
export async function recordLoanDisbursement(data: {
    employeeId: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    return createAction("recordLoanDisbursement", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { id: data.employeeId }
        });

        if (!employee) return { success: false, error: "Employee not found." };

        // 1. Ensure a "Loans to Employees" category exists (Expense)
        let category = await prisma.financeCategory.findUnique({
            where: { name: "Loans to Employees" }
        });

        if (!category) {
            category = await prisma.financeCategory.create({
                data: {
                    name: "Loans to Employees",
                    type: "Expense",
                    description: "Amount given to employees as personal loans"
                }
            });
        }

        // 2. Create the transaction
        const tx = await prisma.financeTransaction.create({
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

/**
 * Records a repayment from an employee (Revenue).
 */
export async function recordLoanRepayment(data: {
    employeeId: string;
    amount: number;
    date: string;
    notes?: string;
}) {
    return createAction("recordLoanRepayment", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { id: data.employeeId }
        });

        if (!employee) return { success: false, error: "Employee not found." };

        // 1. Ensure a "Loan Repayments" category exists (Revenue)
        let category = await prisma.financeCategory.findUnique({
            where: { name: "Loan Repayments" }
        });

        if (!category) {
            category = await prisma.financeCategory.create({
                data: {
                    name: "Loan Repayments",
                    type: "Revenue",
                    description: "Repayments received from employees for personal loans"
                }
            });
        }

        // 2. Create the transaction
        const tx = await prisma.financeTransaction.create({
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

export async function getTransactions(filters?: {
    year?: number;
    month?: number;
    categoryId?: number;
    type?: string; // "Revenue" | "Expense"
    search?: string;
}) {
    return createAction("getTransactions", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const where: any = {};

        if (filters?.year) {
            const startDate = new Date(filters.year, (filters.month ?? 1) - 1, 1);
            const endDate = filters.month
                ? new Date(filters.year, filters.month, 0, 23, 59, 59)
                : new Date(filters.year, 11, 31, 23, 59, 59);
            where.date = { gte: startDate, lte: endDate };
        }

        if (filters?.categoryId) {
            where.categoryId = filters.categoryId;
        }

        if (filters?.type) {
            where.category = { type: filters.type };
        }

        if (filters?.search) {
            where.description = { contains: filters.search };
        }

        const transactions = await prisma.financeTransaction.findMany({
            where,
            include: { category: { select: { id: true, name: true, type: true } } },
            orderBy: { date: "asc" },
        });

        const data: FinanceTransactionWithCategory[] = transactions.map((t) => ({
            ...t,
            amount: t.amount.toNumber(),
        }));

        return { success: true, data };
    });
}

// Helper to auto-sync "Post Production Service Payment" to the vendor space
export async function handleVendorSync(txId: number, categoryName: string, date: Date, description: string, amount: number, notes: string | null) {
    // Always clear existing sync for this transaction ID
    await prisma.vendorFinanceTransaction.deleteMany({
        where: { notes: { startsWith: `[Auto-sync from Blackfox TX#${txId}]` } }
    });

    if (categoryName === "Post Production Service Payment") {
        let vendorCategory = await prisma.vendorFinanceCategory.findUnique({ where: { name: "Service Income" } });
        if (!vendorCategory) {
            vendorCategory = await prisma.vendorFinanceCategory.create({
                data: { name: "Service Income", type: "Revenue" }
            });
        }
        await prisma.vendorFinanceTransaction.create({
            data: {
                date: date,
                description: description,
                amount: new Decimal(Math.abs(amount)),
                categoryId: vendorCategory.id,
                notes: `[Auto-sync from Blackfox TX#${txId}] ${notes || ""}`.trim(),
            }
        });
    }
}

export async function createTransaction(data: {
    date: string;
    description: string;
    amount: number; // The raw (unsigned) amount — sign is applied here based on category type
    categoryId: number;
    notes?: string;
}) {
    return createAction("createTransaction", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const category = await prisma.financeCategory.findUnique({ where: { id: data.categoryId } });
        if (!category) return { success: false, error: "Category not found." };

        // Auto-sign: Expense categories always store negative amounts
        const signedAmount = category.type === "Expense" ? -Math.abs(data.amount) : Math.abs(data.amount);

        const tx = await prisma.financeTransaction.create({
            data: {
                date: new Date(data.date),
                description: data.description,
                amount: new Decimal(signedAmount),
                categoryId: data.categoryId,
                notes: data.notes || null,
            },
            include: { category: { select: { id: true, name: true, type: true } } },
        });

        await handleVendorSync(tx.id, category.name, tx.date, tx.description, tx.amount.toNumber(), tx.notes);

        revalidatePath("/finance");
        return { success: true, data: { ...tx, amount: tx.amount.toNumber() } };
    });
}

export async function createBatchTransactions(transactions: {
    date: string;
    description: string;
    amount: number;
    categoryId: number;
    notes?: string;
}[]) {
    return createAction("createBatchTransactions", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const categoryIds = [...new Set(transactions.map(t => t.categoryId))];
        const categories = await prisma.financeCategory.findMany({
            where: { id: { in: categoryIds } }
        });
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        for (const t of transactions) {
            const category = categoryMap.get(t.categoryId);
            if (!category) continue;

            const signedAmount = category.type === "Expense" ? -Math.abs(t.amount) : Math.abs(t.amount);
            const tx = await prisma.financeTransaction.create({
                data: {
                    date: new Date(t.date),
                    description: t.description,
                    amount: new Decimal(signedAmount),
                    categoryId: t.categoryId,
                    notes: t.notes || null,
                }
            });
            await handleVendorSync(tx.id, category.name, tx.date, tx.description, tx.amount.toNumber(), tx.notes);
        }

        revalidatePath("/finance");
        return { success: true, data: null };
    });
}

export async function updateTransaction(
    id: number,
    data: {
        date: string;
        description: string;
        amount: number;
        categoryId: number;
        notes?: string;
    }
) {
    return createAction("updateTransaction", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const category = await prisma.financeCategory.findUnique({ where: { id: data.categoryId } });
        if (!category) return { success: false, error: "Category not found." };

        const signedAmount = category.type === "Expense" ? -Math.abs(data.amount) : Math.abs(data.amount);

        const tx = await prisma.financeTransaction.update({
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

        await handleVendorSync(tx.id, category.name, tx.date, tx.description, tx.amount.toNumber(), tx.notes);

        revalidatePath("/finance");
        return { success: true, data: { ...tx, amount: tx.amount.toNumber() } };
    });
}

export async function deleteTransaction(id: number) {
    return createAction("deleteTransaction", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        await prisma.vendorFinanceTransaction.deleteMany({
            where: { notes: { startsWith: `[Auto-sync from Blackfox TX#${id}]` } }
        });

        await prisma.financeTransaction.delete({ where: { id } });
        revalidatePath("/finance");
        return { success: true, data: null };
    });
}

// ─── P&L Report ───────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getProfitLossReport(year: number) {
    return createAction("getProfitLossReport", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const transactions = await prisma.financeTransaction.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            include: { category: true },
            orderBy: { date: "asc" },
        });

        // Build category → monthly amounts map
        const categoryMap = new Map<
            number,
            { name: string; type: string; months: number[] }
        >();

        for (const tx of transactions) {
            const month = tx.date.getMonth(); // 0-11
            const amount = tx.amount.toNumber();
            if (!categoryMap.has(tx.categoryId)) {
                categoryMap.set(tx.categoryId, {
                    name: tx.category.name,
                    type: tx.category.type,
                    months: Array(12).fill(0),
                });
            }
            // Always add absolute value; sign comes from `type`
            const entry = categoryMap.get(tx.categoryId)!;
            entry.months[month] += Math.abs(amount);
        }

        const categories: CategoryMonthlyData[] = Array.from(categoryMap.entries()).map(
            ([categoryId, data]) => ({
                categoryId,
                categoryName: data.name,
                categoryType: data.type,
                monthlyAmounts: data.months,
                total: data.months.reduce((sum, v) => sum + v, 0),
            })
        );

        // Monthly totals
        const monthlyTotals: MonthlyPLData[] = MONTH_NAMES.map((monthName, i) => {
            const income = categories
                .filter((c) => c.categoryType === "Revenue")
                .reduce((sum, c) => sum + c.monthlyAmounts[i], 0);
            const expenses = categories
                .filter((c) => c.categoryType === "Expense")
                .reduce((sum, c) => sum + c.monthlyAmounts[i], 0);
            return { month: i + 1, monthName, income, expenses, profit: income - expenses };
        });

        const ytdIncome = monthlyTotals.reduce((s, m) => s + m.income, 0);
        const ytdExpenses = monthlyTotals.reduce((s, m) => s + m.expenses, 0);
        const ytdProfit = ytdIncome - ytdExpenses;

        const report: PLReport = {
            year,
            categories: categories.sort((a, b) => {
                if (a.categoryType !== b.categoryType) return a.categoryType === "Revenue" ? -1 : 1;
                return a.categoryName.localeCompare(b.categoryName);
            }),
            monthlyTotals,
            ytdIncome,
            ytdExpenses,
            ytdProfit,
        };

        return { success: true, data: report };
    });
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export async function getFinanceDashboard(year: number) {
    return createAction("getFinanceDashboard", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const transactions = await prisma.financeTransaction.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            include: { category: { select: { name: true, type: true } } },
        });

        // Monthly aggregation
        const monthly = Array.from({ length: 12 }, (_, i) => ({
            month: MONTH_NAMES[i],
            income: 0,
            expenses: 0,
            profit: 0,
        }));

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

        // Expense pie chart
        const totalExpenses = ytdExpenses || 1;
        const expenseByCategory = Object.entries(expenseByCat)
            .map(([name, value]) => ({
                name,
                value,
                percentage: Math.round((value / totalExpenses) * 1000) / 10,
            }))
            .sort((a, b) => b.value - a.value);

        // Top 3 highest expenses
        const topExpenses = expenseByCategory.slice(0, 3).map((e) => ({
            category: e.name,
            amount: e.value,
        }));

        // Highest/Lowest income months (exclude months with 0 income)
        const incomeMonths = monthly
            .filter((m) => m.income > 0)
            .sort((a, b) => b.income - a.income);

        const highestIncomeMonths = incomeMonths.slice(0, 3).map((m) => ({
            month: m.month,
            amount: m.income,
        }));
        const lowestIncomeMonths = [...incomeMonths].reverse().slice(0, 3).map((m) => ({
            month: m.month,
            amount: m.income,
        }));

        // Most/Least profitable months (all months with any activity)
        const activeMonths = monthly.filter((m) => m.income > 0 || m.expenses > 0);
        const sortedByProfit = [...activeMonths].sort((a, b) => b.profit - a.profit);

        const mostProfitableMonths = sortedByProfit.slice(0, 3).map((m) => ({
            month: m.month,
            amount: m.profit,
        }));
        const leastProfitableMonths = sortedByProfit.reverse().slice(0, 3).map((m) => ({
            month: m.month,
            amount: m.profit,
        }));

        const dashboard: FinanceDashboard = {
            ytdIncome,
            ytdProfit,
            ytdExpenses,
            monthlyData: monthly,
            expenseByCategory,
            highestIncomeMonths,
            lowestIncomeMonths,
            mostProfitableMonths,
            leastProfitableMonths,
            topExpenses,
        };

        return { success: true, data: dashboard };
    });
}

// ─── Available years ──────────────────────────────────────────────────────────

export async function getFinanceYears() {
    return createAction("getFinanceYears", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.financeTransaction.findMany({
            select: { date: true },
            orderBy: { date: "asc" },
        });

        const years = [...new Set(transactions.map((t) => t.date.getFullYear()))];
        const currentYear = new Date().getFullYear();
        if (!years.includes(currentYear)) years.push(currentYear);

        return { success: true, data: years.sort((a, b) => b - a) };
    });
}

export async function getYearlyComparisonReport() {
    return createAction("getYearlyComparisonReport", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.financeTransaction.findMany({
            include: { category: true },
            orderBy: { date: "asc" },
        });

        // Map and extract year properly to avoid 'unknown' types
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

        const categories: CategoryYearlyData[] = Array.from(categoryMap.entries()).map(
            ([categoryId, data]) => ({
                categoryId,
                categoryName: data.name,
                categoryType: data.type,
                yearlyAmounts: data.years,
                total: Object.values(data.years).reduce((sum, v) => sum + v, 0),
            })
        );

        const yearlyTotals: YearlyPLData[] = years.map((year) => {
            const income = categories
                .filter((c) => c.categoryType === "Revenue")
                .reduce((sum, c) => sum + (c.yearlyAmounts[year] || 0), 0);
            const expenses = categories
                .filter((c) => c.categoryType === "Expense")
                .reduce((sum, c) => sum + (c.yearlyAmounts[year] || 0), 0);
            return { year, income, expenses, profit: income - expenses };
        });

        const report: YearlyComparisonReport = {
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
