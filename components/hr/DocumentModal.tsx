import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { X, FolderOpen, FileText } from "lucide-react";
import Input from "@/components/ui/Input";

interface DocumentModalProps {
    employees: { id: string, firstName: string, lastName: string }[];
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    isSubmitting: boolean;
}

export default function DocumentModal({ employees, onClose, onSave, isSubmitting }: DocumentModalProps) {
    const [formData, setFormData] = useState({
        employeeId: employees.length > 0 ? employees[0].id : "",
        title: "",
        fileUrl: "",
        type: "Contract",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                        <FolderOpen size={20} className="text-primary" /> Add Document
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <form id="doc-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main">Employee</label>
                            <select
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                                required
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main">Document Title</label>
                            <Input required name="title" value={formData.title} onChange={handleChange} placeholder="Employment Contract 2024" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main">Document Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                                <option value="Contract">Contract</option>
                                <option value="Policy">Policy</option>
                                <option value="Request Form">Request Form</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-main">File URL (Google Drive, Dropbox, etc.)</label>
                            <Input required type="url" name="fileUrl" value={formData.fileUrl} onChange={handleChange} placeholder="https://..." />
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-border bg-background/50 rounded-b-2xl flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="doc-form" disabled={isSubmitting || employees.length === 0}>
                        {isSubmitting ? "Uploading..." : "Add Document"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
