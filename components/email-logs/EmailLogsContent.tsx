"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import { Mail, CheckCircle, XCircle, Clock, Search, Send } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface EmailLog {
    id: number;
    to: string;
    subject: string;
    body: string;
    status: string;
    invoiceId?: string;
    customerId?: string;
    createdAt: string;
    errorMsg?: string;
}

interface EmailLogsContentProps {
    logs: EmailLog[];
    stats: {
        total: number;
        sent: number;
        failed: number;
    };
}

export default function EmailLogsContent({ logs, stats }: EmailLogsContentProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.subject.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;
        if (statusFilter && log.status !== statusFilter) return false;

        return true;
    });


    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "desc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", field);
        params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    filteredLogs.sort((a, b) => {
        let valA: any = a[sortField as keyof EmailLog];
        let valB: any = b[sortField as keyof EmailLog];

        if (sortField === "createdAt") {
            valA = new Date(a.createdAt).getTime();
            valB = new Date(b.createdAt).getTime();
        } else if (typeof valA === "string") {
            valA = valA.toLowerCase();
            valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "Opened":
            case "Clicked":
                return "success";
            case "Delivered":
                return "warning";
            case "Sent":
            case "Processed":
                return "info";
            case "Bounced":
            case "Soft Bounced":
            case "Failed":
                return "error";
            default:
                return "default";
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Email Logs</h1>
                    <p className="text-text-muted mt-2">Track all outgoing email communications.</p>
                </div>
                <div className="w-64">
                    <Input
                        placeholder="Search emails..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        startIcon={<Search size={18} className="text-text-muted" />}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Emails</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Mail size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">{stats.total}</div>
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">all time</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Sent Successfully</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <CheckCircle size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">{stats.sent}</div>
                        <span className="text-[10px] font-medium text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">delivered</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Failed</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <XCircle size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">{stats.failed}</div>
                        <span className="text-[10px] font-medium text-status-error bg-status-error/10 px-1.5 py-0.5 rounded">errors</span>
                    </div>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border-subtle rounded-lg">
                <span className="text-sm text-text-muted">Filter by status:</span>
                <select
                    className="bg-bg-app border border-border-subtle rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary text-text-main"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All</option>
                    <option value="Sent">Sent</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Opened">Opened</option>
                    <option value="Bounced">Bounced</option>
                    <option value="Failed">Failed</option>
                </select>
                <span className="ml-auto text-text-muted text-sm">{filteredLogs.length} emails</span>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-black/5">
                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center text-text-muted">
                        <Send size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No email logs yet</p>
                        <p className="text-sm mt-1">Email logs will appear here when you send invoices.</p>
                    </div>
                ) : (
                    <Table
                        headers={[
                            <SortableHeader key="sh_date" label="Date" sortKey="createdAt" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" />,
                            <SortableHeader key="sh_to" label="To" sortKey="to" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" />,
                            <SortableHeader key="sh_subj" label="Subject" sortKey="subject" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" />,
                            <SortableHeader key="sh_inv" label="Invoice" sortKey="invoiceId" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" />,
                            <SortableHeader key="sh_stat" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-text-muted justify-start" />
                        ]}
                        data={filteredLogs}
                        renderRow={(log: EmailLog, i: number) => (
                            <tr key={i} className="hover:bg-bg-app/50 transition-colors">
                                <td className="px-6 py-4 text-text-muted text-sm whitespace-nowrap">
                                    {formatDate(log.createdAt)}
                                </td>
                                <td className="px-6 py-4 font-medium text-text-main">{log.to}</td>
                                <td className="px-6 py-4 text-text-muted max-w-xs truncate">{log.subject}</td>
                                <td className="px-6 py-4">
                                    {log.invoiceId ? (
                                        <Link href={`/invoices/${log.invoiceId}`} className="text-primary hover:underline">
                                            {log.invoiceId}
                                        </Link>
                                    ) : (
                                        <span className="text-text-muted">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant={getStatusVariant(log.status)}>
                                        {log.status}
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
