import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { X, DollarSign, Plus, Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";

interface PayrollModalProps {
    record: any;
    onClose: () => void;
    onSave: (id: number, data: any) => Promise<void>;
    isSubmitting: boolean;
}

interface Item {
    id: string;
    name: string;
    amount: string;
}

export default function PayrollModal({ record, onClose, onSave, isSubmitting }: PayrollModalProps) {
    const [status, setStatus] = useState("Pending");
    const [additions, setAdditions] = useState<Item[]>([]);
    const [deductions, setDeductions] = useState<Item[]>([]);

    useEffect(() => {
        if (record) {
            setStatus(record.status || "Pending");
            
            // Initialize Additions
            if (record.additionsBreakdown && Array.isArray(record.additionsBreakdown) && record.additionsBreakdown.length > 0) {
                setAdditions(record.additionsBreakdown.map((item: any) => ({
                    id: Math.random().toString(36).substring(7),
                    name: item.name,
                    amount: item.amount.toString()
                })));
            } else if (record.additions > 0) {
                setAdditions([{ id: Math.random().toString(36).substring(7), name: "Other Additions", amount: record.additions.toString() }]);
            } else {
                setAdditions([]);
            }

            // Initialize Deductions
            if (record.deductionsBreakdown && Array.isArray(record.deductionsBreakdown) && record.deductionsBreakdown.length > 0) {
                setDeductions(record.deductionsBreakdown.map((item: any) => ({
                    id: Math.random().toString(36).substring(7),
                    name: item.name,
                    amount: item.amount.toString()
                })));
            } else if (record.deductions > 0) {
                setDeductions([{ id: Math.random().toString(36).substring(7), name: "Other Deductions", amount: record.deductions.toString() }]);
            } else {
                setDeductions([]);
            }
        }
    }, [record]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Compute totals and formats
        const additionsList = additions.filter(a => a.name.trim() !== "" || parseFloat(a.amount) > 0).map(a => ({
            name: a.name.trim() || "Additions",
            amount: parseFloat(a.amount) || 0
        }));
        const totalAdd = additionsList.reduce((sum, item) => sum + item.amount, 0);

        const deductionsList = deductions.filter(d => d.name.trim() !== "" || parseFloat(d.amount) > 0).map(d => ({
            name: d.name.trim() || "Deductions",
            amount: parseFloat(d.amount) || 0
        }));
        const totalDed = deductionsList.reduce((sum, item) => sum + item.amount, 0);

        onSave(record.id, {
            additionsBreakdown: additionsList,
            additions: totalAdd,
            deductionsBreakdown: deductionsList,
            deductions: totalDed,
            status,
        });
    };

    // Calculate dynamic net salary for display
    const gross = parseFloat(record.grossSalary) || 0;
    const currentAdd = additions.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const currentDed = deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const net = gross + currentAdd - currentDed;

    const addItem = (type: "add" | "ded") => {
        const newItem = { id: Math.random().toString(36).substring(7), name: "", amount: "" };
        if (type === "add") setAdditions([...additions, newItem]);
        else setDeductions([...deductions, newItem]);
    };

    const removeItem = (type: "add" | "ded", id: string) => {
        if (type === "add") setAdditions(additions.filter(a => a.id !== id));
        else setDeductions(deductions.filter(d => d.id !== id));
    };

    const updateItem = (type: "add" | "ded", id: string, field: "name" | "amount", value: string) => {
        if (type === "add") {
            setAdditions(additions.map(a => a.id === id ? { ...a, [field]: value } : a));
        } else {
            setDeductions(deductions.map(d => d.id === id ? { ...d, [field]: value } : d));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
            <div className="bg-bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border-subtle flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <DollarSign size={20} className="text-primary" /> Edit Payslip
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 min-h-0">
                    <div className="mb-6 p-4 rounded-xl bg-background/50 border border-border">
                        <div className="text-sm font-semibold text-text-main">{record.employee.firstName} {record.employee.lastName}</div>
                        <div className="text-xs text-text-muted mt-1">Monthly Gross Pay: ৳{(record.grossSalary || 0).toLocaleString()}</div>
                        {record.breakdown && Array.isArray(record.breakdown) && (
                            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/50">
                                {record.breakdown.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-card p-2 rounded-lg border border-border/50">
                                        <span className="text-[10px] text-text-muted uppercase tracking-wider">{item.name}</span>
                                        <span className="text-xs font-semibold text-text-main tabular-nums">৳{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <form id="payroll-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Additions List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-status-success">Additions (Bonus, etc.)</label>
                                <button type="button" onClick={() => addItem('add')} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded-lg font-medium">
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>
                            {additions.length === 0 ? (
                                <p className="text-xs text-text-muted italic bg-background/50 p-3 rounded-xl border border-border border-dashed text-center">No additions.</p>
                            ) : (
                                <div className="space-y-2">
                                    {additions.map((item) => (
                                        <div key={item.id} className="flex gap-2 items-center bg-background/30 p-2 rounded-xl border border-border">
                                            <Input 
                                                className="flex-1 !py-2 !text-sm" 
                                                placeholder="Description (e.g. Festival Bonus)" 
                                                value={item.name} 
                                                onChange={(e) => updateItem('add', item.id, 'name', e.target.value)} 
                                            />
                                            <div className="relative w-32 shrink-0">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">৳</span>
                                                <Input 
                                                    type="number" 
                                                    className="w-full !py-2 !pl-7 !text-sm" 
                                                    placeholder="0" 
                                                    value={item.amount} 
                                                    onChange={(e) => updateItem('add', item.id, 'amount', e.target.value)} 
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeItem('add', item.id)} className="p-2 text-status-error/70 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors shrink-0">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="text-right text-xs text-text-muted pt-1 px-1">
                                        Total Additions: <strong className="text-status-success">৳{currentAdd.toLocaleString()}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Deductions List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-status-error">Deductions (Taxes, Leave)</label>
                                <button type="button" onClick={() => addItem('ded')} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded-lg font-medium">
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>
                            {deductions.length === 0 ? (
                                <p className="text-xs text-text-muted italic bg-background/50 p-3 rounded-xl border border-border border-dashed text-center">No deductions.</p>
                            ) : (
                                <div className="space-y-2">
                                    {deductions.map((item) => (
                                        <div key={item.id} className="flex gap-2 items-center bg-background/30 p-2 rounded-xl border border-border">
                                            <Input 
                                                className="flex-1 !py-2 !text-sm" 
                                                placeholder="Description (e.g. Unpaid Leave)" 
                                                value={item.name} 
                                                onChange={(e) => updateItem('ded', item.id, 'name', e.target.value)} 
                                            />
                                            <div className="relative w-32 shrink-0">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">৳</span>
                                                <Input 
                                                    type="number" 
                                                    className="w-full !py-2 !pl-7 !text-sm" 
                                                    placeholder="0" 
                                                    value={item.amount} 
                                                    onChange={(e) => updateItem('ded', item.id, 'amount', e.target.value)} 
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeItem('ded', item.id)} className="p-2 text-status-error/70 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors shrink-0">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="text-right text-xs text-text-muted pt-1 px-1">
                                        Total Deductions: <strong className="text-status-error">৳{currentDed.toLocaleString()}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <label className="text-sm font-medium text-text-main">Payment Status</label>
                            <select
                                name="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex justify-between items-center">
                            <span className="text-sm font-semibold text-primary">Total Net Salary:</span>
                            <span className="text-lg font-bold text-primary tabular-nums">৳{net.toLocaleString()}</span>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-border bg-background/50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="payroll-form" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
