"use client";

import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Link from "next/link";

interface InvoicesTabProps {
    invoices?: any[];
}

export default function InvoicesTab({ invoices = [] }: InvoicesTabProps) {
    return (
        <Card>
            {invoices.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                    No invoices found for this customer.
                </div>
            ) : (
                <Table
                    headers={["Invoice ID", "Date", "Total", "Status", ""]}
                    data={invoices}
                    renderRow={(row, i) => (
                        <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                            <td className="px-6 py-4 font-mono text-primary font-medium">
                                <Link href={`/invoices/${row.id}`} className="hover:underline">
                                    {row.id}
                                </Link>
                            </td>
                            <td className="px-6 py-4 text-text-muted">{row.date}</td>
                            <td className="px-6 py-4 font-mono font-bold text-text-main">${(row.total || 0).toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <Badge variant={row.status === "Paid" ? "success" : row.status === "Sent" ? "default" : row.status === "Overdue" ? "error" : "warning"}>
                                    {row.status}
                                </Badge>
                            </td>
                            <td className="px-6 py-4">
                                <Link href={`/invoices/${row.id}`} className="text-primary text-sm hover:underline">
                                    View
                                </Link>
                            </td>
                        </tr>
                    )}
                />
            )}
        </Card>
    );
}
