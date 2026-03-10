"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { getProfitLossReport, getFinanceYears, getYearlyComparisonReport } from "@/app/actions/finance";
import type { PLReport, YearlyComparisonReport } from "@/app/actions/finance";
import { FileSpreadsheet, Loader2, TrendingUp, TrendingDown, Calendar, BarChart, LayoutGrid } from "lucide-react";

const BDT = (v: number) =>
    v.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();

function PLCell({ value, type }: { value: number; type: string }) {
    if (value === 0) return <td className="px-3 py-2.5 text-right text-text-muted/40 tabular-nums text-xs">—</td>;
    return (
        <td className="px-3 py-2.5 text-right tabular-nums text-xs text-text-main">
            {BDT(value)}
        </td>
    );
}

function ProfitCell({ value }: { value: number }) {
    if (value === 0) return <td className="px-3 py-2.5 text-right text-text-muted/40 tabular-nums text-xs font-semibold">—</td>;
    const isLoss = value < 0;
    return (
        <td className={`px-3 py-2.5 text-right tabular-nums text-xs font-bold ${isLoss ? "text-status-error" : "text-status-success"}`}>
            {isLoss ? `(${BDT(Math.abs(value))})` : BDT(value)}
        </td>
    );
}

export default function ProfitLossContent() {
    const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
    const [year, setYear] = useState(CURRENT_YEAR);
    const [years, setYears] = useState<number[]>([CURRENT_YEAR]);
    const [monthlyReport, setMonthlyReport] = useState<PLReport | null>(null);
    const [yearlyReport, setYearlyReport] = useState<YearlyComparisonReport | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        if (viewMode === "monthly") {
            const [repRes, yearRes] = await Promise.all([
                getProfitLossReport(year),
                getFinanceYears()
            ]);
            if (repRes.success && repRes.data) setMonthlyReport(repRes.data as PLReport);
            if (yearRes.success && yearRes.data) setYears(yearRes.data as number[]);
        } else {
            const res = await getYearlyComparisonReport();
            if (res.success && res.data) setYearlyReport(res.data as YearlyComparisonReport);
        }
        setLoading(false);
    }, [year, viewMode]);

    useEffect(() => { loadData(); }, [loadData]);

    const revenueCategoriesMonthly = monthlyReport?.categories.filter((c) => c.categoryType === "Revenue") || [];
    const expenseCategoriesMonthly = monthlyReport?.categories.filter((c) => c.categoryType === "Expense") || [];

    const revenueCategoriesYearly = yearlyReport?.categories.filter((c) => c.categoryType === "Revenue") || [];
    const expenseCategoriesYearly = yearlyReport?.categories.filter((c) => c.categoryType === "Expense") || [];

    return (
        <>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
                            <FileSpreadsheet size={22} className="text-primary" /> Profit &amp; Loss
                        </h1>
                        <p className="text-text-muted text-sm mt-1">
                            {viewMode === "monthly" ? "Monthly income & expense breakdown" : "Yearly comparison breakdown"} in BDT
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-bg-app p-1 rounded-xl border border-border-subtle">
                    <button
                        onClick={() => setViewMode("monthly")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "monthly" ? "bg-bg-sidebar text-primary shadow-sm" : "text-text-muted hover:text-text-main"}`}
                    >
                        <Calendar size={16} /> Monthly
                    </button>
                    <button
                        onClick={() => setViewMode("yearly")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "yearly" ? "bg-bg-sidebar text-primary shadow-sm" : "text-text-muted hover:text-text-main"}`}
                    >
                        <LayoutGrid size={16} /> Yearly Compare
                    </button>
                </div>

                {viewMode === "monthly" && (
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-4 py-2 bg-bg-app border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer font-semibold"
                    >
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                )}
            </div>

            {/* YTD Summary (Only for monthly view) */}
            {viewMode === "monthly" && monthlyReport && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-status-success/10 rounded-xl"><TrendingUp size={18} className="text-status-success" /></div>
                            <div>
                                <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Income YTD</p>
                                <p className="text-xl font-bold text-status-success">৳{BDT(monthlyReport.ytdIncome)}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-status-error/10 rounded-xl"><TrendingDown size={18} className="text-status-error" /></div>
                            <div>
                                <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Expenses YTD</p>
                                <p className="text-xl font-bold text-status-error">৳{BDT(monthlyReport.ytdExpenses)}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${monthlyReport.ytdProfit >= 0 ? "bg-primary/10" : "bg-status-error/10"}`}>
                                <FileSpreadsheet size={18} className={monthlyReport.ytdProfit >= 0 ? "text-primary" : "text-status-error"} />
                            </div>
                            <div>
                                <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Net Profit YTD</p>
                                <p className={`text-xl font-bold ${monthlyReport.ytdProfit >= 0 ? "text-primary" : "text-status-error"}`}>
                                    {monthlyReport.ytdProfit < 0 ? "(" : ""}৳{BDT(Math.abs(monthlyReport.ytdProfit))}{monthlyReport.ytdProfit < 0 ? ")" : ""}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-text-muted" /></div>
            ) : viewMode === "monthly" ? (
                !monthlyReport ? null : (
                    <Card className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-border-subtle bg-bg-app">
                                        <th className="sticky left-0 bg-bg-app text-left px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[180px]">
                                            {year}
                                        </th>
                                        {MONTHS.map((m) => (
                                            <th key={m} className="px-3 py-3 text-right text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[90px]">{m}</th>
                                        ))}
                                        <th className="px-3 py-3 text-right text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[100px]">Total YTD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* ── Revenue ── */}
                                    <tr className="bg-status-success/5">
                                        <td colSpan={14} className="sticky left-0 bg-status-success/5 px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp size={13} className="text-status-success" />
                                                <span className="text-[10px] font-bold text-status-success uppercase tracking-wider">Income</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {revenueCategoriesMonthly.map((cat) => (
                                        <tr key={cat.categoryId} className="hover:bg-bg-app/30 transition-colors">
                                            <td className="sticky left-0 bg-bg-sidebar px-4 py-2.5 text-text-muted font-medium pl-8 border-b border-border-subtle/30">{cat.categoryName}</td>
                                            {cat.monthlyAmounts.map((amt, idx) => (
                                                <PLCell key={idx} value={amt} type="Revenue" />
                                            ))}
                                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-text-main">{BDT(cat.total)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-border-subtle bg-status-success/10">
                                        <td className="sticky left-0 bg-status-success/10 px-4 py-3 font-bold text-text-main pl-4">Total Income</td>
                                        {monthlyReport.monthlyTotals.map((m) => (
                                            <td key={m.month} className="px-3 py-3 text-right tabular-nums font-bold text-status-success text-xs">
                                                {m.income > 0 ? BDT(m.income) : "—"}
                                            </td>
                                        ))}
                                        <td className="px-3 py-3 text-right tabular-nums font-bold text-status-success">৳{BDT(monthlyReport.ytdIncome)}</td>
                                    </tr>

                                    {/* ── Expenses ── */}
                                    <tr className="bg-status-error/5">
                                        <td colSpan={14} className="sticky left-0 bg-status-error/5 px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown size={13} className="text-status-error" />
                                                <span className="text-[10px] font-bold text-status-error uppercase tracking-wider">Expenses</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {expenseCategoriesMonthly.map((cat) => (
                                        <tr key={cat.categoryId} className="hover:bg-bg-app/30 transition-colors">
                                            <td className="sticky left-0 bg-bg-sidebar px-4 py-2.5 text-text-muted font-medium pl-8 border-b border-border-subtle/30">{cat.categoryName}</td>
                                            {cat.monthlyAmounts.map((amt, idx) => (
                                                <PLCell key={idx} value={amt} type="Expense" />
                                            ))}
                                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-text-main">{BDT(cat.total)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-border-subtle bg-status-error/10">
                                        <td className="sticky left-0 bg-status-error/10 px-4 py-3 font-bold text-text-main pl-4">Total Expenses</td>
                                        {monthlyReport.monthlyTotals.map((m) => (
                                            <td key={m.month} className="px-3 py-3 text-right tabular-nums font-bold text-status-error text-xs">
                                                {m.expenses > 0 ? BDT(m.expenses) : "—"}
                                            </td>
                                        ))}
                                        <td className="px-3 py-3 text-right tabular-nums font-bold text-status-error">৳{BDT(monthlyReport.ytdExpenses)}</td>
                                    </tr>

                                    {/* ── Profit / Loss ── */}
                                    <tr className="border-t-2 border-border-subtle bg-bg-app font-bold">
                                        <td className="sticky left-0 bg-bg-app px-4 py-4 font-bold text-text-main text-sm">Total Profit (Loss)</td>
                                        {monthlyReport.monthlyTotals.map((m) => (
                                            <ProfitCell key={m.month} value={m.profit} />
                                        ))}
                                        <td className={`px-3 py-4 text-right tabular-nums font-bold text-sm ${monthlyReport.ytdProfit >= 0 ? "text-status-success" : "text-status-error"}`}>
                                            {monthlyReport.ytdProfit < 0 ? "(" : ""}৳{BDT(Math.abs(monthlyReport.ytdProfit))}{monthlyReport.ytdProfit < 0 ? ")" : ""}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )
            ) : (
                !yearlyReport ? null : (
                    <Card className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-border-subtle bg-bg-app">
                                        <th className="sticky left-0 bg-bg-app text-left px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[200px]">
                                            Category Comparison
                                        </th>
                                        {yearlyReport.years.map((y) => (
                                            <th key={y} className="px-4 py-3 text-right text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[100px]">{y}</th>
                                        ))}
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[120px]">Total Overall</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* ── Revenue ── */}
                                    <tr className="bg-status-success/5">
                                        <td colSpan={yearlyReport.years.length + 2} className="sticky left-0 bg-status-success/5 px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp size={13} className="text-status-success" />
                                                <span className="text-[10px] font-bold text-status-success uppercase tracking-wider">Income</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {revenueCategoriesYearly.map((cat) => (
                                        <tr key={cat.categoryId} className="hover:bg-bg-app/30 transition-colors">
                                            <td className="sticky left-0 bg-bg-sidebar px-4 py-2.5 text-text-muted font-medium pl-8 border-b border-border-subtle/30">{cat.categoryName}</td>
                                            {yearlyReport.years.map((y) => (
                                                <PLCell key={y} value={cat.yearlyAmounts[y] || 0} type="Revenue" />
                                            ))}
                                            <td className="px-4 py-2.5 text-right tabular-nums font-bold text-text-main">{BDT(cat.total)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-border-subtle bg-status-success/10">
                                        <td className="sticky left-0 bg-status-success/10 px-4 py-3 font-bold text-text-main pl-4">Total Yearly Income</td>
                                        {yearlyReport.yearlyTotals.map((yt) => (
                                            <td key={yt.year} className="px-4 py-3 text-right tabular-nums font-bold text-status-success text-xs">
                                                {yt.income > 0 ? BDT(yt.income) : "—"}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-right tabular-nums font-bold text-status-success">
                                            ৳{BDT(yearlyReport.yearlyTotals.reduce((s, y) => s + y.income, 0))}
                                        </td>
                                    </tr>

                                    {/* ── Expenses ── */}
                                    <tr className="bg-status-error/5">
                                        <td colSpan={yearlyReport.years.length + 2} className="sticky left-0 bg-status-error/5 px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown size={13} className="text-status-error" />
                                                <span className="text-[10px] font-bold text-status-error uppercase tracking-wider">Expenses</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {expenseCategoriesYearly.map((cat) => (
                                        <tr key={cat.categoryId} className="hover:bg-bg-app/30 transition-colors">
                                            <td className="sticky left-0 bg-bg-sidebar px-4 py-2.5 text-text-muted font-medium pl-8 border-b border-border-subtle/30">{cat.categoryName}</td>
                                            {yearlyReport.years.map((y) => (
                                                <PLCell key={y} value={cat.yearlyAmounts[y] || 0} type="Expense" />
                                            ))}
                                            <td className="px-4 py-2.5 text-right tabular-nums font-bold text-text-main">{BDT(cat.total)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-border-subtle bg-status-error/10">
                                        <td className="sticky left-0 bg-status-error/10 px-4 py-3 font-bold text-text-main pl-4">Total Yearly Expenses</td>
                                        {yearlyReport.yearlyTotals.map((yt) => (
                                            <td key={yt.year} className="px-4 py-3 text-right tabular-nums font-bold text-status-error text-xs">
                                                {yt.expenses > 0 ? BDT(yt.expenses) : "—"}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-right tabular-nums font-bold text-status-error">
                                            ৳{BDT(yearlyReport.yearlyTotals.reduce((s, y) => s + y.expenses, 0))}
                                        </td>
                                    </tr>

                                    {/* ── Profit / Loss ── */}
                                    <tr className="border-t-2 border-border-subtle bg-bg-app font-bold">
                                        <td className="sticky left-0 bg-bg-app px-4 py-4 font-bold text-text-main text-sm">Total Yearly Profit (Loss)</td>
                                        {yearlyReport.yearlyTotals.map((yt) => (
                                            <ProfitCell key={yt.year} value={yt.profit} />
                                        ))}
                                        {(() => {
                                            const grandTotalProfit = yearlyReport.yearlyTotals.reduce((s, y) => s + y.profit, 0);
                                            return <td className={`px-4 py-4 text-right tabular-nums font-bold text-sm ${grandTotalProfit >= 0 ? "text-status-success" : "text-status-error"}`}>
                                                {grandTotalProfit < 0 ? "(" : ""}৳{BDT(Math.abs(grandTotalProfit))}{grandTotalProfit < 0 ? ")" : ""}
                                            </td>
                                        })()}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )
            )}
        </>
    );
}
