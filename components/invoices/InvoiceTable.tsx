"use client";

import { useState, useEffect } from "react";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";
import { Eye, Send, CreditCard, Download, Trash2, MoreHorizontal, Search, ChevronUp, ChevronDown, Calendar } from "lucide-react";
import Link from "next/link";
import { getCurrencySymbol, formatCustomerDisplay, formatDate, sortCustomers } from "@/lib/format";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const InvoiceDownloadButton = dynamic(
    () => import("@/components/invoices/InvoiceDownloadButton"),
    { ssr: false, loading: () => <div className="w-8 h-8" /> }
);
import SortableHeader from "@/components/ui/SortableHeader";

interface Invoice {
    id: string;
    client?: string;
    clientName?: string;
    customerId?: string;
    date: string;
    dueDate?: string;
    subtotal?: string | number;
    total: string | number;
    balanceDue?: number;
    status: string;
    overdueDays?: number;
    items?: {
        serviceName: string;
        quantity: number;
        rate: number;
        total: number;
    }[];
    tax?: number;
}

interface InvoiceTableProps {
    invoices: Invoice[];
    customers?: any[];
    onSend: (invoice: Invoice) => void;
    onPay: (invoice: Invoice) => void;
    onDownload: (invoice: Invoice) => void;
    onDelete?: (id: string) => void;
    layoutSearchTerm?: string;
    settings?: any;
    stats?: { unpaidCount?: number, draftCount?: number, overdue?: number, open?: number, paid?: number };
    pagination?: {
        totalCount: number;
        totalPages: number;
        currentPage: number;
    };
}



