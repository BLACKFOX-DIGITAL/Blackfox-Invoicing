"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { X, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

interface StatementModalProps {
    onClose: () => void;
    customerName: string;
}

export default function StatementModal({ onClose, customerName }: StatementModalProps) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const toast = useToast();

    const handleDownload = () => {
        // Mock download
        toast.success(`Statement for ${customerName} from ${startDate} to ${endDate} downloaded!`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-bg-card rounded-lg shadow-xl w-full max-w-md border border-border-subtle p-6 flex flex-col gap-6 scale-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b border-border-subtle pb-4">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        Generate Statement
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={20} /></button>
                </div>

                <div className="flex flex-col gap-4">
                    <p className="text-sm text-text-muted">
                        Select a date range to generate a statement of account for <strong className="text-text-main">{customerName}</strong>.
                    </p>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-muted">Start Date</label>
                        <input
                            type="date"
                            className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full color-scheme-dark"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-muted">End Date</label>
                        <input
                            type="date"
                            className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full color-scheme-dark"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleDownload}
                        disabled={!startDate || !endDate}
                        className="bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Download PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
