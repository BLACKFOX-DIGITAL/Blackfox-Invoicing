"use client";

import React, { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { CreditCard, Plus, Trash2, Banknote, Edit3 } from "lucide-react";
import { clsx } from "clsx";

import { PAYMENT_METHODS } from "@/lib/constants";

interface PaymentMethod {
    id: number;
    type: string;
    name: string;
    details: string;
}

interface PaymentSettingsProps {
    methods: PaymentMethod[];
    onAdd: (method: Omit<PaymentMethod, "id">) => void;
    onEdit: (method: PaymentMethod) => void;
    onDelete: (id: number) => void;
}

export default function PaymentSettings({ methods, onAdd, onEdit, onDelete }: PaymentSettingsProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newMethod, setNewMethod] = useState<{ type: string; name: string; details: string; }>({ type: PAYMENT_METHODS[0], name: "", details: "" });

    const handleSave = () => {
        if (!newMethod.name || !newMethod.details) return;

        if (editingId !== null) {
            onEdit({ ...newMethod, id: editingId });
            setEditingId(null);
        } else {
            onAdd(newMethod);
        }

        setIsAdding(false);
        setNewMethod({ type: PAYMENT_METHODS[0], name: "", details: "" });
    };

    const startEdit = (method: PaymentMethod) => {
        setNewMethod({ type: method.type, name: method.name, details: method.details });
        setEditingId(method.id);
        setIsAdding(true);
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewMethod({ type: PAYMENT_METHODS[0], name: "", details: "" });
    };

    return (
        <Card title="Payment Methods" className="p-6">
            <div className="space-y-4">
                {methods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 bg-bg-app rounded-xl border border-border-subtle group">
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                                method.type === "Bank Transfer" ? "bg-blue-100 text-blue-600" : "bg-indigo-100 text-indigo-600"
                            )}>
                                {method.type === "Bank Transfer" ? <Banknote size={20} /> : <CreditCard size={20} />}
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-main text-sm">{method.name}</h4>
                                <p className="text-xs text-text-muted whitespace-pre-line">{method.details}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => startEdit(method)}
                                className="p-2 text-text-muted hover:text-primary transition-colors"
                            >
                                <Edit3 size={16} />
                            </button>
                            <button
                                onClick={() => onDelete(method.id)}
                                className="p-2 text-text-muted hover:text-status-error transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {isAdding ? (
                    <div className="p-4 bg-bg-surface rounded-xl border border-dashed border-border-subtle animate-in fade-in zoom-in-95">
                        <h4 className="text-sm font-bold text-text-main mb-3">{editingId ? 'Edit Method' : 'Add New Method'}</h4>
                        <div className="grid gap-3">
                            <Select
                                label="Type"
                                value={newMethod.type}
                                onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value })}
                            >
                                {PAYMENT_METHODS.map(method => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </Select>

                            <Input
                                label="Label (e.g. Business Checking)"
                                value={newMethod.name}
                                onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                                placeholder="My Account"
                            />


                            <Textarea
                                label="Details (e.g. Account # / Email)"
                                value={newMethod.details}
                                onChange={(e) => setNewMethod({ ...newMethod, details: e.target.value })}
                                placeholder="Account details..."
                                rows={4}
                            />

                            <div className="flex gap-2 mt-2">
                                <Button size="sm" onClick={handleSave}>{editingId ? 'Update Method' : 'Add Method'}</Button>
                                <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setNewMethod({ type: PAYMENT_METHODS[0], name: "", details: "" });
                            setIsAdding(true);
                        }}
                        className="w-full py-3 border-2 border-dashed border-border-subtle rounded-xl flex items-center justify-center gap-2 text-text-muted hover:text-primary hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                    >
                        <Plus size={18} /> Add Payment Method
                    </button>
                )}
            </div>
        </Card>
    );
}
