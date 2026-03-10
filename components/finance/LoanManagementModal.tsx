"use client";

import { useState, useEffect, useTransition } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { X, Check, Loader2, AlertCircle, Landmark } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    designation: string | null;
}

interface LoanManagementModalProps {
    onClose: () => void;
    onSave: () => void;
    getEmployees: () => Promise<{ success: boolean; data?: any; error?: string }>;
    recordDisbursement: (data: { employeeId: string; amount: number; date: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
    recordRepayment: (data: { employeeId: string; amount: number; date: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
}

export default function LoanManagementModal({
    onClose,
    onSave,
    getEmployees,
    recordDisbursement,
    recordRepayment
}: LoanManagementModalProps) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);

    // Form state
    const [mode, setMode] = useState<"disbursement" | "repayment">("disbursement");
    const [employeeId, setEmployeeId] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchEmployees() {
            setLoadingEmployees(true);
            const res = await getEmployees();
            if (res.success && res.data) {
                setEmployees(res.data as Employee[]);
            }
            setLoadingEmployees(false);
        }
        fetchEmployees();
    }, [getEmployees]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!employeeId) { setError("Please select an employee."); return; }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
        if (!date) { setError("Please select a date."); return; }

        startTransition(async () => {
            const data = {
                employeeId,
                amount: Number(amount),
                date,
                notes: notes.trim()
            };

            const res = mode === "disbursement"
                ? await recordDisbursement(data)
                : await recordRepayment(data);

            if (res.success) {
                toast.success(mode === "disbursement" ? "Loan disbursement recorded." : "Loan repayment recorded.");
                onSave();
                onClose();
            } else {
                setError(res.error || "Something went wrong.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-bg-sidebar rounded-2xl border border-border-subtle w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Landmark size={20} className="text-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-text-main">
                            Loan Management
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex bg-bg-app p-1 rounded-xl border border-border-subtle/50">
                        <button
                            type="button"
                            onClick={() => setMode("disbursement")}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === "disbursement"
                                ? "bg-bg-sidebar text-primary shadow-sm border border-border-subtle/30"
                                : "text-text-muted hover:text-text-main"
                                }`}
                        >
                            Disbursement (-)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("repayment")}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === "repayment"
                                ? "bg-bg-sidebar text-status-success shadow-sm border border-border-subtle/30"
                                : "text-text-muted hover:text-text-main"
                                }`}
                        >
                            Repayment (+)
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Employee</label>
                            <Select
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                disabled={loadingEmployees}
                                className="h-10"
                            >
                                <option value="">Select Employee...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} {emp.designation ? `(${emp.designation})` : ""}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Amount (BDT)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="h-10"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Date</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="h-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="E.g. Monthly installment 1 of 6"
                                className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button type="submit" disabled={pending} className={`flex-1 flex items-center justify-center gap-2 ${mode === "disbursement" ? "" : "bg-status-success hover:bg-green-600 border-none"
                            }`}>
                            {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {mode === "disbursement" ? "Record Loan" : "Record Repayment"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
