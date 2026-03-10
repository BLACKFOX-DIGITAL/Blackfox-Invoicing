"use client";

import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";

interface ServicesTabProps {
    services?: any[];
}

export default function ServicesTab({ services = [] }: ServicesTabProps) {
    return (
        <Card>
            {services.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                    No services found for this customer.
                </div>
            ) : (
                <Table
                    headers={["Service", "Unit", "Rate", "Status"]}
                    data={services}
                    renderRow={(row, i) => (
                        <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                            <td className="px-6 py-4 font-medium text-text-main">{row.name}</td>
                            <td className="px-6 py-4 text-text-muted">{row.unit}</td>
                            <td className="px-6 py-4 font-mono text-text-main">${(row.rate || 0).toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <Badge variant={row.status === "Active" ? "success" : "secondary"}>
                                    {row.status || "Active"}
                                </Badge>
                            </td>
                        </tr>
                    )}
                />
            )}
        </Card>
    );
}
