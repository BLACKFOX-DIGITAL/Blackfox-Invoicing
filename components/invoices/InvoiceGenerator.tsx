"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { X, CheckSquare, Square } from "lucide-react";
import { Decimal } from "decimal.js";
import { getCurrencySymbol, formatCustomerDisplay, sortCustomers } from "@/lib/format";
import { cn } from "@/lib/utils";

interface WorkLog {
    id: number | string;
    service?: string | { name: string };
    serviceName?: string;
    customerId?: string;
    date: string;
    description?: string;
    quantity: number;
    rate: number | string;
    total: number | string;
    status: string;
}

interface InvoiceGeneratorProps {
    onClose: () => void;
    onCreate: (data: { customerId: string; logIds: string[]; subtotal: number; total: number; dueDate?: string; invoiceDate: string; customId?: string }) => void;
    customers: any[];
    workLogs?: WorkLog[];
    settings?: any;
}

export default function InvoiceGenerator({ onClose, onCreate, customers, workLogs = [], settings }: InvoiceGeneratorProps) {
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [customId, setCustomId] = useState(""); // Optional custom invoice ID

    const [dateRangeStart, setDateRangeStart] = useState("");
    const [dateRangeEnd, setDateRangeEnd] = useState("");

    // Default due date: 14 days from now
    const getInitialDueDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
    };
    const [dueDate, setDueDate] = useState(getInitialDueDate());

    // Determine currency symbol
    const globalCurrency = settings?.currency || "USD";
    const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
    const currencyCode = selectedCustomerData?.currency || globalCurrency;
    const currencySymbol = getCurrencySymbol(currencyCode);

    // Sync due date when customer changes
    useEffect(() => {
        if (!selectedCustomer) return;

        const customer = customers.find(c => c.id === selectedCustomer);
        let days = 14; // Default fallback

        if (customer?.paymentTerms) {
            days = customer.paymentTerms;
        } else if (settings?.defaultPaymentTerms) {
            // Try to parse "Net 30" style string
            const match = settings.defaultPaymentTerms.match(/\d+/);
            if (match) {
                days = parseInt(match[0]);
            }
        }

        const d = new Date();
        d.setDate(d.getDate() + days);
        setDueDate(d.toISOString().split('T')[0]);
    }, [selectedCustomer, customers, settings]);

    // Filter logs by selected customer that are unbilled
    const availableLogs = selectedCustomer
        ? workLogs.filter(log => {
            // Handle both work log formats
            const logCustomerId = log.customerId || "";
            if (logCustomerId !== selectedCustomer || log.status !== "Unbilled") return false;

            // Date Range Filtering
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

    const calculateTotal = () => {
        return availableLogs
            .filter(log => selectedLogs.includes(log.id.toString()))
            .reduce((sum, log) => {
                const total = typeof log.total === 'string'
                    ? parseFloat(log.total.replace(/[^0-9.-]/g, ''))
                    : log.total;
                return sum.plus(new Decimal(total || 0));
            }, new Decimal(0))
            .toFixed(2);
    };

    const handleSubmit = () => {
        const subtotal = parseFloat(calculateTotal());
        onCreate({
            customerId: selectedCustomer,
            logIds: selectedLogs,
            subtotal,
            total: subtotal,
            dueDate,
            invoiceDate,
            customId: customId.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-card rounded-lg shadow-xl w-full max-w-2xl border border-border-subtle max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-border-subtle">
                    <h2 className="text-xl font-bold text-text-main">Generate Invoice</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-muted">Select Customer</label>
                        <select
                            className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full"
                            value={selectedCustomer}
                            onChange={(e) => {
                                setSelectedCustomer(e.target.value);
                                setSelectedLogs([]);
                            }}
                        >
                            <option value="">-- Choose Customer --</option>
                            {sortCustomers(customers).map(c => (
                                <option key={c.id} value={c.id}>{formatCustomerDisplay(c)}</option>
                            ))}
                        </select>
                    </div>

                    {selectedCustomer && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-muted">Invoice Number (Optional)</label>
                                <input
                                    type="text"
                                    className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full color-scheme-dark placeholder:text-text-muted/50"
                                    value={customId}
                                    onChange={(e) => setCustomId(e.target.value)}
                                    placeholder={`Auto-generated (e.g. ${new Date().getFullYear()}00001)`}
                                />
                                <p className="text-[10px] text-text-muted">Leave empty to auto-generate the next number.</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-muted">Date Range (Optional)</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full color-scheme-dark"
                                            value={dateRangeStart}
                                            onChange={(e) => setDateRangeStart(e.target.value)}
                                            placeholder="From"
                                        />
                                    </div>
                                    <span className="text-text-muted text-sm">to</span>
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full color-scheme-dark"
                                            value={dateRangeEnd}
                                            onChange={(e) => setDateRangeEnd(e.target.value)}
                                            placeholder="To"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-text-muted">Invoice Date</label>
                                        <input
                                            type="date"
                                            className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full color-scheme-dark"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-text-muted">Due Date</label>
                                        <input
                                            type="date"
                                            className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary w-full color-scheme-dark"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {[0, 15, 30, 45, 60].map((days) => {
                                        const label = days === 0 ? "Today" : `${days} Days`;
                                        // Calculate what the date would be for this button to check if it's "active"
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
                                                    "px-3 py-1 text-xs font-medium rounded-full border transition-all",
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
                        </div>
                    )}

                    {selectedCustomer && (
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end">
                                <h3 className="text-sm font-semibold text-text-main uppercase tracking-wider">Unbilled Work Logs</h3>
                                {availableLogs.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSelectAll}
                                        className="h-auto py-1 px-2 text-xs font-medium"
                                    >
                                        {selectedLogs.length === availableLogs.length ? "Deselect All" : "Mark All"}
                                    </Button>
                                )}
                            </div>
                            {availableLogs.length === 0 ? (
                                <p className="text-text-muted italic text-center py-4 bg-bg-surface rounded-md">No unbilled logs found for this customer.</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableLogs.map(log => {
                                        const isSelected = selectedLogs.includes(log.id.toString());
                                        const serviceObj = typeof log.service === 'object' ? log.service : null;
                                        const serviceName = serviceObj?.name || (typeof log.service === 'string' ? log.service : "") || log.serviceName || "Service";

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
                                                    "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:bg-bg-surface-hover hover:border-border transition-all duration-200 group text-sm",
                                                    isSelected ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" : "bg-bg-app border-border-subtle"
                                                )}
                                                onClick={() => handleToggleLog(log.id.toString())}
                                            >
                                                <div className={cn("mt-1 text-text-muted transition-colors group-hover:text-primary", isSelected && "text-primary")}>
                                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </div>
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4">
                                                    <div className="col-span-full flex justify-between items-start">
                                                        <span className="font-semibold text-text-main text-base">{serviceName}</span>
                                                        <span className="text-xs font-mono text-text-muted bg-bg-surface px-2 py-0.5 rounded border border-border-subtle">{log.date}</span>
                                                    </div>

                                                    {log.description && (
                                                        <div className="col-span-full text-text-muted italic mb-1">{log.description}</div>
                                                    )}

                                                    <div className="text-text-muted">
                                                        <span className="font-medium text-text-main">{log.quantity}</span> units @ <span className="font-medium text-text-main">{currencySymbol}{new Decimal(rate || 0).toFixed(2)} {currencyCode}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="font-mono font-bold text-lg text-text-main tracking-tight">{currencySymbol}{new Decimal(total || 0).toFixed(2)} {currencyCode}</div>
                                                    <span className="text-[10px] uppercase font-bold text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded tracking-wide">Unbilled</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border-subtle bg-bg-surface rounded-b-lg flex justify-between items-center">
                    <div className="text-lg">
                        <span className="text-text-muted mr-2">Selected Total:</span>
                        <strong className="text-text-main">{currencySymbol}{calculateTotal()} {currencyCode}</strong>
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedCustomer || selectedLogs.length === 0}
                            className="bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate Invoice ({selectedLogs.length})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
