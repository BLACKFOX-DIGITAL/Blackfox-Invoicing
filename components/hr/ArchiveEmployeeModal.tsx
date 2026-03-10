"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { X, Archive, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { archiveEmployee } from "@/app/actions/hr";

interface ArchiveEmployeeModalProps {
    employee: { id: string; firstName: string; lastName?: string | null };
    onClose: () => void;
    onArchived: () => void;
}

export default function ArchiveEmployeeModal({ employee, onClose, onArchived }: ArchiveEmployeeModalProps) {
    const toast = useToast();
    const [pending, startTransition] = useTransition();
    const [exitDate, setExitDate] = useState(new Date().toISOString().split("T")[0]);
    const [exitReason, setExitReason] = useState("Resigned");
    const [exitNotes, setExitNotes] = useState("");
    const [error, setError] = useState("");

    const fullName = `${employee.firstName}${employee.lastName ? " " + employee.lastName : ""}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!exitDate) { setError("Please set the exit date."); return; }

        startTransition(async () => {
            const res = await archiveEmployee(employee.id, { exitDate, exitReason, exitNotes });
            if (res.success) {
                toast.success(`${fullName} has been archived.`);
                onArchived();
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
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-status-warning/10 rounded-lg">
                            <Archive size={20} className="text-status-warning" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-text-main">Archive Employee</h2>
                            <p className="text-xs text-text-muted">{fullName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-bg-app rounded-xl border border-border-subtle/50 text-sm text-text-muted">
                        This employee will be archived. All their payroll history, leave records, and documents will be preserved and accessible from the <strong className="text-text-main">Archived</strong> tab.
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Reason for Leaving</label>
                        <Select value={exitReason} onChange={(e) => setExitReason(e.target.value)} className="h-10">
                            <option value="Resigned">Resigned</option>
                            <option value="Terminated">Terminated</option>
                            <option value="Retired">Retired</option>
                            <option value="Contract Ended">Contract Ended</option>
                            <option value="Other">Other</option>
                        </Select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Exit Date</label>
                        <Input
                            type="date"
                            value={exitDate}
                            onChange={(e) => setExitDate(e.target.value)}
                            className="h-10"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Notes (Optional)</label>
                        <textarea
                            value={exitNotes}
                            onChange={(e) => setExitNotes(e.target.value)}
                            rows={2}
                            placeholder="Any additional notes about the departure..."
                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button
                            type="submit"
                            disabled={pending}
                            className="flex-1 flex items-center justify-center gap-2 bg-status-warning/90 hover:bg-status-warning border-none text-white"
                        >
                            {pending ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                            Archive Employee
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
