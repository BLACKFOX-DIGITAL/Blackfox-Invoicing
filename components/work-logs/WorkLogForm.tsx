"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { X } from "lucide-react";

import { useRole } from "@/lib/roleContext";
import { formatCustomerDisplay, sortCustomers } from "@/lib/format";

const workLogSchema = z.object({
    customerId: z.string().min(1, "Customer is required"),
    date: z.string().min(1, "Date is required"),
    serviceId: z.string().min(1, "Service is required"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    rate: z.number().min(0, "Rate must be positive"),
    description: z.string().optional(),
    status: z.enum(["Unbilled", "Billed"]),
});

interface WorkLogFormProps {
    defaultValues?: any;
    customers?: any[];
    services?: any[];
    onSubmit: (data: any) => void;
    onClose: () => void;
}

export default function WorkLogForm({ defaultValues, customers = [], services = [], onSubmit, onClose }: WorkLogFormProps) {
    const { role, company } = useRole();
    const isWorker = role === "Worker" || role === "Member";
    const hideFinancials = role === "Worker" || role === "VendorWorker" || role === "VendorManager" || company === "frameit";

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(workLogSchema),
        defaultValues: defaultValues || {
            customerId: "",
            date: new Date().toISOString().split('T')[0],
            serviceId: "",
            quantity: 1,
            rate: 0,
            description: "",
            status: "Unbilled",
        },
    });

    const selectedServiceId = watch("serviceId");
    const quantity = watch("quantity");
    const rate = watch("rate");
    const total = (parseFloat((quantity || 0).toString()) * parseFloat((rate || 0).toString())).toFixed(2);

    // Auto-fill rate when service changes
    useEffect(() => {
        if (selectedServiceId) {
            const service = services.find(s => s.id?.toString() === selectedServiceId);
            if (service) {
                setValue("rate", service.rate);
            }
        }
    }, [selectedServiceId, setValue, services]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-card rounded-lg shadow-xl w-full max-w-lg border border-border-subtle animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-border-subtle">
                    <h2 className="text-lg font-bold text-text-main">
                        {defaultValues ? "Edit Work Log" : "Log Work"}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
                    <Select
                        label="Customer"
                        {...register("customerId")}
                        error={errors.customerId?.message as string}
                        required
                    >
                        <option value="">Select Customer...</option>
                        {sortCustomers(customers).map(c => (
                            <option key={c.id} value={c.id}>{formatCustomerDisplay(c)}</option>
                        ))}
                    </Select>

                    <Input
                        label="Date"
                        type="date"
                        {...register("date")}
                        error={errors.date?.message as string}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Service"
                            {...register("serviceId")}
                            error={errors.serviceId?.message as string}
                            required
                        >
                            <option value="">Select Service...</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
                            ))}
                        </Select>

                        <Input
                            label="Quantity"
                            type="number"
                            step="0.01"
                            {...register("quantity", { valueAsNumber: true })}
                            error={errors.quantity?.message as string}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {!hideFinancials && (
                            <div className="flex flex-col gap-1">
                                <Input
                                    label="Rate"
                                    type="number"
                                    step="0.001"
                                    {...register("rate", { valueAsNumber: true })}
                                    error={errors.rate?.message as string}
                                    required
                                />
                                <span className="text-[10px] text-text-muted mt-[-4px]">Edit to set a custom rate</span>
                            </div>
                        )}

                        {!hideFinancials && (
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Total</label>
                                <div className="px-3 py-2.5 bg-bg-app rounded-lg border border-border-subtle text-sm font-mono text-text-main flex items-center h-[42px]">
                                    ৳{total}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                        <textarea
                            {...register("description")}
                            className="bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm w-full placeholder:text-text-muted/50"
                            placeholder="Details about the work..."
                            rows={3}
                        />
                    </div>


                    <div className="flex justify-end gap-3 mt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Log</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
