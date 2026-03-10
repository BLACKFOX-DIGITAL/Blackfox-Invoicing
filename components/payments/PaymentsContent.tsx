"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import { Filter, Banknote, Clock, AlertTriangle, Search, Calendar, CreditCard } from "lucide-react";
import Link from "next/link";
import { getCurrencySymbol } from "@/lib/format";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Payment = {
    id: string;
    customer: string;
    invoice: string;
    amount: number;
    method: string;
    date: string;
    status: string;
    invoiceStatus: string;
    currency?: string;
};

interface PaymentsContentProps {
    payments: Payment[];
    settings?: any;
}

export default function PaymentsContent({ payments, settings }: PaymentsContentProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");

    const filteredPayments = payments.filter((pay: Payment) => {
        const matchesSearch =
            pay.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pay.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pay.invoice.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;
        if (statusFilter && pay.invoiceStatus !== statusFilter) return false;
        if (dateStart && new Date(pay.date) < new Date(dateStart)) return false;
        if (dateEnd && new Date(pay.date) > new Date(dateEnd)) return false;

        if (dateEnd && new Date(pay.date) > new Date(dateEnd)) return false;

        return true;
    });

    const sortField = searchParams.get("sortField") || "date";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "desc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", field);
        params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    filteredPayments.sort((a, b) => {
        let valA: any = a[sortField as keyof Payment];
        let valB: any = b[sortField as keyof Payment];

        if (sortField === "date") {
            valA = new Date(a.date).getTime();
            valB = new Date(b.date).getTime();
        } else if (sortField === "amount") {
            valA = a.amount;
            valB = b.amount;
        } else if (typeof valA === "string") {
            valA = valA.toLowerCase();
            valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const totalRevenue = filteredPayments
        .filter(p => p.status === "Completed")
        .reduce((acc, curr) => acc + curr.amount, 0);

    const getFormattedTotal = (amount: number) => {
        const currency = settings?.currency || "USD";
        const symbol = getCurrencySymbol(currency);
        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    };

    const pendingVolume = filteredPayments
        .filter(p => p.status === "Pending")
        .reduce((acc, curr) => acc + curr.amount, 0);

    const failedVolume = filteredPayments
        .filter(p => p.status === "Failed")
        .reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Payment Log</h1>
                    <p className="text-text-muted mt-2">History of all payments received from invoices.</p>
                </div>
                <div className="w-64">
                    <Input
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        startIcon={<Search size={18} className="text-text-muted" />}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Revenue</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Banknote size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {getFormattedTotal(totalRevenue)}
                        </div>
                        <span className="text-[10px] font-medium text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">collected</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pending Volume</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Clock size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {getFormattedTotal(pendingVolume)}
                        </div>
                        <span className="text-[10px] font-medium text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded">processing</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Failed Volume</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <AlertTriangle size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {getFormattedTotal(failedVolume)}
                        </div>
                        <span className="text-[10px] font-medium text-status-error bg-status-error/10 px-1.5 py-0.5 rounded">needs attention</span>
                    </div>
                </Card>
            </div>

            {/* Filters Toolbar */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 bg-bg-surface border border-border-subtle rounded-lg">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-text-muted">
                        <Filter size={16} />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <select
                        className="bg-bg-app border border-border-subtle rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary text-text-main"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partially Paid">Partially Paid</option>
                    </select>

                    <div className="flex items-center gap-2 bg-bg-app rounded-md px-3 py-1.5 border border-border-subtle">
                        <Calendar size={14} className="text-text-muted" />
                        <input
                            type="date"
                            className="bg-transparent border-none text-sm text-text-main focus:outline-none p-0 w-28"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                        />
                        <span className="text-text-muted text-xs mx-1">to</span>
                        <input
                            type="date"
                            className="bg-transparent border-none text-sm text-text-main focus:outline-none p-0 w-28"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                        />
                    </div>
                </div>
                <div className="text-sm text-text-muted font-medium whitespace-nowrap">
                    Showing {filteredPayments.length} records
                </div>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-black/5">
                {filteredPayments.length === 0 ? (
                    <div className="p-12 text-center text-text-muted">
                        <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No payments recorded yet</p>
                        <p className="text-sm mt-1">Payments will appear here when invoices are marked as paid.</p>
                    </div>
                ) : (
                    <Table
                        headers={[
                            <SortableHeader key="sh_id" label="Payment ID" sortKey="id" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_cust" label="Customer" sortKey="customer" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_inv" label="Invoice" sortKey="invoice" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_amt" label="Amount" sortKey="amount" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_meth" label="Method" sortKey="method" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_date" label="Date" sortKey="date" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_stat" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />
                        ]}
                        data={filteredPayments}
                        renderRow={(row: Payment, i: number) => (
                            <tr key={i} className="hover:bg-bg-app/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sm text-text-main">{row.id}</td>
                                <td className="px-6 py-4 font-medium text-text-main">{row.customer}</td>
                                <td className="px-6 py-4 text-primary hover:underline">
                                    <Link href={`/invoices/${row.invoice}`}>{row.invoice}</Link>
                                </td>
                                <td className="px-6 py-4 font-bold text-text-main">
                                    {(() => {
                                        const currency = row.currency || settings?.currency || "USD";
                                        const symbol = getCurrencySymbol(currency);
                                        return `${symbol}${row.amount.toFixed(2)} ${currency}`;
                                    })()}
                                </td>
                                <td className="px-6 py-4 text-text-muted text-sm">{row.method}</td>
                                <td className="px-6 py-4 text-text-muted text-sm">{row.date}</td>
                                <td className="px-6 py-4">
                                    <Badge
                                        variant={
                                            row.status === "Paid" ? "success" : "warning"
                                        }
                                    >
                                        {row.status === "Paid" ? "Paid" : "Partially Paid"}
                                    </Badge>
                                </td>
                            </tr>
                        )}
                    />
                )}
            </Card>
        </div>
    );
}
