"use client";

import { formatDate } from "@/lib/format";

import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";

interface WorkLogsTabProps {
    workLogs?: any[];
    services?: any[];
}

export default function WorkLogsTab({ workLogs = [], services = [] }: WorkLogsTabProps) {
    const getServiceName = (serviceId: string) => {
        const service = services.find(s => s.id?.toString() === serviceId?.toString());
        return service?.name || serviceId;
    };

    return (
        <Card>
            {workLogs.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                    No work logs found for this customer.
                </div>
            ) : (
                <Table
                    headers={["Date", "Service", "Description", "Qty", "Total", "Status"]}
                    data={workLogs}
                    renderRow={(row, i) => (
                        <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                            <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                                <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                                    {formatDate(row.date)}
                                </td>
                            </td>
                            <td className="px-6 py-4 font-medium text-text-main">{getServiceName(row.serviceId)}</td>
                            <td className="px-6 py-4 text-text-muted max-w-xs truncate">{row.description}</td>
                            <td className="px-6 py-4 font-mono text-text-main">{row.quantity}</td>
                            <td className="px-6 py-4 font-mono font-bold text-text-main">${(row.total || 0).toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <Badge variant={row.status === "Billed" ? "success" : row.status === "Paid" ? "secondary" : "warning"}>
                                    {row.status}
                                </Badge>
                            </td>
                        </tr>
                    )}
                />
            )}
        </Card>
    );
}
