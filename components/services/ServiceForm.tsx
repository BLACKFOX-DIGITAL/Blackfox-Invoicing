"use client";

import { useForm } from "react-hook-form";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { X, Save } from "lucide-react";
import { getCurrencySymbol, sortCustomers } from "@/lib/format";

interface ServiceFormProps {
    service?: any;
    customers?: any[];
    settings?: any;
    onClose: () => void;
    onSave: (data: any) => void;
}

const inputClass = "bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm w-full placeholder:text-text-muted/50";
const labelClass = "block text-sm font-semibold text-text-main mb-1.5 ml-1";

export default function ServiceForm({ service, customers = [], settings, onClose, onSave }: ServiceFormProps) {
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: service || {
            name: "",
            description: "",
            rate: "",
            customerId: customers.length === 1 ? customers[0].id : ""
        }
    });

    const selectedCustomerId = watch("customerId");

    // Determine currency symbol
    const globalCurrency = settings?.currency || "USD";
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const currencyCode = selectedCustomer?.currency || globalCurrency;
    const currencySymbol = getCurrencySymbol(currencyCode);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border-subtle animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-border-subtle bg-bg-surface/30">
                    <div>
                        <h2 className="text-xl font-bold text-text-main">{service ? "Edit Service" : "New Service"}</h2>
                        <p className="text-sm text-text-muted">Configure service details and pricing</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main hover:bg-bg-surface-hover rounded-full transition-colors"><X size={20} /></button>
                </div>

                <form id="service-form" onSubmit={handleSubmit((data) => {
                    const customer = customers.find(c => c.id === data.customerId);
                    onSave({ ...data, customerName: customer ? customer.name : "Standard" });
                })} className="p-6 flex flex-col gap-5">

                    <Input
                        label="Service Name"
                        {...register("name", { required: "Name is required" })}
                        placeholder="e.g. High-End Retouching"
                        error={errors.name?.message as string}
                        required
                    />


                    <div className="grid grid-cols-1 gap-5">
                        <div>
                            <Input
                                label={`Price (${currencySymbol} ${currencyCode})`}
                                type="number"
                                step="0.01"
                                {...register("rate", { required: "Rate is required", min: 0, valueAsNumber: true })}
                                placeholder="0.00"
                                error={errors.rate?.message as string}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Select
                            label="Customer ID"
                            {...register("customerId", { required: "Customer ID is required" })}
                            containerClassName="relative"
                            required
                        >
                            <option value="">Select Customer ID...</option>
                            {sortCustomers(customers).map(c => (
                                <option key={c.id} value={c.id}>{c.id}</option>
                            ))}
                        </Select>
                        {errors.customerId && (
                            <p className="text-xs text-status-error mt-1 ml-1">{errors.customerId.message as string}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-subtle">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" form="service-form" className="flex items-center gap-2">
                            <Save size={16} /> Save Service
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
