"use client";

import { useFieldArray, useForm } from "react-hook-form";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Plus, Trash2, X, Check, Loader2, AlertCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { createBatchTransactions, FinanceCategoryWithCount } from "@/app/actions/finance";

interface TransactionEntry {
    date: string;
    categoryId: string;
    description: string;
    amount: string;
    notes: string;
}

interface BatchTransactionFormProps {
    onClose: () => void;
    onSave: () => void;
    categories: FinanceCategoryWithCount[];
}

export default function BatchTransactionForm({ onClose, onSave, categories }: BatchTransactionFormProps) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const { register, control, handleSubmit, watch } = useForm<{
        transactions: TransactionEntry[];
    }>({
        defaultValues: {
            transactions: [{
                date: new Date().toISOString().split('T')[0],
                categoryId: "",
                description: "",
                amount: "",
                notes: ""
            }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "transactions"
    });

    const handleBatchSubmit = async (data: { transactions: TransactionEntry[] }) => {
        // Validation
        for (let i = 0; i < data.transactions.length; i++) {
            const t = data.transactions[i];
            if (!t.date || !t.categoryId || !t.description || !t.amount || isNaN(Number(t.amount)) || Number(t.amount) <= 0) {
                setError(`Transaction #${i + 1} is missing required fields or has an invalid amount.`);
                return;
            }
        }
        setError("");

        startTransition(async () => {
            const processedTransactions = data.transactions.map(t => ({
                date: t.date,
                description: t.description.trim(),
                amount: Number(t.amount),
                categoryId: Number(t.categoryId),
                notes: t.notes.trim() || undefined,
            }));

            const res = await createBatchTransactions(processedTransactions);

            if (res.success) {
                toast.success(`Successfully added ${processedTransactions.length} transactions.`);
                onSave();
                onClose();
            } else {
                setError(res.error || "Something went wrong.");
            }
        });
    };

    const revenueCategories = categories.filter((c) => c.type === "Revenue");
    const expenseCategories = categories.filter((c) => c.type === "Expense");

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-sidebar rounded-2xl shadow-2xl w-full max-w-6xl border border-border-subtle flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-border-subtle bg-bg-sidebar sticky top-0 z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-text-main font-lora">Add Transactions</h2>
                        <p className="text-sm text-text-muted mt-1">Record one or multiple income/expense entries.</p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors p-2 hover:bg-bg-app rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleBatchSubmit)} className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-6 flex-1 overflow-y-auto space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex gap-4 font-bold text-[10px] text-text-muted uppercase tracking-widest px-2 mb-2">
                            <span className="w-[15%]">Date</span>
                            <span className="w-[20%]">Category</span>
                            <span className="w-[30%]">Description</span>
                            <span className="w-[15%]">Amount (BDT)</span>
                            <span className="w-[15%]">Notes</span>
                            <span className="w-[5%]"></span>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-3 items-start bg-bg-app/50 p-4 rounded-xl border border-border-subtle/50 hover:border-primary/30 transition-all group animate-in fade-in slide-in-from-left-2 duration-200 shadow-sm hover:shadow-md">
                                    <div className="w-[15%] min-w-0">
                                        <Input
                                            type="date"
                                            {...register(`transactions.${index}.date`)}
                                            className="px-2 py-2 h-10 border-border-subtle/40"
                                        />
                                    </div>
                                    <div className="w-[20%] min-w-0">
                                        <Select
                                            {...register(`transactions.${index}.categoryId`)}
                                            className="h-10 px-2 py-2 border-border-subtle/40"
                                        >
                                            <option value="">Category...</option>
                                            {revenueCategories.length > 0 && (
                                                <optgroup label="Revenue">
                                                    {revenueCategories.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {expenseCategories.length > 0 && (
                                                <optgroup label="Expenses">
                                                    {expenseCategories.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </Select>
                                    </div>
                                    <div className="w-[30%] min-w-0">
                                        <Input
                                            {...register(`transactions.${index}.description`)}
                                            placeholder="Description"
                                            className="h-10 px-3 py-2 border-border-subtle/40"
                                        />
                                    </div>
                                    <div className="w-[15%] min-w-0">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            startIcon={<span className="text-xs font-bold">৳</span>}
                                            {...register(`transactions.${index}.amount`)}
                                            placeholder="0.00"
                                            className="h-10 pl-8 pr-3 py-2 border-border-subtle/40"
                                        />
                                    </div>
                                    <div className="w-[15%] min-w-0">
                                        <Input
                                            {...register(`transactions.${index}.notes`)}
                                            placeholder="Notes"
                                            className="h-10 px-3 py-2 border-border-subtle/40"
                                        />
                                    </div>
                                    <div className="w-[5%] flex justify-center pt-0.5">
                                        {fields.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="p-2 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded-lg transition-all h-10 flex items-center justify-center w-full"
                                                title="Remove row"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => append({
                                date: new Date().toISOString().split('T')[0],
                                categoryId: "",
                                description: "",
                                amount: "",
                                notes: ""
                            })}
                            className="w-full mt-4 flex items-center justify-center gap-2 border-dashed border-2 hover:border-primary/50 py-3 bg-transparent"
                        >
                            <Plus size={16} /> Add Another Row
                        </Button>
                    </div>

                    <div className="p-6 border-t border-border-subtle bg-bg-sidebar sticky bottom-0 flex justify-between items-center rounded-b-2xl">
                        <div className="text-sm text-text-muted">
                            Total rows: <span className="font-bold text-text-main">{fields.length}</span>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={pending} className="min-w-[150px] flex items-center justify-center gap-2">
                                {pending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                Save
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
