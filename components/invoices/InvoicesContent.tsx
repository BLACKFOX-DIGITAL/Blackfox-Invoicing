"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import { SendInvoiceModal, RecordPaymentModal, DeleteConfirmationModal } from "@/components/invoices/InvoiceActions";
import { SerializedInvoiceData } from "@/app/actions/invoices";

import { Plus, AlertCircle, Clock, CheckCircle, Search } from "lucide-react";
import { formatDate } from "@/lib/format";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { updateInvoiceStatus, deleteInvoice, createInvoice } from "@/app/actions/invoices";
import EmptyState from "@/components/ui/EmptyState";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import Select from "@/components/ui/Select";
import { buildInvoiceEmailHtml } from "@/lib/emailUtils";
import { getCurrencySymbol } from "@/lib/format";


interface InvoicesContentProps {
    initialInvoicesData: SerializedInvoiceData;
    customers: any[];
    unbilledLogs?: any[];
    services?: any[];
    settings?: any;
}

export default function InvoicesContent({ initialInvoicesData, customers, unbilledLogs = [], services = [], settings }: InvoicesContentProps) {
    const [invoices, setInvoices] = useState<any[]>(initialInvoicesData.invoices);
    const [searchTerm, setSearchTerm] = useState("");
    const toast = useToast();
    const [activeModal, setActiveModal] = useState<"create" | "send" | "pay" | "delete" | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Sync search input with URL
    useEffect(() => {
        const urlSearch = searchParams.get("search") || "";
        setSearchTerm(urlSearch);
    }, [searchParams]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const current = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                current.set("search", searchTerm);
            } else {
                current.delete("search");
            }
            // Reset to page 1 on search
            current.set("page", "1");
            router.push(`${pathname}?${current.toString()}`);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, pathname, router]);

    useEffect(() => {
        setInvoices(initialInvoicesData.invoices);
    }, [initialInvoicesData]);

    const handleSend = (invoice: any) => {
        setSelectedInvoice(invoice);
        setActiveModal("send");
    };

    const handlePay = (invoice: any) => {
        setSelectedInvoice(invoice);
        setActiveModal("pay");
    };

    const handlePaySubmit = async (data: any) => {
        // Dynamically import to ensure we get the latest action
        const { recordPayment } = await import("@/app/actions/payments");

        const result = await recordPayment({
            invoiceId: selectedInvoice.id,
            amount: data.amount.toString(),
            fee: data.fee ? data.fee.toString() : undefined,
            method: data.method,
            date: data.date,
            notes: data.notes,
            sendReceipt: data.sendReceipt
        });

        if (result.success) {
            // Force refresh to get updated status and totals from server
            router.refresh();
        } else {
            toast.error("Error recording payment: " + result.error);
        }

        setActiveModal(null);
    };

    const handleSendSubmit = async (data: any) => {
        const { sendEmail } = await import("@/app/actions/sendEmail");

        try {
            const result = await sendEmail({
                to: data.to,
                subject: data.subject,
                htmlBody: buildInvoiceEmailHtml({
                    companyName: settings?.companyName || "Your Company",
                    logoUrl: settings?.logoUrl || "",
                    invoiceId: String(selectedInvoice.id),
                    amount: `${getCurrencySymbol(customers.find(c => c.id === selectedInvoice.customerId)?.currency || settings?.currency)}${Number(selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : (selectedInvoice.total || 0)).toFixed(2)}`,
                    dueDate: selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate) : "On Receipt",
                    messageHtml: data.message.replace(/\n/g, "<br/>"),
                    invoiceLink: `${window.location.origin}/public/invoice/${selectedInvoice.id}?token=${selectedInvoice.publicToken}`,
                    websiteUrl: settings?.website || "",
                    headingHtml: data.heading,
                    footerHtml: data.footer ? data.footer.replace(/\n/g, "<br/>") : "",
                    type: data.templateName?.toLowerCase().includes("overdue")
                        ? "overdue"
                        : data.templateName?.toLowerCase().includes("receipt")
                            ? "receipt"
                            : data.templateName?.toLowerCase().includes("statement")
                                ? "statement"
                                : "invoice"
                }),
                senderName: settings?.companyName || "Billing",
                invoiceId: selectedInvoice.id,
                customerId: selectedInvoice.customerId
            });

            if (result.success) {
                await updateInvoiceStatus(selectedInvoice.id, "Sent");
                setInvoices(invoices.map(inv =>
                    inv.id === selectedInvoice.id ? { ...inv, status: "Sent" } : inv
                ));
                toast.success(result.data.message);
            } else {
                toast.error("Error sending email: " + result.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to send email.");
        }

        setActiveModal(null);
        router.refresh();
    };

    const handleCreateSubmit = async (data: any) => {
        const customer = customers.find(c => c.id === data.customerId);

        // Get service name for each log
        const getServiceName = (log: any) => {
            const service = services.find(s => s.id === log.serviceId);
            return service?.name || log.serviceName || "Service";
        };

        // Build items from selected work logs
        const selectedLogs = unbilledLogs.filter(log =>
            data.logIds?.includes(log.id.toString())
        );

        const items = selectedLogs.map(log => ({
            serviceName: getServiceName(log),
            quantity: log.quantity,
            rate: typeof log.rate === 'string' ? parseFloat(log.rate) : log.rate,
            total: typeof log.total === 'string' ? parseFloat(log.total) : log.total,
            date: formatDate(log.date),
            description: log.description
        }));

        const result = await createInvoice({
            customerId: data.customerId,
            clientName: customer?.name || "Unknown",
            date: data.invoiceDate,
            dueDate: data.dueDate,
            subtotal: data.subtotal || 0,
            tax: 0,
            discount: 0,
            discountType: "fixed",
            discountValue: 0,
            total: data.total || 0,
            workLogIds: selectedLogs.map(log => typeof log.id === 'string' ? parseInt(log.id) : log.id),
            id: data.customId, // Pass custom ID
            items: items
        });

        if (result.success && result.data?.id) {
            router.refresh(); // Refresh list in background
            router.push(`/invoices/${result.data.id}`);
        }
        setActiveModal(null);
    };

    const handleDelete = (invoice: any) => {
        // Instead of deleting immediately, set the invoice and open the modal
        setSelectedInvoice(invoice);
        setActiveModal("delete");
    };

    const confirmDelete = async () => {
        if (!selectedInvoice) return;

        const result = await deleteInvoice(selectedInvoice.id);
        if (result.success) {
            setInvoices(invoices.filter(inv => inv.id !== selectedInvoice.id));
        } else {
            toast.error("Error deleting invoice: " + result.error);
        }

        setActiveModal(null);
        setSelectedInvoice(null);
        router.refresh();
    };

    const handleDownload = (invoice: any) => {
        toast.success(`Generating PDF for ${invoice.id}...`);
    };



    const [dateRange, setDateRange] = useState("all");

    // Sync state with URL
    useEffect(() => {
        const urlSearch = searchParams.get("search") || "";
        const urlRange = searchParams.get("range") || "all";
        setSearchTerm(urlSearch);
        setDateRange(urlRange);
    }, [searchParams]);

    const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRange = e.target.value;
        setDateRange(newRange);

        const current = new URLSearchParams(searchParams.toString());
        if (newRange && newRange !== "all") {
            current.set("range", newRange);
        } else {
            current.delete("range");
            // Clear manual dates if switching back to range mode or all
            current.delete("startDate");
            current.delete("endDate");
        }
        current.set("page", "1");
        router.push(`${pathname}?${current.toString()}`);
    };

    // Use server-side aggregated stats
    const { stats } = initialInvoicesData;
    const overdueTotal = stats?.overdue || 0;
    const openTotal = stats?.open || 0;
    const paidTotal = stats?.paid || 0;

    return (
        <div className="max-w-[1400px] mx-auto space-y-8">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Invoices</h1>
                    <p className="text-text-muted mt-2">Track payments and outstanding balances.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button href="/invoices/generate" className="flex items-center gap-2 rounded-full px-6">
                        <Plus size={16} aria-hidden="true" /> Generate Invoice
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overdue</h2>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <AlertCircle size={12} aria-hidden="true" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {getCurrencySymbol(settings?.currency || "USD")}{overdueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] font-medium text-status-error bg-status-error/10 px-1.5 py-0.5 rounded">Action Required</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Open</h2>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Clock size={12} aria-hidden="true" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {getCurrencySymbol(settings?.currency || "USD")}{openTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] font-medium text-status-info bg-status-info/10 px-1.5 py-0.5 rounded">Awaiting Payment</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Paid (Total)</h2>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <CheckCircle size={12} aria-hidden="true" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {getCurrencySymbol(settings?.currency || "USD")}{paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] font-medium text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">Collected</span>
                    </div>
                </Card>
            </div>

            {invoices.length === 0 && (
                <EmptyState
                    title="No Invoices Found"
                    description={searchTerm || (searchParams.toString() && searchParams.get("page") !== "1" && searchParams.size > 0 && Array.from(searchParams.keys()).some(k => k !== 'page')) ? "We couldn't find any invoices matching your current filters. Try adjusting your search or filters." : "You haven't created any invoices yet. Start by creating your first one!"}
                    icon={Clock}
                    action={!(searchTerm || searchParams.toString()) ? {
                        label: "Create First Invoice",
                        onClick: () => setActiveModal("create")
                    } : undefined}
                    className="my-8"
                />
            )}

            <Card className="border-0 shadow-sm ring-1 ring-black/5">
                <InvoiceTable
                    invoices={invoices}
                    customers={customers}
                    settings={settings}
                    layoutSearchTerm={searchTerm}
                    onSend={handleSend}
                    onPay={handlePay}
                    onDownload={handleDownload}
                    onDelete={(id) => {
                        const inv = invoices.find(i => i.id === id);
                        if (inv) handleDelete(inv);
                    }}
                    stats={initialInvoicesData.stats}
                    pagination={{
                        totalCount: initialInvoicesData.totalCount,
                        totalPages: initialInvoicesData.totalPages,
                        currentPage: initialInvoicesData.currentPage
                    }}
                />
            </Card>

            {activeModal === 'send' && (
                <SendInvoiceModal
                    invoice={selectedInvoice}
                    customer={customers.find(c => c.id === selectedInvoice.customerId)}
                    settings={settings}
                    onClose={() => setActiveModal(null)}
                    onSend={handleSendSubmit}
                />
            )}

            {activeModal === 'pay' && (
                <RecordPaymentModal
                    invoice={selectedInvoice}
                    customer={customers.find(c => c.id === selectedInvoice.customerId)}
                    settings={settings}
                    onClose={() => setActiveModal(null)}
                    onPay={handlePaySubmit}
                />
            )}



            {activeModal === 'delete' && selectedInvoice && (
                <DeleteConfirmationModal
                    invoiceId={selectedInvoice.id}
                    onClose={() => {
                        setActiveModal(null);
                        setSelectedInvoice(null);
                    }}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
}
