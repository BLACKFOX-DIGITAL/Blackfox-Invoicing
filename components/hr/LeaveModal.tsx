import { useState } from "react";
import Button from "@/components/ui/Button";
import { X, CalendarDays, AlignLeft } from "lucide-react";
import Input from "@/components/ui/Input";

interface LeaveModalProps {
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    isSubmitting: boolean;
    employees?: any[];
}

export default function LeaveModal({ onClose, onSave, isSubmitting, employees }: LeaveModalProps) {
    const [formData, setFormData] = useState({
        employeeId: "",
        type: "Annual",
        startDate: "",
        endDate: "",
        reason: "",
        isPaid: true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-xl border border-border-subtle flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <CalendarDays size={20} className="text-primary" /> Request Leave
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <form id="leave-form" onSubmit={handleSubmit} className="space-y-4">
                        {employees && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-main font-bold uppercase tracking-tight text-[11px]">Select Employee</label>
                                <select
                                    required
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                >
                                    <option value="">Choose an employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex items-center gap-6 p-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="isPaid"
                                    checked={formData.isPaid === true}
                                    onChange={() => setFormData({ ...formData, isPaid: true })}
                                    className="w-4 h-4 text-primary border-border focus:ring-primary/50"
                                />
                                <span className="text-sm font-medium text-text-main group-hover:text-primary transition-colors">Paid Leave</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="isPaid"
                                    checked={formData.isPaid === false}
                                    onChange={() => setFormData({ ...formData, isPaid: false })}
                                    className="w-4 h-4 text-primary border-border focus:ring-primary/50"
                                />
                                <span className="text-sm font-medium text-text-main group-hover:text-primary transition-colors">Unpaid Leave</span>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main font-bold uppercase tracking-tight text-[11px]">Leave Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({
                                        ...formData,
                                        type: val,
                                        isPaid: val === "Unpaid" ? false : formData.isPaid
                                    });
                                }}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                            >
                                <option value="Annual">Annual Leave</option>
                                <option value="Sick">Sick Leave</option>
                                <option value="Casual">Casual Leave</option>
                                <option value="Unpaid">Other Unpaid</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-main">Start Date</label>
                                <Input required type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-main">End Date</label>
                                <Input required type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-medium text-text-main flex items-center gap-2">
                                <AlignLeft size={16} /> Reason
                            </label>
                            <textarea
                                required
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                placeholder="Please briefly explain why you need this leave..."
                            />
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-border bg-background/50 rounded-b-2xl flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="leave-form" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
