"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import {
    getVendorTransactions, getVendorCategories, createVendorTransaction,
    updateVendorTransaction, deleteVendorTransaction, getVendorFinanceYears,
    getVendorFinanceEmployees, recordVendorLoanDisbursement, recordVendorLoanRepayment
} from "@/app/actions/vendor-finance";
import LoanManagementModal from "./LoanManagementModal";
import { Landmark } from "lucide-react";
import type { VendorFinanceTransactionWithCategory, VendorFinanceCategoryWithCount } from "@/app/actions/vendor-finance";
import {
    Plus, Pencil, Trash2, Download, Search,
    X, Check, Loader2, AlertCircle, Receipt, TrendingUp, TrendingDown, ArrowUpDown
} from "lucide-react";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const BDT = (amount: number) =>
    `৳${Math.abs(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();

// ─── Transaction Modal ────────────────────────────────────────────────────────

function EditTransactionModal({ transaction, categories, onClose, onSave }: {
    transaction: VendorFinanceTransactionWithCategory | null;
    categories: VendorFinanceCategoryWithCount[];
    onClose: () => void;
    onSave: () => void;
}) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [date, setDate] = useState(transaction ? new Date(transaction.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState(transaction?.description || "");
    const [amount, setAmount] = useState(transaction ? Math.abs(transaction.amount).toString() : "");
    const [categoryId, setCategoryId] = useState(transaction?.categoryId?.toString() || "");
    const [notes, setNotes] = useState(transaction?.notes || "");
    const [error, setError] = useState("");

    const selectedCategory = categories.find(c => c.id.toString() === categoryId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) { setError("Date is required."); return; }
        if (!description.trim()) { setError("Description is required."); return; }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError("Enter a valid positive amount."); return; }
        if (!categoryId) { setError("Please select a category."); return; }
        setError("");

        startTransition(async () => {
            const data = { date, description: description.trim(), amount: Number(amount), categoryId: Number(categoryId), notes: notes.trim() || undefined };
            const res = transaction
                ? await updateVendorTransaction(transaction.id, data)
                : await createVendorTransaction(data);
            if (res.success) { toast.success(transaction ? "Transaction updated." : "Transaction added."); onSave(); onClose(); }
            else setError(res.error || "Something went wrong.");
        });
    };

    const revenueCategories = categories.filter(c => c.type === "Revenue");
    const expenseCategories = categories.filter(c => c.type === "Expense");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-bg-sidebar rounded-2xl border border-border-subtle w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border-subtle sticky top-0 bg-bg-sidebar z-10">
                    <h2 className="text-lg font-bold text-text-main">{transaction ? "Edit Transaction" : "Add Transaction"}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm"><AlertCircle size={16} /><span>{error}</span></div>}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Date <span className="text-status-error">*</span></label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Amount (BDT) <span className="text-status-error">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">৳</span>
                                <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                                    className="w-full pl-7 pr-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all" />
                            </div>
                            {selectedCategory && (
                                <p className={`text-xs mt-1 ${selectedCategory.type === "Revenue" ? "text-status-success" : "text-status-error"}`}>
                                    Will be saved as {selectedCategory.type === "Revenue" ? "+" : "−"}{BDT(Number(amount) || 0)} ({selectedCategory.type})
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Category <span className="text-status-error">*</span></label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer">
                            <option value="">Select a category...</option>
                            {revenueCategories.length > 0 && <optgroup label="── Revenue">{revenueCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                            {expenseCategories.length > 0 && <optgroup label="── Expenses">{expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Description <span className="text-status-error">*</span></label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Staff Salary - March"
                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button type="submit" disabled={pending} className="flex-1 flex items-center justify-center gap-2">
                            {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteTxModal({ tx, onClose, onDeleted }: {
    tx: VendorFinanceTransactionWithCategory;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-bg-sidebar rounded-2xl border border-border-subtle w-full max-w-sm shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-status-error/15 flex items-center justify-center"><Trash2 size={18} className="text-status-error" /></div>
                    <div><h2 className="text-base font-bold text-text-main">Delete Transaction</h2><p className="text-sm text-text-muted truncate max-w-[200px]">{tx.description}</p></div>
                </div>
                <p className="text-sm text-text-muted">Are you sure? This cannot be undone.</p>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <button onClick={() => startTransition(async () => {
                        const res = await deleteVendorTransaction(tx.id);
                        if (res.success) { toast.success("Transaction deleted."); onDeleted(); onClose(); }
                        else toast.error(res.error || "Failed to delete.");
                    })} disabled={pending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-status-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-50">
                        {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VendorTransactionsContent() {
    const [transactions, setTransactions] = useState<VendorFinanceTransactionWithCategory[]>([]);
    const [categories, setCategories] = useState<VendorFinanceCategoryWithCount[]>([]);
    const [years, setYears] = useState<number[]>([CURRENT_YEAR]);
    const [loading, setLoading] = useState(true);

    const [year, setYear] = useState(CURRENT_YEAR);
    const [month, setMonth] = useState(0);
    const [filterCategory, setFilterCategory] = useState(0);
    const [filterType, setFilterType] = useState("");
    const [search, setSearch] = useState("");

    const [editTarget, setEditTarget] = useState<VendorFinanceTransactionWithCategory | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<VendorFinanceTransactionWithCategory | null>(null);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const sortField = searchParams.get("sortField") || "date";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "asc";

    const handleSort = (key: string) => {
        const newOrder = sortField === key && sortOrder === "asc" ? "desc" : "asc";
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", key); params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        const [txRes, catRes, yearRes] = await Promise.all([
            getVendorTransactions({ year, month: month || undefined, categoryId: filterCategory || undefined, type: filterType || undefined, search: search.trim() || undefined }),
            getVendorCategories(),
            getVendorFinanceYears(),
        ]);
        if (txRes.success && txRes.data) setTransactions(txRes.data as VendorFinanceTransactionWithCategory[]);
        if (catRes.success && catRes.data) setCategories(catRes.data as VendorFinanceCategoryWithCount[]);
        if (yearRes.success && yearRes.data) setYears(yearRes.data as number[]);
        setLoading(false);
    }, [year, month, filterCategory, filterType, search]);

    useEffect(() => { loadData(); }, [loadData]);

    const withBalance = transactions.reduce<(VendorFinanceTransactionWithCategory & { balance: number })[]>((acc, tx) => {
        const prev = acc[acc.length - 1]?.balance || 0;
        acc.push({ ...tx, balance: prev + tx.amount });
        return acc;
    }, []);

    const sortedData = [...withBalance].sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sortField) {
            case "date": aValue = new Date(a.date).getTime(); bValue = new Date(b.date).getTime(); break;
            case "category": aValue = a.category.name.toLowerCase(); bValue = b.category.name.toLowerCase(); break;
            case "description": aValue = a.description.toLowerCase(); bValue = b.description.toLowerCase(); break;
            case "amount": aValue = a.amount; bValue = b.amount; break;
            case "balance": aValue = a.balance; bValue = b.balance; break;
            default: return 0;
        }
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    const handleExportCSV = () => {
        const rows = ["Date,Category,Type,Description,Amount (BDT),Notes"];
        transactions.forEach(t => {
            rows.push(`${new Date(t.date).toLocaleDateString("en-GB")},"${t.category.name}",${t.category.type},"${t.description}",${t.amount.toFixed(2)},"${t.notes || ""}"`);
        });
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `vendor_finance_${year}${month ? "_" + MONTHS[month - 1] : ""}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-main flex items-center gap-2"><Receipt size={22} className="text-primary" /> Finance Transactions</h1>
                    <p className="text-text-muted text-sm mt-1">Frame IT Solutions — income and expense records</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setIsLoanModalOpen(true)} className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/5">
                        <Landmark size={16} /> Employee Loans
                    </Button>
                    <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2"><Download size={16} /> Export CSV</Button>
                    <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2"><Plus size={16} /> Add Transaction</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-status-success/10 rounded-xl"><TrendingUp size={18} className="text-status-success" /></div><div><p className="text-xs text-text-muted uppercase tracking-wider font-medium">Total Income</p><p className="text-xl font-bold text-status-success">{BDT(totalIncome)}</p></div></div></Card>
                <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-status-error/10 rounded-xl"><TrendingDown size={18} className="text-status-error" /></div><div><p className="text-xs text-text-muted uppercase tracking-wider font-medium">Total Expenses</p><p className="text-xl font-bold text-status-error">{BDT(totalExpenses)}</p></div></div></Card>
                <Card className="p-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${netProfit >= 0 ? "bg-primary/10" : "bg-status-error/10"}`}><Receipt size={18} className={netProfit >= 0 ? "text-primary" : "text-status-error"} /></div><div><p className="text-xs text-text-muted uppercase tracking-wider font-medium">Net Profit / Loss</p><p className={`text-xl font-bold ${netProfit >= 0 ? "text-primary" : "text-status-error"}`}>{netProfit >= 0 ? "" : "−"}{BDT(Math.abs(netProfit))}</p></div></div></Card>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Year</label>
                        <select value={year} onChange={e => { setYear(Number(e.target.value)); if (Number(e.target.value) === 0) setMonth(0); }}
                            className="px-4 py-2 bg-bg-app border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer font-semibold">
                            <option value={0}>All Years</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Month</label>
                        <select value={month} onChange={e => setMonth(Number(e.target.value))} disabled={year === 0}
                            className={`px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer min-w-[90px] ${year === 0 ? "opacity-50 cursor-not-allowed" : ""}`}>
                            <option value={0}>All</option>
                            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Type</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            className="px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer min-w-[100px]">
                            <option value="">All</option><option value="Revenue">Revenue</option><option value="Expense">Expense</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Category</label>
                        <select value={filterCategory} onChange={e => setFilterCategory(Number(e.target.value))}
                            className="px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer min-w-[140px]">
                            <option value={0}>All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Search</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description..."
                                className="w-full pl-8 pr-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="p-0 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-text-muted" /></div>
                ) : withBalance.length === 0 ? (
                    <div className="p-12 text-center">
                        <Receipt size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
                        <h3 className="text-lg font-semibold text-text-main mb-2">No transactions found</h3>
                        <p className="text-text-muted mb-4 text-sm">Try adjusting filters or add your first transaction.</p>
                        <Button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center gap-2"><Plus size={16} /> Add Transaction</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-subtle bg-bg-app/50">
                                    <th className="px-4 py-3"><SortableHeader label="Date" sortKey="date" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" /></th>
                                    <th className="px-4 py-3"><SortableHeader label="Category" sortKey="category" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" /></th>
                                    <th className="px-4 py-3"><SortableHeader label="Description" sortKey="description" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" /></th>
                                    <th className="px-4 py-3 text-right"><SortableHeader label="Amount" sortKey="amount" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-end pr-0" /></th>
                                    <th className="px-4 py-3 text-right"><SortableHeader label="Balance" sortKey="balance" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-end pr-0" /></th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {sortedData.map(tx => (
                                    <tr key={tx.id} className="hover:bg-bg-app/40 transition-colors group">
                                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{new Date(tx.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${tx.category.type === "Revenue" ? "bg-status-success/10 text-status-success" : "bg-status-error/10 text-status-error"}`}>
                                                {tx.category.type === "Revenue" ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {tx.category.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-text-main">
                                            <p className="truncate max-w-[200px]">{tx.description}</p>
                                            {tx.notes && <p className="text-xs text-text-muted truncate max-w-[200px]">{tx.notes}</p>}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${tx.amount >= 0 ? "text-status-success" : "text-status-error"}`}>
                                            {tx.amount >= 0 ? "+" : "−"}{BDT(tx.amount)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap ${tx.balance >= 0 ? "text-text-main" : "text-status-error"}`}>
                                            {tx.balance >= 0 ? "" : "−"}{BDT(tx.balance)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                <button onClick={() => setEditTarget(tx)} className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteTarget(tx)} className="p-1.5 text-text-muted hover:text-status-error rounded-lg hover:bg-status-error/10 transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-border-subtle bg-bg-app/70">
                                    <td colSpan={3} className="px-4 py-3 font-bold text-text-main text-sm">{withBalance.length} transactions</td>
                                    <td className="px-4 py-3 text-right font-bold text-text-main text-sm tabular-nums">
                                        <span className="text-status-success">+{BDT(totalIncome)}</span>
                                        <span className="text-text-muted mx-1">/</span>
                                        <span className="text-status-error">−{BDT(totalExpenses)}</span>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold text-sm tabular-nums ${netProfit >= 0 ? "text-primary" : "text-status-error"}`}>
                                        {netProfit >= 0 ? "" : "−"}{BDT(Math.abs(netProfit))}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modals */}
            {editTarget && <EditTransactionModal transaction={editTarget} categories={categories} onClose={() => setEditTarget(null)} onSave={loadData} />}
            {isAddModalOpen && <EditTransactionModal transaction={null} categories={categories} onClose={() => setIsAddModalOpen(false)} onSave={loadData} />}
            {deleteTarget && <DeleteTxModal tx={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={loadData} />}
            {isLoanModalOpen && (
                <LoanManagementModal
                    onClose={() => setIsLoanModalOpen(false)}
                    onSave={loadData}
                    getEmployees={getVendorFinanceEmployees}
                    recordDisbursement={recordVendorLoanDisbursement}
                    recordRepayment={recordVendorLoanRepayment}
                />
            )}
        </>
    );
}
