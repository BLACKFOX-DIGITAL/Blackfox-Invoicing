"use client";

import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { Edit, Trash2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/format";
import SortableHeader from "@/components/ui/SortableHeader";

interface ServiceTableProps {
    services: any[];
    customers?: any[];
    settings?: any;
    sortField: string;
    sortOrder: "asc" | "desc";
    onSort: (field: string) => void;
    onEdit: (service: any) => void;
    onDelete: (id: string) => void;
}

export default function ServiceTable({ services, customers = [], settings, sortField, sortOrder, onSort, onEdit, onDelete }: ServiceTableProps) {
    return (
        <div className="w-full">
            <Table
                headers={[
                    <SortableHeader key="sh_cid" label="Customer ID" sortKey="customerId" currentSort={sortField} currentOrder={sortOrder} onSort={onSort} className="text-white" />,
                    <SortableHeader key="sh_name" label="Service Name" sortKey="name" currentSort={sortField} currentOrder={sortOrder} onSort={onSort} className="text-white" />,
                    <SortableHeader key="sh_rate" label="Rate" sortKey="rate" currentSort={sortField} currentOrder={sortOrder} onSort={onSort} className="text-white justify-end w-full" />,
                    <div key="sh_act" className="text-right w-full font-bold text-white">Actions</div>
                ]}
                alignments={["left", "left", "right", "right"]}
                data={services}
                renderRow={(row, i) => (
                    <tr key={i} className="hover:bg-bg-app/50 transition-colors">
                        <td className="px-6 py-4 pl-8">
                            {row.customerId ? (
                                <Badge variant="info">{row.customerId}</Badge>
                            ) : (
                                <span className="text-text-muted text-sm">Standard</span>
                            )}
                        </td>
                        <td className="px-6 py-4 font-medium text-text-main">{row.name}</td>

                        <td className="px-6 py-4 font-mono text-text-main text-right">
                            {(() => {
                                const globalCurrency = settings?.currency || "USD";
                                const customer = customers.find(c => c.id === row.customerId);
                                const currency = customer?.currency || globalCurrency;
                                const symbol = getCurrencySymbol(currency);
                                return `${symbol}${Number(row.rate).toFixed(2)} ${currency}`;
                            })()}
                        </td>
                        <td className="px-6 py-4 pr-8 text-right">
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => onEdit(row)} className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-app rounded-md transition-colors" title="Edit">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => onDelete(row.id)} className="p-1.5 text-text-muted hover:text-status-error hover:bg-bg-app rounded-md transition-colors" title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                )}
            />
            {services.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    No services found.
                </div>
            )}
        </div>
    );
}
