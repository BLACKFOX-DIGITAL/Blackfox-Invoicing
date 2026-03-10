"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { getCategories } from "@/app/actions/finance";
import { 
    getEstimates, createEstimate, updateEstimateStatus, deleteEstimate, 
    type EstimateType 
} from "@/app/actions/finance-estimates";
import type { FinanceCategoryWithCount } from "@/app/actions/finance";
import {
    Plus, Trash2, X, Check, Loader2, AlertCircle, FileText, CalendarDays, ThumbsUp, XCircle, Edit
} from "lucide-react";
import SortableHeader from "@/components/ui/SortableHeader";

const BDT = (amount: number) =>
    `৳${Math.abs(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Edit Estimate Modal ──────────────────────────────────────────────────────
function EditEstimateModal({
    estimate,
    categories,
    onClose,
    onSave,
}: {
    estimate: EstimateType;
    categories: FinanceCategoryWithCount[];
    onClose: () => void;
    onSave: () => void;
}) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [monthYYYYMM, setMonthYYYYMM] = useState(() => {
        const d = new Date(estimate.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const [description, setDescription] = useState(estimate.description);
    const [amount, setAmount] = useState(String(estimate.amount));
    const [categoryId, setCategoryId] = useState(String(estimate.categoryId));
    const [error, setError] = useState("");

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        return {
            value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        };
    });

    const expenseCategories = categories.filter(c => c.type === "Expense");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!monthYYYYMM) { setError("Target Month is required."); return; }
        if (!categoryId) { setError("Category is required."); return; }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError("Enter a valid amount."); return; }

        setError("");
        startTransition(async () => {
            const { updateEstimate } = await import("@/app/actions/finance-estimates");
            const res = await updateEstimate(estimate.id, {
                description: description.trim() || "Budget Estimate",
                amount: Number(amount),
                categoryId: Number(categoryId),
                date: new Date(`${monthYYYYMM}-01T00:00:00Z`),
                status: "Pending" // Reset to pending after edit
            });

            if (res.success) {
                toast.success("Estimate updated and resubmitted.");
                onSave();
                onClose();
            } else {
                setError(res.error || "Failed to update.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-bg-app border border-border-subtle rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border-subtle bg-bg-sidebar flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-text-main">Edit Budget</h3>
                        <p className="text-xs text-text-muted mt-0.5">Modify and resubmit the rejected budget.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main hover:bg-bg-app rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20 flex items-center gap-3 text-status-error text-sm animate-in slide-in-from-top-2 duration-200">
                            <AlertCircle size={18} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                                Target Month <span className="text-status-error">*</span>
                            </label>
                            <select
                                value={monthYYYYMM}
                                onChange={(e) => setMonthYYYYMM(e.target.value)}
                                className="w-full px-4 py-3 bg-bg-sidebar border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                            >
                                {monthOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                                    Category <span className="text-status-error">*</span>
                                </label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-4 py-3 bg-bg-sidebar border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Select...</option>
                                    {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                                    Amount (BDT) <span className="text-status-error">*</span>
                                </label>
                                <input
                                    type="number" step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-bg-sidebar border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Office Rent"
                                className="w-full px-4 py-3 bg-bg-sidebar border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border-subtle bg-bg-sidebar flex justify-end gap-3 rounded-b-2xl">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={pending} className="px-6">
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={pending} className="px-6">
                        {pending ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Propose Estimate Modal ──────────────────────────────────────────────────

function ProposeEstimateModal({
    categories,
    onClose,
    onSave,
}: {
    categories: FinanceCategoryWithCount[];
    onClose: () => void;
    onSave: () => void;
}) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    // Default to current month
    const [monthYYYYMM, setMonthYYYYMM] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const [entries, setEntries] = useState([
        { description: "", amount: "", categoryId: "" }
    ]);
    const [error, setError] = useState("");

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        return {
            value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        };
    });

    const handleAddRow = () => {
        setEntries([...entries, { description: "", amount: "", categoryId: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        if (entries.length > 1) {
            setEntries(entries.filter((_, i) => i !== index));
        }
    };

    const updateEntry = (index: number, field: string, value: string) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!monthYYYYMM) { setError("Target Month is required."); return; }
        
        const validEntries: { categoryId: number; amount: number; description?: string }[] = [];
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (!entry.categoryId) { setError(`Row ${i + 1}: Please select a category.`); return; }
            if (!entry.amount || isNaN(Number(entry.amount)) || Number(entry.amount) <= 0) { 
                setError(`Row ${i + 1}: Enter a valid positive amount.`); return; 
            }
            validEntries.push({
                categoryId: Number(entry.categoryId),
                amount: Number(entry.amount),
                description: entry.description.trim() || undefined,
            });
        }
        
        setError("");

        startTransition(async () => {
            const res = await createEstimate({
                monthYYYYMM,
                entries: validEntries
            });

            if (res.success) {
                toast.success("Budget estimates proposed successfully.");
                onSave();
                onClose();
            } else {
                setError(res.error || "Something went wrong.");
            }
        });
    };

    const expenseCategories = categories.filter((c) => c.type === "Expense");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-bg-sidebar rounded-2xl border border-border-subtle w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-border-subtle shrink-0">
                    <h2 className="text-lg font-bold text-text-main">
                        Propose Budgets
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="flex items-center gap-2 p-3 mb-4 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mb-6 w-48">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                            Target Month <span className="text-status-error">*</span>
                        </label>
                        <select
                            value={monthYYYYMM}
                            onChange={(e) => setMonthYYYYMM(e.target.value)}
                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                            {monthOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Entries</h3>
                            <Button type="button" variant="secondary" onClick={handleAddRow} className="py-1.5 px-3 text-xs flex items-center gap-1.5">
                                <Plus size={14} /> Add Row
                            </Button>
                        </div>
                        
                        {entries.map((entry, i) => (
                            <div key={i} className="flex gap-3 items-start bg-bg-app border border-border-subtle p-3 rounded-lg relative">
                                <div className="flex-1 grid grid-cols-3 gap-3">
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                                            Category <span className="text-status-error">*</span>
                                        </label>
                                        <select
                                            value={entry.categoryId}
                                            onChange={(e) => updateEntry(i, "categoryId", e.target.value)}
                                            className="w-full px-3 py-2 bg-bg-sidebar border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Select...</option>
                                            {expenseCategories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                                            Amount (BDT) <span className="text-status-error">*</span>
                                        </label>
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={entry.amount}
                                            onChange={(e) => updateEntry(i, "amount", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 bg-bg-sidebar border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                                            Description (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={entry.description}
                                            onChange={(e) => updateEntry(i, "description", e.target.value)}
                                            placeholder="e.g. Office Rent"
                                            className="w-full px-3 py-2 bg-bg-sidebar border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="pt-6 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRow(i)}
                                        disabled={entries.length === 1}
                                        className={`p-2 rounded-md transition-colors ${entries.length === 1 ? 'text-border-subtle cursor-not-allowed' : 'text-text-muted hover:text-status-error hover:bg-status-error/10'}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-border-subtle bg-bg-sidebar shrink-0 flex justify-end gap-3 rounded-b-2xl">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={pending} className="px-6">
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={pending} className="px-6">
                        {pending ? <Loader2 size={16} className="animate-spin" /> : "Save Estimates"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

export default function EstimatesContent() {
    const toast = useToast();
    const [estimates, setEstimates] = useState<EstimateType[]>([]);
    const [categories, setCategories] = useState<FinanceCategoryWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState<EstimateType | null>(null);
    const [pendingAction, setPendingAction] = useState<number | null>(null);

    // Sorting state
    const [sortField, setSortField] = useState<keyof EstimateType>("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const loadData = useCallback(async () => {
        setLoading(true);
        const [estRes, catRes] = await Promise.all([
            getEstimates(),
            getCategories()
        ]);
        if (estRes.success && estRes.data) setEstimates(estRes.data as EstimateType[]);
        if (catRes.success && catRes.data) setCategories(catRes.data as FinanceCategoryWithCount[]);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSort = (field: keyof EstimateType) => {
        setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
        setSortField(field);
    };

    const sortedEstimates = [...estimates].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === "categoryId") {
            valA = a.category.name as any;
            valB = b.category.name as any;
        }

        if (valA !== null && valB !== null) {
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        }
        return 0;
    });

    const approveEstimate = async (id: number) => {
        if (!confirm("Are you sure you want to approve this budget? This will permanently log it as a transaction today.")) return;
        setPendingAction(id);
        const res = await updateEstimateStatus(id, "Approved");
        if (res.success) {
            toast.success("Estimate approved! Transaction logged.");
            loadData();
        } else {
            toast.error(res.error || "Failed to approve estimate");
        }
        setPendingAction(null);
    };

    const rejectEstimate = async (id: number) => {
        if (!confirm("Are you sure you want to reject this estimate?")) return;
        setPendingAction(id);
        const res = await updateEstimateStatus(id, "Rejected");
        if (res.success) {
            toast.success("Estimate rejected.");
            loadData();
        } else {
            toast.error(res.error || "Failed to reject estimate");
        }
        setPendingAction(null);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this estimate completely?")) return;
        setPendingAction(id);
        const res = await deleteEstimate(id);
        if (res.success) {
            toast.success("Estimate deleted.");
            loadData();
        } else {
            toast.error(res.error || "Failed to delete.");
        }
        setPendingAction(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
                        <FileText size={22} className="text-primary" /> Budget Estimates
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        Propose and approve upcoming month expenses before they happen.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                        <Plus size={16} /> Propose Budget
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border border-border-subtle bg-bg-app shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-bg-sidebar border-b border-border-subtle">
                            <tr>
                                <th className="text-left">
                                    <SortableHeader sortKey="date" label="Month" currentSort={sortField as string} currentOrder={sortOrder} onSort={handleSort as any} className="px-5 py-4 w-full text-text-muted text-[10px] uppercase tracking-wider justify-start" />
                                </th>
                                <th className="px-5 py-4 text-left font-bold text-text-muted text-[10px] uppercase tracking-wider">
                                    Description & Category
                                </th>
                                <th className="text-right">
                                    <SortableHeader sortKey="amount" label="Amount" currentSort={sortField as string} currentOrder={sortOrder} onSort={handleSort as any} className="px-5 py-4 w-full justify-end text-text-muted text-[10px] uppercase tracking-wider" />
                                </th>
                                <th className="text-center">
                                    <SortableHeader sortKey="status" label="Status" currentSort={sortField as string} currentOrder={sortOrder} onSort={handleSort as any} className="px-5 py-4 w-full justify-center text-text-muted text-[10px] uppercase tracking-wider" />
                                </th>
                                <th className="px-5 py-4 text-center font-bold text-text-muted text-[10px] uppercase tracking-wider w-36">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading && estimates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-text-muted">
                                        <Loader2 size={24} className="animate-spin mx-auto mb-3 opacity-50" />
                                        Loading estimates...
                                    </td>
                                </tr>
                            ) : sortedEstimates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center text-text-muted">
                                        <div className="w-16 h-16 bg-bg-sidebar rounded-full flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                                            <CalendarDays size={24} className="text-text-muted/60" />
                                        </div>
                                        <p className="font-medium text-text-main mb-1">No estimates proposed yet</p>
                                        <p className="text-xs">Propose a budget to track upcoming expenses.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedEstimates.map((estimate) => (
                                    <tr key={estimate.id} className="hover:bg-bg-sidebar/50 transition-colors group">
                                        <td className="px-5 py-4 whitespace-nowrap text-text-main font-semibold">
                                            {new Date(estimate.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-text-main flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 rounded-sm bg-status-error/10 text-status-error text-[10px] uppercase tracking-wider font-bold shrink-0">
                                                    Expense
                                                </span>
                                                {estimate.category.name}
                                            </div>
                                            <div className="text-xs text-text-muted mt-1 leading-relaxed">
                                                {estimate.description}
                                            </div>
                                            {estimate.notes && (
                                                <div className="text-[11px] text-text-muted mt-1.5 italic border-l-2 border-border-subtle pl-2">
                                                    "{estimate.notes}"
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right whitespace-nowrap">
                                            <div className="tabular-nums font-bold text-text-main">
                                                {BDT(estimate.amount)}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                                                ${estimate.status === 'Approved' ? 'bg-status-success/10 text-status-success' : 
                                                  estimate.status === 'Rejected' ? 'bg-status-error/10 text-status-error' : 
                                                  'bg-primary/10 text-primary'}`}>
                                                {estimate.status}
                                            </span>
                                            {estimate.transactionId && (
                                                <div className="text-[10px] text-text-muted mt-1 uppercase mt-1">
                                                    Logged TX
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                            {pendingAction === estimate.id ? (
                                                <Loader2 size={16} className="animate-spin mx-auto text-text-muted" />
                                            ) : estimate.status === "Pending" ? (
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => approveEstimate(estimate.id)}
                                                        className="p-1.5 text-status-success hover:bg-status-success/10 rounded-md transition-colors"
                                                        title="Approve & Convert to Transaction"
                                                    >
                                                        <Check size={16} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={() => rejectEstimate(estimate.id)}
                                                        className="p-1.5 text-status-error hover:bg-status-error/10 rounded-md transition-colors"
                                                        title="Reject Estimate"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {estimate.status === "Rejected" && (
                                                        <button
                                                            onClick={() => setEditingEstimate(estimate)}
                                                            className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                            title="Edit Rejected Budget"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(estimate.id)}
                                                        className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded-md transition-colors"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <ProposeEstimateModal
                    categories={categories}
                    onClose={() => setIsModalOpen(false)}
                    onSave={loadData}
                />
            )}

            {editingEstimate && (
                <EditEstimateModal
                    estimate={editingEstimate}
                    categories={categories}
                    onClose={() => setEditingEstimate(null)}
                    onSave={loadData}
                />
            )}
        </div>
    );
}
