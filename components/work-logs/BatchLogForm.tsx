"use client";

import { useFieldArray, useForm } from "react-hook-form";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Plus, Trash2, X } from "lucide-react";
import { sortCustomers } from "@/lib/format";

interface LogEntry {
    date: string;
    serviceId: string;
    description: string;
    quantity: number;
}

interface BatchLogFormProps {
    onClose: () => void;
    onSubmit: (data: { batchCustomerId: string; logs: LogEntry[] }) => void;
    customers: any[];
    services: any[];
}

export default function BatchLogForm({ onClose, onSubmit, customers, services }: BatchLogFormProps) {
    const { register, control, handleSubmit, watch, setValue } = useForm<{
        batchCustomerId: string;
        logs: LogEntry[];
    }>({
        defaultValues: {
            batchCustomerId: customers.length === 1 ? customers[0].id : "",
            logs: [{ date: new Date().toISOString().split('T')[0], serviceId: "", description: "", quantity: 1 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "logs"
    });

    const selectedBatchCustomerId = watch("batchCustomerId");

    const handleBatchSubmit = (data: any) => {
        const processedData = {
            batchCustomerId: data.batchCustomerId,
            logs: data.logs.map((log: any) => ({
                ...log,
                customerId: data.batchCustomerId
            }))
        };
        onSubmit(processedData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-card rounded-xl shadow-2xl w-full max-w-6xl border border-border-subtle animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-surface/30">
                    <div>
                        <h2 className="text-lg font-bold text-text-main">Log Work</h2>
                        <p className="text-sm text-text-muted">Log multiple items for a single customer.</p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main hover:bg-bg-surface-hover rounded-full p-1 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleBatchSubmit)} className="p-6 flex flex-col gap-6">
                    <div>
                        <Select
                            label="Customer ID"
                            {...register("batchCustomerId", { required: true })}
                            containerClassName="max-w-md"
                        >
                            <option value="">Select Customer ID...</option>
                            {sortCustomers(customers).map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                        </Select>
                        {selectedBatchCustomerId && (
                            <p className="text-xs text-status-success mt-1.5 ml-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                                Logging work for <strong>{selectedBatchCustomerId}</strong>
                            </p>
                        )}
                    </div>

                    <div className="border-t border-border-subtle"></div>

                    <div className="flex gap-4 font-medium text-sm text-text-muted px-1">
                        <span className="w-2/12">Date</span>
                        <span className="w-3/12">Service</span>
                        <span className="w-4/12">Description</span>
                        <span className="w-2/12">Qty</span>
                        <span className="w-1/12"></span>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-4 items-start bg-bg-app p-2 rounded-lg border border-border-subtle/50">
                                <div className="w-2/12 min-w-0">
                                    <Input
                                        type="date"
                                        {...register(`logs.${index}.date`)}
                                    />
                                </div>
                                <div className="w-3/12 min-w-0">
                                    <Select {...register(`logs.${index}.serviceId`)}>
                                        <option value="">Select Service</option>
                                        {services
                                            .filter(s => !s.customerId || s.customerId === selectedBatchCustomerId)
                                            .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                        }
                                    </Select>
                                </div>
                                <div className="w-4/12 min-w-0">
                                    <Input
                                        {...register(`logs.${index}.description`)}
                                        placeholder="Add note..."
                                    />
                                </div>
                                <div className="w-2/12 min-w-0">
                                    <Input
                                        type="number"
                                        step="1"
                                        min="1"
                                        {...register(`logs.${index}.quantity`, { valueAsNumber: true })}
                                        placeholder="1"
                                    />
                                </div>
                                <div className="w-1/12 flex justify-center min-w-0">
                                    <button type="button" onClick={() => remove(index)} className="p-2.5 mt-0.5 text-text-muted hover:text-status-error hover:bg-red-50 rounded-md transition-colors flex items-center justify-center h-[42px] w-full">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => append({ date: new Date().toISOString().split('T')[0], serviceId: "", description: "", quantity: 1 })}
                            disabled={!selectedBatchCustomerId}
                            className={!selectedBatchCustomerId ? "opacity-50 cursor-not-allowed" : ""}
                        >
                            <Plus size={16} /> Add Log Entry
                        </Button>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={!selectedBatchCustomerId}>
                                Submit Batch ({fields.length})
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
