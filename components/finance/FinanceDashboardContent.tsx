"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { getFinanceDashboard, getFinanceYears } from "@/app/actions/finance";
import type { FinanceDashboard } from "@/app/actions/finance";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { LayoutDashboard, TrendingUp, TrendingDown, Loader2, Trophy, AlertTriangle } from "lucide-react";

const BDT = (v: number) =>
    `৳${Math.abs(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CURRENT_YEAR = new Date().getFullYear();

const EXPENSE_COLORS = [
    "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
    "#a855f7", "#d946ef", "#22c55e", "#3b82f6", "#eab308",
    "#fb923c", "#e11d48", "#0ea5e9", "#7c3aed", "#16a34a",
];

const tooltipStyle = {
    contentStyle: { backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" },
    labelStyle: { color: "#fff", fontWeight: "bold" },
    itemStyle: { color: "#e2e8f0" },
};

export default function FinanceDashboardContent() {
    const [year, setYear] = useState(CURRENT_YEAR);
    const [years, setYears] = useState<number[]>([CURRENT_YEAR]);
    const [data, setData] = useState<FinanceDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [dashRes, yearRes] = await Promise.all([
            getFinanceDashboard(year),
            getFinanceYears()
        ]);
        if (dashRes.success && dashRes.data) setData(dashRes.data as FinanceDashboard);
        if (yearRes.success && yearRes.data) setYears(yearRes.data as number[]);
        setLoading(false);
    }, [year]);

    useEffect(() => { load(); }, [load]);

    return (
        <>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
                        <LayoutDashboard size={22} className="text-primary" /> Finance Overview
                    </h1>
                    <p className="text-text-muted text-sm mt-1">BDT income &amp; expense dashboard — auto-updated from transactions</p>
                </div>
                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="px-4 py-2 bg-bg-app border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer font-semibold"
                >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-text-muted" /></div>
            ) : !data ? null : (
                <div className="space-y-6">
                    {/* YTD KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-status-success/10 rounded-xl"><TrendingUp size={20} className="text-status-success" /></div>
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Income YTD</p>
                                    <p className="text-2xl font-bold text-status-success">{BDT(data.ytdIncome)}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-status-error/10 rounded-xl"><TrendingDown size={20} className="text-status-error" /></div>
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Total Expenses YTD</p>
                                    <p className="text-2xl font-bold text-status-error">{BDT(data.ytdExpenses)}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className={`p-5 ${data.ytdProfit >= 0 ? "ring-1 ring-primary/20" : "ring-1 ring-status-error/20"}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${data.ytdProfit >= 0 ? "bg-primary/10" : "bg-status-error/10"}`}>
                                    {data.ytdProfit >= 0
                                        ? <Trophy size={20} className="text-primary" />
                                        : <AlertTriangle size={20} className="text-status-error" />}
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Total Profit (Loss) YTD</p>
                                    <p className={`text-2xl font-bold ${data.ytdProfit >= 0 ? "text-primary" : "text-status-error"}`}>
                                        {data.ytdProfit < 0 ? "(" : ""}{BDT(Math.abs(data.ytdProfit))}{data.ytdProfit < 0 ? ")" : ""}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Bar Chart — monthly income/expense/profit */}
                    <Card className="p-6">
                        <h3 className="text-base font-bold text-text-main mb-5">Total Service Income, Profit &amp; Expense — Monthly</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="month" stroke="#888" fontSize={11} tickMargin={8} />
                                <YAxis
                                    stroke="#888"
                                    fontSize={10}
                                    tickFormatter={(v) => v >= 1000000 ? `৳${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `৳${(v / 1000).toFixed(0)}K` : `৳${v}`}
                                />
                                <Tooltip
                                    {...tooltipStyle}
                                    formatter={(value: any, name: any) => [BDT(Math.abs(value)), name]}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
                                <Bar dataKey="income" name="Total Income" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="profit" name="Profit (Loss)" fill="#10b981" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="expenses" name="Expense" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>

                    {/* Monthly Summary Table */}
                    <Card className="p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-border-subtle">
                            <h3 className="font-bold text-text-main text-sm">Monthly Summary</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border-subtle bg-bg-app/50">
                                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Month</th>
                                        <th className="text-right px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Income</th>
                                        <th className="text-right px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Profit (Loss)</th>
                                        <th className="text-right px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Expense</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {data.monthlyData.map((m) => {
                                        const isLoss = m.profit < 0;
                                        const hasData = m.income > 0 || m.expenses > 0;
                                        return (
                                            <tr key={m.month} className={`transition-colors ${hasData ? "hover:bg-bg-app/40" : "opacity-40"} ${isLoss ? "bg-status-error/5" : ""}`}>
                                                <td className="px-4 py-2.5 font-semibold text-text-main">{m.month}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-status-success">{m.income > 0 ? BDT(m.income) : "—"}</td>
                                                <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${isLoss ? "text-status-error" : "text-text-main"}`}>
                                                    {m.income > 0 || m.expenses > 0
                                                        ? isLoss ? `(${BDT(Math.abs(m.profit))})` : BDT(m.profit)
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{m.expenses > 0 ? BDT(m.expenses) : "—"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* 3-column stats + pie */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left: Top/Bottom months */}
                        <div className="space-y-4">
                            <Card className="p-5">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">3 Highest Income Months</h4>
                                <div className="space-y-2">
                                    {data.highestIncomeMonths.length === 0 ? (
                                        <p className="text-xs text-text-muted italic">No data</p>
                                    ) : data.highestIncomeMonths.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-text-main">{m.month}</span>
                                            <span className="text-sm font-bold text-status-success tabular-nums">{BDT(m.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                            <Card className="p-5">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">3 Lowest Income Months</h4>
                                <div className="space-y-2">
                                    {data.lowestIncomeMonths.length === 0 ? (
                                        <p className="text-xs text-text-muted italic">No data</p>
                                    ) : data.lowestIncomeMonths.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-text-main">{m.month}</span>
                                            <span className="text-sm text-text-muted tabular-nums">{BDT(m.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                            <Card className="p-5">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">3 Most Profitable Months</h4>
                                <div className="space-y-2">
                                    {data.mostProfitableMonths.length === 0 ? (
                                        <p className="text-xs text-text-muted italic">No data</p>
                                    ) : data.mostProfitableMonths.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-text-main">{m.month}</span>
                                            <span className={`text-sm font-bold tabular-nums ${m.amount >= 0 ? "text-status-success" : "text-status-error"}`}>
                                                {m.amount < 0 ? `(${BDT(Math.abs(m.amount))})` : BDT(m.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                            <Card className="p-5">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">3 Least Profitable Months</h4>
                                <div className="space-y-2">
                                    {data.leastProfitableMonths.length === 0 ? (
                                        <p className="text-xs text-text-muted italic">No data</p>
                                    ) : data.leastProfitableMonths.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-text-main">{m.month}</span>
                                            <span className={`text-sm font-bold tabular-nums text-status-error`}>
                                                {m.amount < 0 ? `(${BDT(Math.abs(m.amount))})` : BDT(m.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Right: Expense Pie Chart — spans 2 cols */}
                        <div className="md:col-span-2 space-y-4">
                            <Card className="p-6">
                                <h3 className="text-base font-bold text-text-main mb-5">Expense Breakdown by Category</h3>
                                {data.expenseByCategory.length === 0 ? (
                                    <div className="h-64 flex items-center justify-center text-text-muted italic text-sm">No expense data</div>
                                ) : (
                                    <div className="flex flex-col lg:flex-row items-center gap-6">
                                        <ResponsiveContainer width={260} height={260}>
                                            <PieChart>
                                                <Pie
                                                    data={data.expenseByCategory}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={110}
                                                    dataKey="value"
                                                    labelLine={false}
                                                    label={({ percentage, ...rest }: any) => percentage >= 5 ? `${percentage}%` : ""}
                                                >
                                                    {data.expenseByCategory.map((_, i) => (
                                                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    {...tooltipStyle}
                                                    formatter={(v: any, name: any, props: any) => [
                                                        `${BDT(v)} (${props.payload.percentage}%)`, name
                                                    ]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Legend */}
                                        <div className="flex-1 grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                            {data.expenseByCategory.map((cat, i) => (
                                                <div key={cat.name} className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                                                    <span className="text-xs text-text-muted truncate flex-1">{cat.name}</span>
                                                    <span className="text-xs font-semibold text-text-main tabular-nums shrink-0">{cat.percentage}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Top 3 expenses */}
                            <Card className="p-5">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">3 Highest Expenses YTD</h4>
                                <div className="space-y-3">
                                    {data.topExpenses.length === 0 ? (
                                        <p className="text-xs text-text-muted italic">No expense data</p>
                                    ) : data.topExpenses.map((e, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                style={{ background: EXPENSE_COLORS[i] + "20", color: EXPENSE_COLORS[i] }}>
                                                {i + 1}
                                            </div>
                                            <span className="text-sm text-text-main flex-1 truncate">{e.category}</span>
                                            <span className="text-sm font-bold text-status-error tabular-nums shrink-0">{BDT(e.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
