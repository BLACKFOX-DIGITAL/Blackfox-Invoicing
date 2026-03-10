"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import { X, PartyPopper, AlertCircle, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { applyFestivalBonus } from "@/app/actions/hr";

interface PayrollRecord {
    id: number;
    grossSalary: number;
    additions: number;
    breakdown: { name: string; amount: number }[] | null;
    employee: {
        firstName: string;
        lastName?: string | null;
        designation?: string | null;
    };
}

interface FestivalBonusModalProps {
    records: PayrollRecord[];
    month: number;
    year: number;
    onClose: () => void;
    onApplied: () => void;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getBasicSalary(record: PayrollRecord): number {
    if (record.breakdown) {
        const basic = record.breakdown.find(c => c.name === "Basic Salary");
        if (basic) return Math.round(basic.amount);
    }
    // Fallback: 50% of gross
    return Math.round(record.grossSalary * 0.5);
}

export default function FestivalBonusModal({ records, month, year, onClose, onApplied }: FestivalBonusModalProps) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(records.map(r => r.id)));
    const [error, setError] = useState("");

    const allSelected = selectedIds.size === records.length;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map(r => r.id)));
        }
    };

    const toggleRow = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const totalBonus = records
        .filter(r => selectedIds.has(r.id))
        .reduce((sum, r) => sum + getBasicSalary(r), 0);

    const handleApply = () => {
        if (selectedIds.size === 0) { setError("Please select at least one employee."); return; }
        setError("");

        startTransition(async () => {
            const res = await applyFestivalBonus(Array.from(selectedIds));
            if (res.success) {
                toast.success(`Festival bonus applied to ${res.data?.count} employee${res.data?.count === 1 ? "" : "s"}!`);
                onApplied();
                onClose();
            } else {
                setError(res.error || "Something went wrong.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
            <div className="bg-bg-sidebar rounded-2xl border border-border-subtle w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: "min(80vh, 640px)" }}>

                <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                            <PartyPopper size={18} className="text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-text-main">Festival Bonus — {MONTHS[month - 1]} {year}</h2>
                            <p className="text-xs text-text-muted">Bonus = Basic Salary component per employee</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Info banner */}
                <div className="px-5 pt-3 pb-1 shrink-0">
                    <div className="p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-xs text-text-muted">
                        Uncheck any employee you want to <strong className="text-text-main">exclude</strong> from the festival bonus.
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="px-5 pt-2 shrink-0">
                        <div className="flex items-center gap-2 p-2.5 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-xs">
                            <AlertCircle size={14} /> {error}
                        </div>
                    </div>
                )}

                {/* Scrollable employee list */}
                <div className="overflow-y-auto flex-1 min-h-0 px-5 py-2">
                    {/* Select all row */}
                    <div
                        className="flex items-center justify-between py-2 px-3 mb-1.5 bg-bg-app rounded-lg border border-border-subtle/50 cursor-pointer select-none sticky top-0"
                        onClick={toggleAll}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${allSelected ? "bg-primary border-primary" : "border-border-subtle"}`}>
                                {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-xs font-bold text-text-main uppercase tracking-wider">Select All ({records.length})</span>
                        </div>
                        <span className="text-xs text-text-muted">{selectedIds.size} selected</span>
                    </div>

                    {/* Employee rows */}
                    <div className="space-y-1">
                        {records.map(record => {
                            const bonus = getBasicSalary(record);
                            const checked = selectedIds.has(record.id);
                            return (
                                <div
                                    key={record.id}
                                    onClick={() => toggleRow(record.id)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                                        checked
                                            ? "bg-primary/5 border-primary/20"
                                            : "border-transparent hover:bg-bg-app"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${checked ? "bg-primary border-primary" : "border-border-subtle"}`}>
                                            {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-text-main leading-tight">
                                                {record.employee.firstName} {record.employee.lastName || ""}
                                            </div>
                                            {record.employee.designation && (
                                                <div className="text-[11px] text-text-muted">{record.employee.designation}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold tabular-nums ${checked ? "text-yellow-500" : "text-text-muted line-through"}`}>
                                        +৳{bonus.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border-subtle bg-bg-app/50 rounded-b-2xl shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-text-muted">{selectedIds.size} of {records.length} employees</span>
                        <div className="text-right">
                            <div className="text-[10px] text-text-muted uppercase tracking-wider">Total Payout</div>
                            <div className="text-base font-bold text-yellow-500">৳{totalBonus.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button
                            type="button"
                            disabled={pending || selectedIds.size === 0}
                            onClick={handleApply}
                            className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 border-none text-black font-bold"
                        >
                            {pending ? <Loader2 size={15} className="animate-spin" /> : <PartyPopper size={15} />}
                            Apply to {selectedIds.size}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
