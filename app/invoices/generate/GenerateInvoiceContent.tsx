"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { CheckSquare, Square, ArrowLeft } from "lucide-react";
import { Decimal } from "decimal.js";
import { getCurrencySymbol, formatCustomerDisplay, formatDate, sortCustomers } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createInvoice, peekNextInvoiceId } from "@/app/actions/invoices";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { COUNTRIES } from "@/lib/constants/countries";

interface WorkLog {
    id: number | string;
    service?: string | { id: string; name: string; rate: number };
    serviceName?: string;
    serviceId?: string;
    date: string;
    description?: string | null;
    quantity: number;
    rate: number | string;
    total: number | string;
    status: string;
    customerId?: string;
}

interface GenerateInvoiceContentProps {
    customers: any[];
    unbilledLogs: WorkLog[];
    services: any[];
    settings: any;
}

export default function GenerateInvoiceContent({ customers, unbilledLogs = [], services = [], settings }: GenerateInvoiceContentProps) {
    const router = useRouter();
    const toast = useToast();
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [customId, setCustomId] = useState("");
    const [nextInvoiceId, setNextInvoiceId] = useState("");
    const [dateRangeStart, setDateRangeStart] = useState("");
    const [dateRangeEnd, setDateRangeEnd] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [discountValue, setDiscountValue] = useState<string>("");
    const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
    const [selectedBillingProfile, setSelectedBillingProfile] = useState<string>("primary");
    const [step, setStep] = useState<1 | 2>(1);

    // Rate overrides mapping: { "Service Name": newRateNumber }
    const [rateOverrides, setRateOverrides] = useState<Record<string, number>>({});

    const getInitialDueDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
    };
    const [dueDate, setDueDate] = useState(getInitialDueDate());

    // Determine currency
    const globalCurrency = settings?.currency || "USD";
    const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
    const currencyCode = selectedCustomerData?.currency || globalCurrency;
    const currencySymbol = getCurrencySymbol(currencyCode);

    // Sync due date when customer changes
    useEffect(() => {
        async function fetchNextId() {
            try {
                const result = await peekNextInvoiceId();
                if (result.success && result.data) {
                    setNextInvoiceId(result.data);
                }
            } catch (err) { }
        }
        fetchNextId();
    }, []);

    useEffect(() => {
        if (!selectedCustomer) return;
        const customer = customers.find(c => c.id === selectedCustomer);
        let days = 14;
        if (customer?.paymentTerms) {
            days = customer.paymentTerms;
        } else if (settings?.defaultPaymentTerms) {
            const match = settings.defaultPaymentTerms.match(/\d+/);
            if (match) days = parseInt(match[0]);
        }
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDueDate(d.toISOString().split('T')[0]);
    }, [selectedCustomer, customers, settings]);

    // Filter logs by selected customer
    const availableLogs = selectedCustomer
        ? unbilledLogs.filter(log => {
            const logCustomerId = log.customerId || "";
            if (logCustomerId !== selectedCustomer || log.status !== "Unbilled") return false;
            if (dateRangeStart && new Date(log.date) < new Date(dateRangeStart)) return false;
            if (dateRangeEnd && new Date(log.date) > new Date(dateRangeEnd)) return false;
            return true;
        })
        : [];

    const handleToggleLog = (id: string) => {
        if (selectedLogs.includes(id)) {
            setSelectedLogs(selectedLogs.filter(logId => logId !== id));
        } else {
            setSelectedLogs([...selectedLogs, id]);
        }
    };

    const handleSelectAll = () => {
        if (selectedLogs.length === availableLogs.length) {
            setSelectedLogs([]);
        } else {
            setSelectedLogs(availableLogs.map(log => log.id.toString()));
        }
    };

    const calculateSubtotal = () => {
        return availableLogs
            .filter(log => selectedLogs.includes(log.id.toString()))
            .reduce((sum, log) => {
                const total = typeof log.total === 'string'
                    ? parseFloat(log.total.replace(/[^0-9.-]/g, ''))
                    : log.total;
                return sum.plus(new Decimal(total || 0));
            }, new Decimal(0));
    };

    const calculateTotal = () => {
        const selectedWorkLogs = availableLogs.filter(log => selectedLogs.includes(log.id.toString()));

        let baseSubtotal = new Decimal(0);
        selectedWorkLogs.forEach(log => {
            const sn = getServiceName(log);
            const overrideRate = rateOverrides[sn];
            const logRate = typeof log.rate === 'string' ? parseFloat(log.rate.replace(/[^0-9.-]/g, '')) : log.rate;
            const finalRate = overrideRate !== undefined ? overrideRate : logRate;

            baseSubtotal = baseSubtotal.plus(new Decimal(finalRate).times(Number(log.quantity)));
        });

        const subtotal = baseSubtotal;
        let discountAmount = new Decimal(0);
        const discountVal = parseFloat(discountValue) || 0;

        if (discountType === "fixed") {
            discountAmount = new Decimal(discountVal);
        } else {
            discountAmount = subtotal.times(discountVal).dividedBy(100);
        }

        const total = subtotal.minus(discountAmount);
        return {
            subtotal: subtotal.toFixed(2),
            discount: discountAmount.toFixed(2),
            total: total.toFixed(2)
        };
    };

    const handleServiceRateChange = (serviceName: string, newRate: string) => {
        const parsed = parseFloat(newRate);
        if (!isNaN(parsed) && parsed >= 0) {
            setRateOverrides(prev => ({ ...prev, [serviceName]: parsed }));
        } else if (newRate === "") {
            const next = { ...rateOverrides };
            delete next[serviceName];
            setRateOverrides(next);
        }
    };

    const getServiceName = (log: any) => {
        const service = services.find(s => s.id === log.serviceId || s.id?.toString() === log.serviceId?.toString());
        return service?.name || log.serviceName || "Service";
    };

    const handleSubmit = async () => {
        if (!selectedCustomer || selectedLogs.length === 0) return;
        setIsSubmitting(true);

        const customer = customers.find(c => c.id === selectedCustomer);

        // Determine billing profile info
        let finalClientName = customer?.name || "Unknown";
        let finalClientCompany = undefined;
        let finalClientAddress = customer ? [
            customer.address,
            [customer.city, customer.state, customer.zip].filter(Boolean).join(" "),
            customer.country ? (COUNTRIES.find(c => c.code === customer.country)?.name || customer.country) : undefined
        ].filter(Boolean).join("\n") : undefined;
        let finalClientTaxId = customer?.taxId || undefined;
        let finalClientEmail = undefined;
        let finalClientPhone = undefined;

        if (selectedBillingProfile !== "primary") {
            const profile = customer?.addresses?.find((a: any) => a.id === selectedBillingProfile);
            if (profile) {
                if (profile.companyName) finalClientCompany = profile.companyName;
                if (profile.address) finalClientAddress = profile.address;
                if (profile.taxId) finalClientTaxId = profile.taxId;
                if (profile.contactEmail) finalClientEmail = profile.contactEmail;
                if (profile.contactPhone) finalClientPhone = profile.contactPhone;
            }
        }

        const selectedWorkLogs = availableLogs.filter(log => selectedLogs.includes(log.id.toString()));
        const { subtotal, discount, total } = calculateTotal();

        // Pass rate overrides to the action so it knows to update underlying WorkLogs
        const finalWorkLogs = selectedWorkLogs.map(log => {
            const sn = getServiceName(log);
            const overrideRate = rateOverrides[sn];
            if (overrideRate !== undefined) {
                const newTotal = new Decimal(overrideRate).times(log.quantity).toNumber();
                return { ...log, rate: overrideRate, total: newTotal, isRateOverridden: true };
            }
            return log;
        }).sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
        });

        const result = await createInvoice({
            customerId: selectedCustomer,
            clientName: finalClientName,
            clientCompany: finalClientCompany,
            clientAddress: finalClientAddress,
            clientTaxId: finalClientTaxId,
            clientEmail: finalClientEmail,
            clientPhone: finalClientPhone,
            date: invoiceDate,
            dueDate,
            subtotal: parseFloat(subtotal),
            tax: 0,
            discount: parseFloat(discount),
            discountType,
            discountValue: parseFloat(discountValue) || 0,
            total: parseFloat(total),
            workLogIds: finalWorkLogs.map(log => typeof log.id === 'string' ? parseInt(log.id) : log.id),
            id: customId.trim() || undefined,
            items: finalWorkLogs.map(log => ({ // Map the overridden ones here
                serviceName: getServiceName(log),
                quantity: log.quantity,
                rate: typeof log.rate === 'string' ? parseFloat(log.rate) : log.rate,
                total: typeof log.total === 'string' ? parseFloat(log.total) : log.total,
                date: log.date,
                description: log.description || undefined
            })),
            rateOverrides // Pass down purely for tracking/updating the backend models
        });

        if (result.success && result.data?.id) {
            router.push(`/invoices/${result.data.id}`);
        } else {
            const errorMessage = !result.success ? result.error : "Unknown error";
            toast.error("Error creating invoice: " + errorMessage);
            setIsSubmitting(false);
        }
    };

    const inputClass = "bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm w-full color-scheme-dark placeholder:text-text-muted/50";
    const labelClass = "block text-sm font-semibold text-text-main mb-1.5 ml-1";

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-main">
                    <ArrowLeft size={16} /> Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Generate Invoice</h1>
                    <p className="text-text-muted mt-1">Select a customer and their unbilled work logs to create an invoice.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Invoice Settings */}
                <div className="lg:col-span-1 space-y-5">
                    <div className="bg-bg-card rounded-lg border border-border-subtle shadow-sm p-5 space-y-5">
                        <h2 className="text-base font-bold text-text-main">Invoice Settings</h2>

                        {/* Customer Select */}
                        <div>
                            <label className={labelClass}>Customer ID <span className="text-status-error">*</span></label>
                            <select
                                className={inputClass}
                                value={selectedCustomer}
                                onChange={(e) => {
                                    setSelectedCustomer(e.target.value);
                                    setSelectedLogs([]);
                                    setSelectedBillingProfile("primary"); // Reset billing profile on customer change
                                }}
                            >
                                <option value="">-- Select Customer ID --</option>
                                {sortCustomers(customers).map(c => (
                                    <option key={c.id} value={c.id}>{formatCustomerDisplay(c)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Billing Profile Selection */}
                        {selectedCustomer && selectedCustomerData?.addresses && selectedCustomerData.addresses.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className={labelClass}>Billing Profile</label>
                                <select
                                    className={inputClass}
                                    value={selectedBillingProfile}
                                    onChange={(e) => setSelectedBillingProfile(e.target.value)}
                                >
                                    <option value="primary">Primary ({selectedCustomerData.name})</option>
                                    {selectedCustomerData.addresses.map((addr: any) => (
                                        <option key={addr.id} value={addr.id}>
                                            {addr.companyName ? `${addr.companyName}` : `Address ID: ${addr.id.slice(0, 8)}`}
                                            {addr.companyName && addr.address ? ` - ${addr.address.split('\n')[0]}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Custom Invoice Number */}
                        {selectedCustomer && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                                <div>
                                    <label className={labelClass}>Invoice Number <span className="text-text-muted text-xs font-normal">(Optional)</span></label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={customId}
                                        onChange={(e) => setCustomId(e.target.value)}
                                        placeholder={nextInvoiceId ? `Auto-generated (Next: ${nextInvoiceId})` : `Auto-generated (e.g. ${new Date().getFullYear()}00001)`}
                                    />
                                    <p className="text-[10px] text-text-muted mt-1 ml-1">Leave empty to auto-generate.</p>
                                </div>

                                {/* Invoice Date + Due Date Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Invoice Date</label>
                                        <input
                                            type="date"
                                            className={inputClass}
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Due Date</label>
                                        <input
                                            type="date"
                                            className={inputClass}
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Due Date Presets */}
                                <div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[0, 15, 30, 45, 60].map((days) => {
                                            const label = days === 0 ? "Today" : `${days} Days`;
                                            const btnDate = new Date(invoiceDate || new Date());
                                            btnDate.setDate(btnDate.getDate() + days);
                                            const btnDateStr = btnDate.toISOString().split('T')[0];
                                            return (
                                                <button
                                                    key={days}
                                                    type="button"
                                                    onClick={() => {
                                                        const d = new Date(invoiceDate || new Date());
                                                        d.setDate(d.getDate() + days);
                                                        setDueDate(d.toISOString().split('T')[0]);
                                                    }}
                                                    className={cn(
                                                        "px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                                                        dueDate === btnDateStr
                                                            ? "bg-primary/10 border-primary text-primary"
                                                            : "bg-bg-app border-border-subtle text-text-muted hover:border-border hover:text-text-main"
                                                    )}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Date Range Filter */}
                                <div>
                                    <label className={labelClass}>Filter Logs by Date Range</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            className={cn(inputClass, "flex-1 min-w-0")}
                                            value={dateRangeStart}
                                            onChange={(e) => setDateRangeStart(e.target.value)}
                                        />
                                        <span className="text-text-muted text-sm shrink-0 font-medium text-center w-6">to</span>
                                        <input
                                            type="date"
                                            className={cn(inputClass, "flex-1 min-w-0")}
                                            value={dateRangeEnd}
                                            onChange={(e) => setDateRangeEnd(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Discount */}
                                <div>
                                    <label className={labelClass}>Discount</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={inputClass}
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex rounded-lg border border-border-subtle overflow-hidden bg-bg-surface h-[42px]">
                                            <button
                                                type="button"
                                                onClick={() => setDiscountType("fixed")}
                                                className={cn(
                                                    "px-3 text-sm font-medium transition-colors h-full flex items-center justify-center min-w-[3rem]",
                                                    discountType === "fixed" ? "bg-primary text-white" : "text-text-muted hover:bg-bg-surface-hover"
                                                )}
                                            >
                                                {currencySymbol}
                                            </button>
                                            <div className="w-[1px] bg-border-subtle"></div>
                                            <button
                                                type="button"
                                                onClick={() => setDiscountType("percentage")}
                                                className={cn(
                                                    "px-3 text-sm font-medium transition-colors h-full flex items-center justify-center min-w-[3rem]",
                                                    discountType === "percentage" ? "bg-primary text-white" : "text-text-muted hover:bg-bg-surface-hover"
                                                )}
                                            >
                                                %
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary Card */}
                    {selectedCustomer && (
                        <div className="bg-bg-card rounded-lg border border-border-subtle shadow-sm p-5 animate-in fade-in slide-in-from-left-2 duration-300">
                            <h2 className="text-base font-bold text-text-main mb-4">Invoice Summary</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-text-muted">Customer</span>
                                    <span className="font-mono font-medium text-text-main">{selectedCustomer}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-text-muted">Selected Items</span>
                                    <span className="font-medium text-text-main">{selectedLogs.length} of {availableLogs.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-text-muted">Currency</span>
                                    <span className="font-medium text-text-main">{currencyCode}</span>
                                </div>
                                <div className="border-t border-border-subtle pt-3 space-y-2">
                                    <div className="flex justify-between items-center text-text-muted">
                                        <span>Subtotal</span>
                                        <span>{currencySymbol}{calculateTotal().subtotal}</span>
                                    </div>

                                    <div className={cn("flex justify-between items-center", parseFloat(discountValue) > 0 ? "text-status-success" : "text-text-muted")}>
                                        <span>Discount {discountType === "percentage" && parseFloat(discountValue) > 0 ? `(${discountValue}%)` : ""}</span>
                                        <span>-{currencySymbol}{calculateTotal().discount}</span>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
                                        <span className="font-semibold text-text-main">Total</span>
                                        <span className="text-xl font-bold text-text-main">{currencySymbol}{calculateTotal().total} {currencyCode}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                {step === 1 ? (
                                    <>
                                        <Button
                                            variant="ghost"
                                            onClick={() => router.back()}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => setStep(2)}
                                            disabled={!selectedCustomer || selectedLogs.length === 0}
                                            className="flex-1 bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next Step ({selectedLogs.length})
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setStep(1)}
                                            className="flex-1"
                                            disabled={isSubmitting}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="flex-1 bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? "Creating..." : "Finalize Invoice"}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Main Content Area */}
                <div className="lg:col-span-2">
                    {step === 1 ? (
                        <div className="bg-bg-card rounded-lg border border-border-subtle shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-5 border-b border-border-subtle">
                                <h2 className="text-base font-bold text-text-main uppercase tracking-wider">Step 1: Unbilled Work Logs</h2>
                                {availableLogs.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSelectAll}
                                        className="h-auto py-1 px-3 text-xs font-medium"
                                    >
                                        {selectedLogs.length === availableLogs.length ? "Deselect All" : "Select All"}
                                    </Button>
                                )}
                            </div>

                            <div className="p-5 max-h-[70vh] overflow-y-auto">
                                {!selectedCustomer ? (
                                    <div className="py-16 text-center">
                                        <p className="text-text-muted text-lg">Select a customer to view their unbilled work logs.</p>
                                    </div>
                                ) : availableLogs.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <p className="text-text-muted text-lg">No unbilled work logs found for this customer.</p>
                                        <p className="text-text-muted text-sm mt-1">Try adjusting the date range filter or log some work first.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {availableLogs.map(log => {
                                            const isSelected = selectedLogs.includes(log.id.toString());
                                            const serviceName = getServiceName(log);

                                            const rate = typeof log.rate === 'string'
                                                ? parseFloat(log.rate.replace(/[^0-9.-]/g, ''))
                                                : log.rate;
                                            const total = typeof log.total === 'string'
                                                ? parseFloat(log.total.replace(/[^0-9.-]/g, ''))
                                                : log.total;

                                            return (
                                                <div
                                                    key={log.id}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-bg-surface-hover hover:border-border group text-sm",
                                                        isSelected ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20" : "bg-bg-app border-border-subtle"
                                                    )}
                                                    onClick={() => handleToggleLog(log.id.toString())}
                                                >
                                                    <div className={cn("text-text-muted transition-colors group-hover:text-primary", isSelected && "text-primary")}>
                                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                                        {/* Service & Date */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-text-main truncate">{serviceName}</span>
                                                                <span className="text-xs font-mono text-text-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border-subtle">{log.date}</span>
                                                            </div>
                                                            {log.description && (
                                                                <div className="text-xs text-text-muted truncate mt-0.5">{log.description}</div>
                                                            )}
                                                        </div>

                                                        {/* Numbers */}
                                                        <div className="flex items-center gap-4 text-xs md:text-sm whitespace-nowrap">
                                                            <div className="text-text-muted">
                                                                <span className="font-medium text-text-main">{log.quantity}</span> × {currencySymbol}{new Decimal(rate || 0).toFixed(2)}
                                                            </div>
                                                            <div className="font-mono font-bold text-text-main w-24 text-right">
                                                                {currencySymbol}{new Decimal(total || 0).toFixed(2)} {currencyCode}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-bg-card rounded-lg border border-border-subtle shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center p-5 border-b border-border-subtle bg-bg-surface">
                                <div>
                                    <h2 className="text-base font-bold text-text-main uppercase tracking-wider">Step 2: Review & Adjust Rates</h2>
                                    <p className="text-sm text-text-muted mt-1">Review your selected items and optionally apply bulk rate overrides per service type.</p>
                                </div>
                            </div>

                            <div className="p-5 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-6">
                                    {/* Group logs by service name */}
                                    {Object.entries(
                                        availableLogs
                                            .filter(log => selectedLogs.includes(log.id.toString()))
                                            .reduce((acc, log) => {
                                                const sn = getServiceName(log);
                                                if (!acc[sn]) acc[sn] = [];
                                                acc[sn].push(log);
                                                return acc;
                                            }, {} as Record<string, typeof availableLogs>)
                                    ).map(([serviceName, logs]) => {

                                        // Figure out standard rate or mark "Mixed" if rates differ
                                        const rates = logs.map(l => typeof l.rate === 'string' ? parseFloat(l.rate.replace(/[^0-9.-]/g, '')) : l.rate);
                                        const isMixed = new Set(rates).size > 1;
                                        const highestRate = Math.max(...rates);

                                        const overridesSet = rateOverrides[serviceName] !== undefined;
                                        const displayRate = overridesSet ? rateOverrides[serviceName] : (isMixed ? 'Mixed' : highestRate);

                                        const totalQty = logs.reduce((sum, l) => sum + Number(l.quantity || 0), 0);

                                        // Compute theoretical total for this group
                                        const groupTotal = overridesSet
                                            ? new Decimal(rateOverrides[serviceName]).times(totalQty).toNumber()
                                            : logs.reduce((sum, l) => {
                                                const lRate = typeof l.rate === 'string' ? parseFloat(l.rate.replace(/[^0-9.-]/g, '')) : l.rate;
                                                return sum + (lRate * Number(l.quantity));
                                            }, 0);

                                        return (
                                            <div key={serviceName} className="border border-border-subtle rounded-lg overflow-hidden flex flex-col">
                                                {/* Service Header */}
                                                <div className="bg-bg-surface-hover border-b border-border-subtle px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <h3 className="font-bold text-text-main">{serviceName}</h3>
                                                        <p className="text-xs text-text-muted">{logs.length} item(s) • {totalQty} qty total</p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-text-muted">Bulk Rate:</span>
                                                            <div className="relative">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">{currencySymbol}</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-24 pl-6 pr-2 py-1.5 text-sm bg-bg-app border border-border-subtle rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                                                                    placeholder={isMixed ? 'Mixed' : highestRate.toFixed(2)}
                                                                    value={rateOverrides[serviceName] ?? ""}
                                                                    onChange={(e) => handleServiceRateChange(serviceName, e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="w-[1px] h-6 bg-border-subtle"></div>
                                                        <div className="text-right w-24">
                                                            <span className="text-xs text-text-muted block">Group Total</span>
                                                            <span className={cn("font-bold font-mono", overridesSet ? "text-primary" : "text-text-main")}>
                                                                {currencySymbol}{Number(groupTotal).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Line Items Preview */}
                                                <div className="bg-bg-app divide-y divide-border-subtle">
                                                    {logs.map(log => {
                                                        const logRate = typeof log.rate === 'string' ? parseFloat(log.rate.replace(/[^0-9.-]/g, '')) : log.rate;
                                                        const finalItemRate = overridesSet ? rateOverrides[serviceName] : logRate;
                                                        const finalItemTotal = new Decimal(finalItemRate).times(Number(log.quantity)).toNumber();

                                                        return (
                                                            <div key={log.id} className="px-4 py-2 flex items-center justify-between text-sm opacity-80 hover:opacity-100 transition-opacity">
                                                                <div className="flex items-center gap-3 w-1/2">
                                                                    <span className="text-xs text-text-muted font-mono">{log.date}</span>
                                                                    <span className="text-text-main truncate" title={log.description || ""}>
                                                                        {log.description || <span className="text-text-muted italic">No description</span>}
                                                                    </span>
                                                                </div>
                                                                <div className="text-right font-mono flex items-center justify-end gap-3 w-1/2">
                                                                    <span className="text-text-muted">{log.quantity} × {currencySymbol}{Number(finalItemRate).toFixed(2)}</span>
                                                                    <span className={cn("w-20", overridesSet ? "text-primary font-medium" : "text-text-main")}>
                                                                        {currencySymbol}{Number(finalItemTotal).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
