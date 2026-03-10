"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/app/actions/finance";
import type { FinanceCategoryWithCount } from "@/app/actions/finance";
import {
    Plus, Pencil, Trash2, Tag, TrendingUp, TrendingDown,
    X, Check, Loader2, AlertCircle, FolderOpen
} from "lucide-react";

// ─── Modal ────────────────────────────────────────────────────────────────────

function CategoryModal({
    category,
    onClose,
    onSave,
}: {
    category: FinanceCategoryWithCount | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [name, setName] = useState(category?.name || "");
    const [type, setType] = useState<"Revenue" | "Expense">(
        (category?.type as "Revenue" | "Expense") || "Expense"
    );
    const [description, setDescription] = useState(category?.description || "");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError("Category name is required."); return; }
        setError("");
        startTransition(async () => {
            const res = category
                ? await updateCategory(category.id, { name: name.trim(), type, description: description.trim() || undefined })
                : await createCategory({ name: name.trim(), type, description: description.trim() || undefined });

            if (res.success) {
                toast.success(category ? "Category updated." : "Category created.");
                onSave();
                onClose();
            } else {
                setError(res.error || "Something went wrong.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-bg-sidebar rounded-2xl border border-border-subtle w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                    <h2 className="text-lg font-bold text-text-main">
                        {category ? "Edit Category" : "New Category"}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                            Type <span className="text-status-error">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {(["Revenue", "Expense"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${type === t
                                        ? t === "Revenue"
                                            ? "bg-status-success/15 border-status-success text-status-success"
                                            : "bg-status-error/15 border-status-error text-status-error"
                                        : "border-border-subtle text-text-muted hover:bg-bg-app"
                                        }`}
                                >
                                    {t === "Revenue" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                            Name <span className="text-status-error">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Employee Salary"
                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending} className="flex-1 flex items-center justify-center gap-2">
                            {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {category ? "Save Changes" : "Create"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteModal({
    category,
    onClose,
    onDeleted,
}: {
    category: FinanceCategoryWithCount;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteCategory(category.id);
            if (res.success) {
                toast.success("Category deleted.");
                onDeleted();
                onClose();
            } else {
                setError(res.error || "Failed to delete.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-bg-sidebar rounded-2xl border border-border-subtle w-full max-w-sm shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-status-error/15 flex items-center justify-center">
                        <Trash2 size={18} className="text-status-error" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-main">Delete Category</h2>
                        <p className="text-sm text-text-muted">{category.name}</p>
                    </div>
                </div>
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}
                {!error && (
                    <p className="text-sm text-text-muted">
                        Are you sure? This cannot be undone. Categories with existing transactions cannot be deleted.
                    </p>
                )}
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    {!error && (
                        <button
                            onClick={handleDelete}
                            disabled={pending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-status-error text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                            {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CategoriesContent() {
    const [categories, setCategories] = useState<FinanceCategoryWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<FinanceCategoryWithCount | null | "new">(null);
    const [deleteTarget, setDeleteTarget] = useState<FinanceCategoryWithCount | null>(null);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        const res = await getCategories();
        if (res.success && res.data) setCategories(res.data as FinanceCategoryWithCount[]);
        setLoading(false);
    }, []);

    useEffect(() => { loadCategories(); }, [loadCategories]);

    useEffect(() => { loadCategories(); }, [loadCategories]);

    const revenue = categories.filter((c) => c.type === "Revenue").sort((a, b) => a.name.localeCompare(b.name));
    const expenses = categories.filter((c) => c.type === "Expense").sort((a, b) => a.name.localeCompare(b.name));

    return (
        <>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
                        <Tag size={22} className="text-primary" /> Categories
                    </h1>
                    <p className="text-text-muted text-sm mt-1">Manage your income and expense categories (BDT)</p>
                </div>
                <Button onClick={() => setEditTarget("new")} className="flex items-center gap-2">
                    <Plus size={16} /> Add Category
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48 text-text-muted">
                    <Loader2 size={28} className="animate-spin" />
                </div>
            ) : categories.length === 0 ? (
                <Card className="p-12 text-center">
                    <FolderOpen size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
                    <h3 className="text-lg font-semibold text-text-main mb-2">No categories yet</h3>
                    <p className="text-text-muted max-w-sm mx-auto mb-4">
                        Create categories to classify your income and expenses.
                    </p>
                    <Button onClick={() => setEditTarget("new")} className="inline-flex items-center gap-2">
                        <Plus size={16} /> Add First Category
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Revenue */}
                    <Card className="p-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle bg-status-success/5">
                            <TrendingUp size={16} className="text-status-success" />
                            <h2 className="font-bold text-text-main text-sm uppercase tracking-wider">Revenue</h2>
                            <span className="ml-auto text-xs text-text-muted">{revenue.length} categories</span>
                        </div>
                        <div className="divide-y divide-border-subtle">
                            {revenue.length === 0 ? (
                                <p className="px-5 py-6 text-text-muted text-sm italic">No revenue categories yet.</p>
                            ) : revenue.map((cat) => (
                                <div key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-bg-app transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-text-main truncate">{cat.name}</p>
                                        {cat.description && (
                                            <p className="text-xs text-text-muted truncate">{cat.description}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-text-muted shrink-0">
                                        {cat._count.transactions} txn{cat._count.transactions !== 1 ? "s" : ""}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditTarget(cat)} className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setDeleteTarget(cat)} className="p-1.5 text-text-muted hover:text-status-error rounded-lg hover:bg-status-error/10 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Expenses */}
                    <Card className="p-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle bg-status-error/5">
                            <TrendingDown size={16} className="text-status-error" />
                            <h2 className="font-bold text-text-main text-sm uppercase tracking-wider">Expenses</h2>
                            <span className="ml-auto text-xs text-text-muted">{expenses.length} categories</span>
                        </div>
                        <div className="divide-y divide-border-subtle">
                            {expenses.length === 0 ? (
                                <p className="px-5 py-6 text-text-muted text-sm italic">No expense categories yet.</p>
                            ) : expenses.map((cat) => (
                                <div key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-bg-app transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-text-main truncate">{cat.name}</p>
                                        {cat.description && (
                                            <p className="text-xs text-text-muted truncate">{cat.description}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-text-muted shrink-0">
                                        {cat._count.transactions} txn{cat._count.transactions !== 1 ? "s" : ""}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditTarget(cat)} className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setDeleteTarget(cat)} className="p-1.5 text-text-muted hover:text-status-error rounded-lg hover:bg-status-error/10 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Modals */}
            {editTarget !== null && (
                <CategoryModal
                    category={editTarget === "new" ? null : editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={loadCategories}
                />
            )}
            {deleteTarget && (
                <DeleteModal
                    category={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={loadCategories}
                />
            )}
        </>
    );
}
