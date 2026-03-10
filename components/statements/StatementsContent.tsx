"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { Mail, FileText, Users, ChevronDown, History, Download } from "lucide-react";
import { SendStatementModal } from "@/components/invoices/InvoiceActions";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/ToastProvider";
import { logStatementActivity, getStatementHistory } from "@/app/actions/statements";
import { formatDate, formatCurrency, sortCustomers } from "@/lib/format";
import Link from "next/link";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const StatementDownloadButton = dynamic(
    () => import("@/components/statements/StatementDownloadButton"),
    { ssr: false, loading: () => <Button variant="secondary" disabled>Loading...</Button> }
);



interface StatementsContentProps {
    customers: any[];
    invoices: any[];
    settings?: any;
}

export default function StatementsContent({ customers, invoices, settings }: StatementsContentProps) {
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [statementItems, setStatementItems] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isGenerated, setIsGenerated] = useState(false);
    const [activeModal, setActiveModal] = useState<"email" | "preview" | null>(null);
    const [statementType, setStatementType] = useState<"outstanding" | "activity">("outstanding");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const toast = useToast();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const sortField = searchParams.get("stSortField") || "date";
    const sortOrder = searchParams.get("stSortOrder") as "asc" | "desc" || "desc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("stSortField", field);
        params.set("stSortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    const fetchHistory = async (id: string) => {
        setLoadingHistory(true);
        const res = await getStatementHistory(id);
        if (res.success) setHistory(res.data);
        setLoadingHistory(false);
    };

    const handleGenerate = () => {
        if (!selectedCustomer) {
            toast.error("Please select a customer first.");
            return;
        }

        const customerInvoices = invoices.filter(inv => {
            const matchesCustomer = inv.customerId === selectedCustomer;

            if (statementType === "outstanding") {
                return matchesCustomer && inv.status !== "Paid" && inv.status !== "Cancelled" && inv.status !== "Void" && (inv.balanceDue ?? inv.total) > 0;
            } else {
                const matchesStart = startDate ? new Date(inv.date) >= new Date(startDate) : true;
                const matchesEnd = endDate ? new Date(inv.date) <= new Date(endDate) : true;
                return matchesCustomer && matchesStart && matchesEnd;
            }
        });

        if (statementType === "activity") {
            customerInvoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
            customerInvoices.sort((a, b) => {
                let valA: any = a[sortField];
                let valB: any = b[sortField];

                if (sortField === "date") {
                    valA = new Date(a.date).getTime();
                    valB = new Date(b.date).getTime();
                }

                if (sortField === "balanceDue") {
                    valA = a.status === "Paid" ? 0 : (a.balanceDue ?? a.total);
                    valB = b.status === "Paid" ? 0 : (b.balanceDue ?? b.total);
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setStatementItems(customerInvoices);
        setIsGenerated(true);
    };

    const handleLogActivity = async (status: "Sent" | "Downloaded") => {
        if (!selectedCustomer) return;

        await logStatementActivity({
            customerId: selectedCustomer,
            startDate: startDate || statementItems[statementItems.length - 1]?.date || new Date().toISOString(),
            endDate: endDate || statementItems[0]?.date || new Date().toISOString(),
            itemCount: statementItems.length,
            totalAmount: totalAmount,
            status
        });

        fetchHistory(selectedCustomer);
    };

    const handleSendEmail = async (data: any) => {
        const { sendEmail } = await import("@/app/actions/sendEmail");

        try {
            const { buildInvoiceEmailHtml } = await import("@/lib/emailUtils");
            const result = await sendEmail({
                to: data.to,
                subject: data.subject,
                htmlBody: buildInvoiceEmailHtml({
                    companyName: settings?.companyName || "Your Company",
                    logoUrl: settings?.logoUrl || "",
                    amount: data.totalAmount || formatCurrency(totalAmount, customerCurrency),
                    messageHtml: data.message.replace(/\n/g, "<br/>"),
                    type: 'statement',
                    websiteUrl: settings?.website || "",
                    headingHtml: data.heading,
                    footerHtml: data.footer ? data.footer.replace(/\n/g, "<br/>") : ""
                } as any),
                senderName: settings?.companyName || "Billing"
            });

            if (result.success) {
                toast.success(result.data.message);
                handleLogActivity("Sent");
            } else {
                toast.error("Error sending email: " + result.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to send email.");
        }
        setActiveModal(null);
    };

    const totalAmount = statementItems.reduce((sum, inv) => {
        if (inv.status === "Paid") return sum;
        return sum + (inv.balanceDue ?? inv.total);
    }, 0);

    const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
    const customerCurrency = selectedCustomerData?.currency || "USD";

    const customerAddress = selectedCustomerData ?
        `${selectedCustomerData.address || ""} ${selectedCustomerData.city || ""} ${selectedCustomerData.country || ""}`.trim()
        : "";

    const companyDetails = settings ? {
        name: settings.companyName,
        address: settings.address,
        email: settings.email
    } : undefined;

    return (
        <div className="flex flex-col space-y-8 max-w-[1400px] mx-auto pb-10">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Customer Statements</h1>
                    <p className="text-text-muted mt-2">Generate and view detailed account statements.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Side: Controls & History */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-bold text-text-main uppercase mb-4">Configuration</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="customer-select" className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Customer ID</label>
                                <div className="relative group">
                                    <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
                                    <select
                                        id="customer-select"
                                        className="w-full pl-9 pr-8 py-2 bg-bg-app border border-border-subtle rounded-md text-sm text-text-main appearance-none focus:outline-none focus:border-primary transition-all cursor-pointer"
                                        value={selectedCustomer}
                                        onChange={(e) => {
                                            setSelectedCustomer(e.target.value);
                                            setIsGenerated(false);
                                            if (e.target.value) fetchHistory(e.target.value);
                                            else setHistory([]);
                                        }}
                                    >
                                        <option value="">Select ID</option>
                                        {sortCustomers(customers).map(cust => (
                                            <option key={cust.id} value={cust.id}>{cust.id} - {cust.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="statement-type" className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Type</label>
                                <div className="relative group">
                                    <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted z-10" />
                                    <select
                                        id="statement-type"
                                        className="w-full pl-9 pr-8 py-2 bg-bg-app border border-border-subtle rounded-md text-sm text-text-main appearance-none focus:outline-none focus:border-primary transition-all cursor-pointer"
                                        value={statementType}
                                        onChange={(e) => {
                                            setStatementType(e.target.value as any);
                                            setIsGenerated(false);
                                        }}
                                    >
                                        <option value="outstanding">Outstanding Invoices</option>
                                        <option value="activity">Account Activity</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                </div>
                            </div>

                            {statementType === "activity" && (
                                <>
                                    <div>
                                        <label htmlFor="start-date" className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Start Date</label>
                                        <input
                                            id="start-date"
                                            type="date"
                                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-primary color-scheme-dark"
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value); setIsGenerated(false); }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="end-date" className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">End Date</label>
                                        <input
                                            id="end-date"
                                            type="date"
                                            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-primary color-scheme-dark"
                                            value={endDate}
                                            onChange={(e) => { setEndDate(e.target.value); setIsGenerated(false); }}
                                        />
                                    </div>
                                </>
                            )}

                            <Button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2">
                                <FileText size={16} /> Generate
                            </Button>
                        </div>
                    </Card>

                    {/* Statement History */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <History size={16} className="text-text-muted" />
                            <h3 className="text-sm font-bold text-text-main uppercase">Statement History</h3>
                        </div>
                        <div className="space-y-3">
                            {loadingHistory ? (
                                <div className="text-xs text-text-muted animate-pulse">Loading history...</div>
                            ) : history.length > 0 ? (
                                history.map(log => (
                                    <div key={log.id} className="p-3 bg-bg-app/50 rounded-md border border-border-subtle relative group overflow-hidden">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-mono text-primary font-bold">
                                                {log.status === "Sent" ? <Mail size={10} className="inline mr-1" /> : <Download size={10} className="inline mr-1" />}
                                                {log.status}
                                            </span>
                                            <span className="text-[10px] text-text-muted">{formatDate(log.sentAt)}</span>
                                        </div>
                                        <div className="text-xs font-semibold text-text-main">{formatCurrency(log.totalAmount, customerCurrency)}</div>
                                        <div className="text-[10px] text-text-muted">{log.itemCount} items • {formatDate(log.startDate)} - {formatDate(log.endDate)}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[11px] text-text-muted italic py-4">No recent statements logged.</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Side: Preview */}
                <div className="lg:col-span-3">
                    {isGenerated ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-text-main">
                                    {selectedCustomerData?.name || selectedCustomer}
                                </h2>
                                <div className="flex gap-3">
                                    <Link
                                        href={`/statements/${selectedCustomer}?${new URLSearchParams({
                                            type: statementType,
                                            ...(startDate && { startDate }),
                                            ...(endDate && { endDate })
                                        }).toString()}`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-main bg-transparent hover:bg-bg-card border border-transparent hover:border-border-subtle rounded-md transition-colors"
                                    >
                                        <FileText size={16} /> Preview Statement
                                    </Link>
                                    <StatementDownloadButton
                                        customerName={selectedCustomerData?.name || selectedCustomer}
                                        customerAddress={customerAddress}
                                        customer={selectedCustomerData}
                                        items={statementItems}
                                        totalAmount={totalAmount}
                                        currency={customerCurrency}
                                        companyDetails={companyDetails}
                                        type={statementType}
                                        onDownload={() => handleLogActivity("Downloaded")}
                                    />
                                    <Button onClick={() => setActiveModal("email")} className="flex items-center gap-2">
                                        <Mail size={16} /> Email Statement
                                    </Button>
                                </div>
                            </div>

                            <Card className="overflow-hidden">
                                <Table
                                    headers={[
                                        <SortableHeader key="sh_inv" label="Invoice" sortKey="id" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                                        <SortableHeader key="sh_date" label="Date" sortKey="date" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                                        <SortableHeader key="sh_desc" label="Description" sortKey="id" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                                        <SortableHeader key="sh_stat" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                                        <SortableHeader key="sh_tot" label="Total" sortKey="total" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white justify-end w-full" />,
                                        <SortableHeader key="sh_bal" label="Balance Due" sortKey="balanceDue" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white justify-end w-full pr-8" />,
                                    ]}
                                    alignments={["left", "left", "left", "left", "right", "right"]}
                                    data={statementItems}
                                    renderRow={(row, i) => {
                                        const dueAmount = row.status === "Paid" ? 0 : (row.balanceDue ?? row.total);
                                        return (
                                            <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                                                <td className="px-6 py-4 first:pl-8">
                                                    <span className="text-xs font-mono text-primary font-bold">{row.id}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-text-muted">{formatDate(row.date)}</td>
                                                <td className="px-6 py-4 text-sm text-text-main font-medium">
                                                    {row.items && row.items.length > 0 ? row.items[0].serviceName + (row.items.length > 1 ? ` +${row.items.length - 1} more` : "") : "Invoice"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={row.status === "Paid" ? "success" : (row.status === "Sent" || row.status === "Draft") ? "warning" : "error"}>
                                                        {row.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-text-muted">
                                                    {formatCurrency(row.total, customerCurrency)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-text-main last:pr-8">
                                                    {formatCurrency(dueAmount, customerCurrency)}
                                                </td>
                                            </tr>
                                        );
                                    }}
                                />
                                {statementItems.length === 0 ? (
                                    <div className="p-20 text-center">
                                        <FileText size={40} className="mx-auto text-text-muted/20 mb-4" />
                                        <p className="text-text-muted">No invoices found for the selected period.</p>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-bg-surface border-t border-border-subtle flex justify-end">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Total Balance Due</p>
                                            <p className="text-4xl font-extrabold text-text-main tracking-tighter">
                                                {formatCurrency(totalAmount, customerCurrency)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-border-subtle rounded-xl bg-bg-app/30">
                            <div className="text-center">
                                <FileText size={48} className="mx-auto text-border-subtle mb-4" />
                                <h3 className="text-lg font-semibold text-text-muted">Statement Preview</h3>
                                <p className="text-sm text-text-muted max-w-xs mx-auto mt-2">
                                    Select a customer and configuration to generate a detailed account summary.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {activeModal === 'email' && (
                <SendStatementModal
                    customerName={selectedCustomerData?.name || selectedCustomer}
                    totalAmount={formatCurrency(totalAmount, customerCurrency)}
                    customer={selectedCustomerData}
                    settings={settings}
                    onClose={() => setActiveModal(null)}
                    onSend={handleSendEmail}
                />
            )}


        </div>
    );
}