export default function InvoiceTable({
    invoices,
    customers = [],
    settings,
    onSend,
    onPay,
    onDownload,
    onDelete,
    layoutSearchTerm = "",
    stats,
    pagination
}: InvoiceTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const activeTab = searchParams.get("status") || "all";
    const filterCustomer = searchParams.get("customerId") || "";
    const dateStart = searchParams.get("startDate") || "";
    const dateEnd = searchParams.get("endDate") || "";
    const sortField = searchParams.get("sortField") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const isPillStatus = ['unpaid', 'draft', 'all'].includes(activeTab);
    const activeFiltersCount = (filterCustomer ? 1 : 0) + (!isPillStatus ? 1 : 0) + (dateStart ? 1 : 0) + (dateEnd ? 1 : 0) + (searchTerm ? 1 : 0);

    const createQueryString = (params: Record<string, string | null>) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(params)) {
            if (value === null) {
                newSearchParams.delete(key);
            } else {
                newSearchParams.set(key, value);
            }
        }
        if (!params.page && !params.sortField && !params.sortOrder) newSearchParams.set("page", "1");
        return newSearchParams.toString();
    };

    const handleFilterChange = (key: string, value: string | null) => {
        router.push(`${pathname}?${createQueryString({ [key]: value })}`);
    };

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        router.push(`${pathname}?${createQueryString({ sortField: field, sortOrder: newOrder })}`);
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const current = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                current.set("search", searchTerm);
            } else {
                current.delete("search");
            }
            if (current.get("search") !== searchParams.get("search")) {
                current.set("page", "1");
                router.push(`${pathname}?${current.toString()}`);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, pathname, router, searchParams]);

    const getStatusVariant = (status: string): "success" | "info" | "error" | "warning" | "default" => {
        switch (status) {
            case "Paid": return "success";
            case "Pending": return "info";
            case "Overdue": return "error";
            case "Sent": return "info";
            case "Partially Paid": return "warning";
            default: return "default";
        }
    };

    const formatDueRelative = (dueDateStr?: string, status?: string) => {
        if (!dueDateStr) return <span className="text-gray-400">—</span>;

        if (status === 'Paid') {
            return <span className="text-text-muted">{formatDate(dueDateStr)}</span>;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const due = new Date(dueDateStr);
        due.setHours(0, 0, 0, 0);

        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            const absDays = Math.abs(diffDays);
            return <span className="text-status-error font-bold">{absDays} day{absDays === 1 ? '' : 's'} ago</span>;
        } else if (diffDays === 0) {
            return <span className="text-status-warning font-bold">Today</span>;
        } else {
            return <span className="text-text-muted">In {diffDays} day{diffDays === 1 ? '' : 's'}</span>;
        }
    };

    const formatTotal = (total: string | number, customerId?: string) => {
        const globalCurrency = settings?.currency || "USD";
        const customer = customers.find(c => c.id === customerId);
        const currency = customer?.currency || globalCurrency;
        const symbol = getCurrencySymbol(currency);
        let amount = typeof total === 'string' ? parseFloat(total.replace(/[^0-9.-]/g, '')) : total;
        if (isNaN(amount)) amount = 0;
        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    };

    const layoutMode = activeTab === "draft" ? "draft" : (activeTab === "all" || activeTab === "Paid" ? "all" : "unpaid");

    let tableHeaders: React.ReactNode[] = [];
    let tableAlignments: ("left" | "center" | "right")[] = [];

    if (layoutMode === "draft") {
        tableHeaders = [
            <SortableHeader key="s_status" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_date" label="Date" sortKey="date" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_num" label="Number" sortKey="id" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_cust" label="Customer" sortKey="clientName" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <div key="s_amt" className="flex justify-end"><SortableHeader label="Amount due" sortKey="total" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} /></div>,
            <div key="s_act" className="text-right w-full font-bold font-sans text-white">Actions</div>
        ];
        tableAlignments = ["left", "left", "left", "left", "right", "right"];
    } else if (layoutMode === "all") {
        tableHeaders = [
            <SortableHeader key="s_status" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_date" label="Date" sortKey="date" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_num" label="Number" sortKey="id" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_cust" label="Customer" sortKey="clientName" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <div key="s_tot" className="flex justify-end"><SortableHeader label="Total" sortKey="total" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} /></div>,
            <div key="s_amtue" className="flex justify-end"><SortableHeader label="Amount due" sortKey="total" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} underline={true} /></div>,
            <div key="s_act" className="text-right w-full font-bold font-sans text-white">Actions</div>
        ];
        tableAlignments = ["left", "left", "left", "left", "right", "right", "right"];
    } else {
        tableHeaders = [
            <SortableHeader key="s_status" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_due" label="Due" sortKey="dueDate" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_date" label="Date" sortKey="date" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_num" label="Number" sortKey="id" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <SortableHeader key="s_cust" label="Customer" sortKey="clientName" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} />,
            <div key="s_unpad" className="flex justify-end"><SortableHeader label="Unpaid" sortKey="total" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} underline={true} /></div>,
            <div key="s_amt" className="flex justify-end"><SortableHeader label="Amount due" sortKey="total" currentSort={sortField} currentOrder={sortOrder as "asc" | "desc"} onSort={handleSort} /></div>,
            <div key="s_act" className="text-right w-full font-bold font-sans text-white">Actions</div>
        ];
        tableAlignments = ["left", "left", "left", "left", "left", "right", "right", "right"];
    }

    return (
        <div className="flex flex-col">
            <div className="p-5 bg-bg-card rounded-t-lg space-y-5">
                {/* Top Badge */}
                <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="w-5 h-5 rounded-full border border-primary bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                        {activeFiltersCount}
                    </div>
                    <span className="text-text-muted text-xs">active filter{activeFiltersCount === 1 ? '' : 's'}</span>

                    {activeFiltersCount > 0 && (
                        <>
                            <span className="text-gray-300 mx-1">|</span>
                            <button
                                onClick={() => router.push(pathname)}
                                className="text-primary font-bold hover:underline transition-colors text-xs"
                            >
                                Clear filters
                            </button>
                        </>
                    )}
                </div>

                {/* Filter Row */}
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="w-full md:w-48 relative">
                        <select
                            className="w-full bg-bg-surface border border-border-subtle rounded-md pl-3 pr-8 py-2 text-sm text-text-main font-medium appearance-none focus:outline-none focus:border-primary hover:border-border transition-colors"
                            value={filterCustomer}
                            onChange={(e) => handleFilterChange("customerId", e.target.value || null)}
                        >
                            <option value="">All customers</option>
                            {sortCustomers(customers).map(c => (
                                <option key={c.id} value={c.id}>{formatCustomerDisplay(c)}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="w-full md:w-40 relative">
                        <select
                            className="w-full bg-bg-surface border border-border-subtle rounded-md pl-3 pr-8 py-2 text-sm text-text-main font-medium appearance-none focus:outline-none focus:border-primary hover:border-border transition-colors"
                            value={['draft', 'unpaid', 'all'].includes(activeTab) ? "all" : activeTab}
                            onChange={(e) => handleFilterChange("status", e.target.value === "all" ? null : e.target.value)}
                        >
                            <option value="all">All statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Sent">Sent</option>
                            <option value="Partially Paid">Partially Paid</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="flex bg-bg-surface rounded-md border border-border-subtle w-full md:w-auto hover:border-border transition-colors overflow-hidden">
                        <div className="flex items-center relative flex-1">
                            <input
                                type="date"
                                className="w-full pl-3 pr-8 py-2 text-sm text-text-main bg-transparent focus:outline-none focus:ring-1 focus:ring-primary border-r border-border-subtle appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                                value={dateStart}
                                onChange={(e) => handleFilterChange("startDate", e.target.value || null)}
                                placeholder="From"
                            />
                            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="flex items-center relative flex-1">
                            <input
                                type="date"
                                className="w-full pl-3 pr-8 py-2 text-sm text-text-main bg-transparent focus:outline-none focus:ring-1 focus:ring-primary appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
                                value={dateEnd}
                                onChange={(e) => handleFilterChange("endDate", e.target.value || null)}
                                placeholder="To"
                            />
                            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="w-full md:w-64 relative ml-auto">
                        <input
                            placeholder="Enter invoice #"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-surface border border-border-subtle rounded-md pl-3 pr-8 py-2 text-sm text-text-main focus:outline-none focus:border-primary hover:border-border transition-colors"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted/50 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Pill Row */}
                <div className="flex justify-center w-full">
                    <div className="inline-flex bg-primary/5 rounded-full p-1 items-center border border-primary/10">
                        <button
                            onClick={() => handleFilterChange("status", "unpaid")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                                activeTab === "unpaid" ? "bg-primary text-white shadow w-fit" : "text-primary hover:bg-primary/10"
                            )}>
                            Unpaid <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-bold", activeTab === "unpaid" ? "bg-white/20 text-white" : "bg-primary/20 text-primary")}>{stats?.unpaidCount || 0}</span>
                        </button>
                        <button
                            onClick={() => handleFilterChange("status", "draft")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                                activeTab === "draft" ? "bg-primary text-white shadow" : "text-primary hover:bg-primary/10"
                            )}>
                            Draft <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-bold", activeTab === "draft" ? "bg-white/20 text-white" : "bg-primary/20 text-primary")}>{stats?.draftCount || 0}</span>
                        </button>
                        <button
                            onClick={() => handleFilterChange("status", "all")}
                            className={cn(
                                "px-4 py-1.5 mx-1 rounded-full text-sm font-semibold transition-colors",
                                activeTab === "all" ? "bg-primary text-white shadow" : "text-primary hover:bg-primary/10"
                            )}>
                            All invoices
                        </button>
                    </div>
                </div>
            </div>

            <Table
                headers={tableHeaders}
                data={invoices}
                alignments={tableAlignments}
                renderRow={(row, i) => {
                    const clientName = formatCustomerDisplay({ id: row.customerId || "" });
                    const balance = row.balanceDue ?? row.total;

                    const colStatus = (
                        <td className="px-6 py-4">
                            <Badge variant={getStatusVariant(row.status)} className="rounded-md px-3 font-semibold text-xs">
                                {row.status === "Pending" ? "Sent" : row.status}
                            </Badge>
                        </td>
                    );
                    const colDue = <td className="px-6 py-4 text-xs font-semibold">{formatDueRelative(row.dueDate, row.status)}</td>;
                    const colDate = <td className="px-6 py-4 text-xs font-medium text-text-muted">{formatDate(row.date)}</td>;
                    const colNumber = (
                        <td className="px-6 py-4 font-semibold text-text-main text-sm">
                            <Link href={`/invoices/${row.id}`} className="hover:text-primary transition-colors">
                                {row.id}
                            </Link>
                        </td>
                    );
                    const colCustomer = <td className="px-6 py-4 font-semibold text-text-main text-sm">{clientName}</td>;

                    const colActions = (
                        <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end items-center">
                                <button onClick={() => onPay(row)} className="p-1.5 text-text-muted hover:text-primary hover:bg-blue-50 rounded-md transition-colors" title="Record Payment" aria-label="Record Payment">
                                    <CreditCard size={16} aria-hidden="true" />
                                </button>
                                {onDelete && (
                                    <button onClick={() => onDelete(row.id)} className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete" aria-label="Delete invoice">
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                )}
                                <Dropdown
                                    trigger={
                                        <button className="p-1.5 text-text-muted hover:text-primary hover:bg-blue-50 rounded-md transition-colors" aria-label="More actions">
                                            <MoreHorizontal size={16} aria-hidden="true" />
                                        </button>
                                    }
                                >
                                    <DropdownItem href={`/invoices/${row.id}`} icon={<Eye size={16} />}>
                                        View Details
                                    </DropdownItem>
                                    <DropdownItem onClick={() => onSend(row)} icon={<Send size={16} />}>
                                        Send Email
                                    </DropdownItem>
                                    <InvoiceDownloadButton
                                        invoice={{
                                            ...row,
                                            clientName: row.clientName || "",
                                            subtotal: typeof row.subtotal === 'string' ? parseFloat(row.subtotal) : (row.subtotal || 0),
                                            total: typeof row.total === 'string' ? parseFloat(row.total) : (row.total || 0),
                                            items: row.items || [],
                                            tax: row.tax || 0
                                        }}
                                        customer={customers.find(c => c.id === row.customerId)}
                                        settings={settings}
                                        variant="ghost"
                                        className="w-full justify-start px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors cursor-pointer mx-0 font-medium group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-400 group-hover:text-gray-600 transition-colors"><Download size={16} /></span>
                                            <span>Download PDF</span>
                                        </div>
                                    </InvoiceDownloadButton>
                                </Dropdown>
                            </div>
                        </td>
                    );

                    if (layoutMode === "draft") {
                        const colTotalAmountDue = (
                            <td className="px-6 py-4 font-mono text-text-main font-semibold text-sm text-right">
                                {formatTotal(row.total, row.customerId)}
                            </td>
                        );
                        return (
                            <tr key={i} className={cn("hover:bg-bg-app/50 transition-colors bg-bg-card", row.status === "Overdue" && "bg-status-error/5")}>
                                {colStatus}
                                {colDate}
                                {colNumber}
                                {colCustomer}
                                {colTotalAmountDue}
                                {colActions}
                            </tr>
                        );
                    } else if (layoutMode === "all") {
                        const colTotalTotal = (
                            <td className="px-6 py-4 font-mono text-text-main font-semibold text-sm text-right">
                                {formatTotal(row.total, row.customerId)}
                            </td>
                        );
                        const colTotalAmountDue = (
                            <td className="px-6 py-4 font-mono text-text-main font-semibold text-sm text-right">
                                {row.status === "Paid" ? formatTotal(0, row.customerId) : formatTotal(balance, row.customerId)}
                            </td>
                        );
                        return (
                            <tr key={i} className={cn("hover:bg-bg-app/50 transition-colors bg-bg-card", row.status === "Overdue" && "bg-status-error/5")}>
                                {colStatus}
                                {colDate}
                                {colNumber}
                                {colCustomer}
                                {colTotalTotal}
                                {colTotalAmountDue}
                                {colActions}
                            </tr>
                        );
                    } else {
                        // unpaid
                        const colUnpaidByCustomer = (
                            <td className="px-6 py-4 font-mono text-text-main font-semibold text-sm text-right">
                                {row.status === "Paid" ? formatTotal(0, row.customerId) : formatTotal(balance, row.customerId)}
                            </td>
                        );
                        const colTotalAmountDue = (
                            <td className="px-6 py-4 font-mono text-text-main font-semibold text-sm text-right">
                                {formatTotal(row.total, row.customerId)}
                            </td>
                        );
                        return (
                            <tr key={i} className={cn("hover:bg-bg-app/50 transition-colors bg-bg-card", row.status === "Overdue" && "bg-status-error/5")}>
                                {colStatus}
                                {colDue}
                                {colDate}
                                {colNumber}
                                {colCustomer}
                                {colUnpaidByCustomer}
                                {colTotalAmountDue}
                                {colActions}
                            </tr>
                        );
                    }
                }}
            />

            {invoices.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-b-lg border-x border-b border-border-subtle">
                    <Search className="text-gray-300 mb-2" size={32} />
                    <p className="text-text-muted font-medium">No invoices found matching your criteria.</p>
                </div>
            )}

            {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-between items-center px-4 py-4 border-t border-border-subtle bg-white rounded-b-lg">
                    <div className="text-sm text-text-muted font-medium">
                        Page <span className="font-bold text-text-main">{pagination.currentPage}</span> of <span className="font-bold text-text-main">{pagination.totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleFilterChange("page", (pagination.currentPage - 1).toString())}
                            disabled={pagination.currentPage <= 1}
                            className="p-1 px-3 border border-border-subtle rounded-md disabled:opacity-30 disabled:bg-gray-50 font-medium text-sm text-text-main hover:bg-bg-surface transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
                            aria-label="Previous page"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handleFilterChange("page", (pagination.currentPage + 1).toString())}
                            disabled={pagination.currentPage >= pagination.totalPages}
                            className="p-1 px-3 border border-border-subtle rounded-md disabled:opacity-30 disabled:bg-gray-50 font-medium text-sm text-text-main hover:bg-bg-surface transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
                            aria-label="Next page"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
