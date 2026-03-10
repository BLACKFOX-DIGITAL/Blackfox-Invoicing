"use client";

import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";

interface PaymentsTabProps {
    invoices?: any[];
}

export default function PaymentsTab({ invoices = [] }: PaymentsTabProps) {
    // Filter paid invoices as "payments"
    const payments = invoices.filter(inv => inv.status === "Paid").map(inv => ({
        id: `PAY-${inv.id}`,
        invoiceId: inv.id,
        amount: inv.total,
        date: inv.date,
        method: "Bank Transfer" // Default method since we don't have this data
    }));

    return (
        <Card>
            {payments.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                    No payments recorded for this customer.
                </div>
            ) : (
                <Table
                    headers={["Payment ID", "Invoice", "Amount", "Date", "Method"]}
                    data={payments}
                    renderRow={(row, i) => (
                        <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                            <td className="px-6 py-4 font-mono text-primary font-medium">{row.id}</td>
                            <td className="px-6 py-4 font-mono text-text-muted">{row.invoiceId}</td>
                            <td className="px-6 py-4 font-mono font-bold text-status-success">${(row.amount || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 text-text-muted">{row.date}</td>
                            <td className="px-6 py-4">
                                <Badge variant="secondary">{row.method}</Badge>
                            </td>
                        </tr>
                    )}
                />
            )}
        </Card>
    );
}
