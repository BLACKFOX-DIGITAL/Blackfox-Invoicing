"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { X, Plus, Trash2 } from "lucide-react";
import { updateInvoiceDetails } from "@/app/actions/invoices";
import { Decimal } from "decimal.js";
import { useToast } from "@/components/ui/ToastProvider";

interface InvoiceItem {
    id?: string;
    serviceName: string;
    description?: string;
    quantity: number;
    rate: number;
    total: number;
    date?: string;
}

interface EditInvoiceModalProps {
    invoice: any;
    onClose: () => void;
    onUpdate: () => void;
}

export default function EditInvoiceModal({ invoice, onClose, onUpdate }: EditInvoiceModalProps) {
    const [date, setDate] = useState(invoice.date || "");
    const [dueDate, setDueDate] = useState(invoice.dueDate || "");
    const [items, setItems] = useState<InvoiceItem[]>(invoice.items.map((item: any) => ({
        id: item.id,
        serviceName: item.serviceName,
        description: item.description || "",
        quantity: typeof item.quantity === 'object' ? Number(item.quantity) : item.quantity,
        rate: typeof item.rate === 'object' ? Number(item.rate) : item.rate,
        total: typeof item.total === 'object' ? Number(item.total) : item.total,
        date: item.date || ""
    })));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // Recalculate total if qty or rate changes
        if (field === 'quantity' || field === 'rate') {
            const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
            const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
            item.total = parseFloat((qty * rate).toFixed(2));
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([
            ...items,
            {
                serviceName: "",
                description: "",
                quantity: 1,
                rate: 0,
                total: 0
            }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        return {
            subtotal,
            total: subtotal // Assuming no tax for now in edit mode logic simplicity
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const { subtotal, total } = calculateTotals();

        try {
            const result = await updateInvoiceDetails({
                id: invoice.id,
                date,
                dueDate,
                subtotal,
                total,
                items: items.map(item => ({
                    serviceName: item.serviceName,
                    description: item.description,
                    quantity: Number(item.quantity),
                    rate: Number(item.rate),
                    total: Number(item.total),
                    date: item.date || undefined
                }))
            });

            if (result.success) {
                onUpdate();
                onClose();
            } else {
                toast.error("Failed to update invoice: " + result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while updating the invoice.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const { total } = calculateTotals();

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-card rounded-lg shadow-xl w-full max-w-4xl border border-border-subtle max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-surface rounded-t-lg">
                    <h2 className="text-xl font-bold text-text-main">Edit Invoice {invoice.id}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-text-muted mb-1 block">Invoice Date</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-muted mb-1 block">Due Date</label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border border-border-subtle rounded-md overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-bg-surface border-b border-border-subtle text-text-muted">
                                    <tr>
                                        <th className="p-3 w-[30%]">Service</th>
                                        <th className="p-3 w-[25%]">Description</th>
                                        <th className="p-3 w-[10%] text-center">Qty</th>
                                        <th className="p-3 w-[15%] text-right">Rate</th>
                                        <th className="p-3 w-[15%] text-right">Total</th>
                                        <th className="p-3 w-[5%]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {items.map((item, index) => (
                                        <tr key={index} className="group hover:bg-bg-surface/50">
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.serviceName}
                                                    onChange={(e) => handleItemChange(index, "serviceName", e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-1 text-text-main placeholder:text-text-muted/50"
                                                    placeholder="Service Name"
                                                    required
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-1 text-text-muted placeholder:text-text-muted/50"
                                                    placeholder="Description"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-1 text-center text-text-main"
                                                    required
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-1 text-right text-text-main"
                                                    required
                                                />
                                            </td>
                                            <td className="p-2 text-right font-medium text-text-main">
                                                {new Decimal(item.total || 0).toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="text-text-muted hover:text-status-error opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 bg-bg-surface border-t border-border-subtle">
                                <Button type="button" variant="ghost" onClick={handleAddItem} className="text-xs flex items-center gap-1">
                                    <Plus size={14} /> Add Line Item
                                </Button>
                            </div>
                        </div>

                    </div>

                    <div className="p-4 border-t border-border-subtle bg-bg-surface rounded-b-lg flex justify-between items-center">
                        <div className="text-lg">
                            <span className="text-text-muted mr-2">New Total:</span>
                            <strong className="text-text-main">{new Decimal(total || 0).toFixed(2)}</strong>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || items.length === 0}
                                className="bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
                            >
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
