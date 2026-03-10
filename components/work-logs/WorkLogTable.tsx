"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { Edit2, Trash2, Filter, Trash } from "lucide-react";
import { useRole } from "@/lib/roleContext";
import { getCurrencySymbol, formatCustomerDisplay, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import SortableHeader from "@/components/ui/SortableHeader";


interface WorkLogTableProps {
    logs: any[];
    customers?: any[];
    services?: any[];
    settings?: any;
    onEdit: (log: any) => void;
    onDelete: (id: string | string[]) => void;
}

export default function WorkLogTable({
    logs,
    customers = [],
    services = [],
    settings,
    onEdit,
    onDelete
}: WorkLogTableProps) {
    const { role, company } = useRole();
    const isWorker = role === "Worker";
    const hideFinancials = role === "Worker" || role === "VendorWorker" || role === "VendorManager" || company === "frameit";

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const sortField = searchParams.get("wlSortField") || "date";
    const sortOrder = searchParams.get("wlSortOrder") as "asc" | "desc" || "desc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("wlSortField", field);
        params.set("wlSortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    const getServiceName = (serviceId: string) => {
        const service = services.find(s => s.id?.toString() === serviceId?.toString());
        return service?.name || "Unknown";
    };

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Only allow selecting logs that are not billed
    const selectableLogs = logs.filter(l => l.status !== "Billed");

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(selectableLogs.map(l => l.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        onDelete(Array.from(selectedIds).map(id => id.toString()));
        setSelectedIds(new Set()); // Reset selections after firing delete event
    };

    // Sorting
    const sortedLogs = [...logs].sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "service") {
            valA = getServiceName(a.serviceId).toLowerCase();
            valB = getServiceName(b.serviceId).toLowerCase();
        } else if (sortField === "rate") {
            valA = typeof a.rate === 'string' ? parseFloat(a.rate.replace(/[^0-9.]/g, '')) : (a.rate || 0);
            valB = typeof b.rate === 'string' ? parseFloat(b.rate.replace(/[^0-9.]/g, '')) : (b.rate || 0);
        } else if (sortField === "total") {
            const rateA = typeof a.rate === 'string' ? parseFloat(a.rate.replace(/[^0-9.]/g, '')) : (a.rate || 0);
            const rateB = typeof b.rate === 'string' ? parseFloat(b.rate.replace(/[^0-9.]/g, '')) : (b.rate || 0);
            valA = rateA * (a.quantity || 0);
            valB = rateB * (b.quantity || 0);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between flex-wrap gap-2 items-center px-1">
                <div className="text-sm text-text-muted font-medium whitespace-nowrap">
                    Showing {logs.length} logs
                </div>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm font-medium text-text-main">
                            {selectedIds.size} selected
                        </span>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-status-error/10 text-status-error hover:bg-status-error/20 rounded-md text-sm font-medium transition-colors"
                        >
                            <Trash size={14} />
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            <Table
                headers={[
                    <div key="select-all" className="flex items-center">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border-default bg-bg-surface text-primary focus:ring-primary focus:ring-offset-bg-card transition-colors cursor-pointer"
                            checked={selectableLogs.length > 0 && selectedIds.size === selectableLogs.length}
                            onChange={handleSelectAll}
                            disabled={selectableLogs.length === 0}
                        />
                    </div>,
                    <SortableHeader key="sh_date" label="Date" sortKey="date" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                    <SortableHeader key="sh_cid" label="Customer ID" sortKey="customerId" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                    <SortableHeader key="sh_srv" label="Service" sortKey="service" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                    <SortableHeader key="sh_qty" label="Qty" sortKey="quantity" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                    ...(hideFinancials ? [] : [
                        <SortableHeader key="sh_rate" label="Rate" sortKey="rate" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                        <SortableHeader key="sh_tot" label="Total" sortKey="total" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />
                    ]),
                    <SortableHeader key="sh_stat" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                    <div key="sh_act" className="font-bold flex justify-end text-white">ACTIONS</div>
                ]}
                data={sortedLogs}
                renderRow={(row, i) => {
                    const service = getServiceName(row.serviceId);
                    const rate = typeof row.rate === 'string' ? parseFloat(row.rate.replace(/[^0-9.]/g, '')) : (row.rate || 0);
                    const quantity = row.quantity || 0;
                    const total = rate * quantity;

                    return (
                        <tr key={row.id || i} className={cn(
                            "group hover:bg-bg-app/50 transition-colors",
                            row.status === "Overdue" && "bg-status-error/5",
                            selectedIds.has(row.id) && "bg-primary/5 hover:bg-primary/10"
                        )}>
                            <td className="px-6 py-4">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-border-default bg-bg-surface text-primary focus:ring-primary focus:ring-offset-bg-card transition-colors cursor-pointer"
                                    checked={selectedIds.has(row.id)}
                                    onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                                    disabled={row.status === "Billed"}
                                    title={row.status === "Billed" ? "Billed logs cannot be deleted" : "Select row"}
                                />
                            </td>
                            <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                                {formatDate(row.date)}
                            </td>
                            <td className="px-6 py-4 font-medium text-text-main">{row.customerId}</td>
                            <td className="px-6 py-4 font-medium text-text-main">
                                <div className="flex flex-col">
                                    <span>{service}</span>
                                    {row.description && <span className="text-[10px] text-text-muted font-normal italic">{row.description}</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-text-main">{row.quantity}</td>

                            {!hideFinancials && (
                                <>
                                    <td className="px-6 py-4 font-mono text-text-muted">
                                        {(() => {
                                            const globalCurrency = settings?.currency || "USD";
                                            const customer = customers.find(c => c.id === row.customerId);
                                            const currency = customer?.currency || globalCurrency;
                                            const symbol = getCurrencySymbol(currency);
                                            return `${symbol}${rate.toFixed(2)} ${currency}`;
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-text-main">
                                        {(() => {
                                            const globalCurrency = settings?.currency || "USD";
                                            const customer = customers.find(c => c.id === row.customerId);
                                            const currency = customer?.currency || globalCurrency;
                                            const symbol = getCurrencySymbol(currency);
                                            return `${symbol}${total.toFixed(2)} ${currency}`;
                                        })()}
                                    </td>
                                </>
                            )}

                            <td className="px-6 py-4">
                                <Badge variant={row.status === "Paid" ? "success" : row.status === "Billed" ? "info" : "warning"}>
                                    {row.status}
                                </Badge>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => onEdit(row)} className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-app rounded-md transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => onDelete(row.id)} className="p-1.5 text-text-muted hover:text-status-error hover:bg-bg-app rounded-md transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
            />

            {logs.length === 0 && (
                <div className="py-12 text-center text-text-muted">
                    No work logs found.
                </div>
            )}
        </div>
    );
}
