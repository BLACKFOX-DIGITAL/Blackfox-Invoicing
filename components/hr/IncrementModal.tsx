import { useState } from "react";
import Button from "@/components/ui/Button";
import { X, TrendingUp } from "lucide-react";
import Input from "@/components/ui/Input";
import { createSalaryIncrement } from "@/app/actions/hr";
import { useToast } from "@/components/ui/ToastProvider";

interface IncrementModalProps {
    employeeId: string;
    employeeName: string;
    onClose: () => void;
}

export default function IncrementModal({ employeeId, employeeName, onClose }: IncrementModalProps) {
    const [amount, setAmount] = useState("");
    const [month, setMonth] = useState(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2);
    const [year, setYear] = useState(new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('en', { month: 'long' }) }));
    const years = [new Date().getFullYear(), new Date().getFullYear() + 1];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await createSalaryIncrement({
            employeeId,
            amount: parseFloat(amount) || 0,
            effectiveMonth: month,
            effectiveYear: year
        });

        if (result.success) {
            toast.success(`Increment scheduled for ${employeeName}`);
            onClose();
        } else {
            toast.error(result.error || "Failed to schedule increment");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-xl border border-border-subtle flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary" /> Schedule Increment
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                        <p className="text-xs text-text-muted">Employee</p>
                        <p className="text-sm font-semibold text-text-main">{employeeName}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main">Increment Amount (Monthly)</label>
                        <Input
                            type="number"
                            required
                            autoFocus
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g. 2000"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main">Effective Month</label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main">Effective Year</label>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <p className="text-xs text-text-muted italic mt-2">
                        Note: This increment will be automatically added to the gross salary during the payroll generation of {months.find(m => m.value === month)?.label} {year}.
                    </p>

                    <div className="pt-6 flex justify-end gap-3">
                        <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || !amount}>
                            {isSubmitting ? "Scheduling..." : "Schedule"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
