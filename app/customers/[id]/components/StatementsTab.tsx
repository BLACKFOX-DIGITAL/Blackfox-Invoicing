"use client";

import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";

interface StatementsTabProps {
    invoices?: any[];
}

export default function StatementsTab({ invoices = [] }: StatementsTabProps) {
    // Group invoices by month for statements
    const statementPeriods = invoices.reduce((acc: any[], inv: any) => {
        const monthYear = new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        const existing = acc.find(s => s.period === monthYear);
        if (existing) {
            existing.invoices.push(inv);
            existing.total += inv.total || 0;
        } else {
            acc.push({ period: monthYear, invoices: [inv], total: inv.total || 0 });
        }
        return acc;
    }, []);

    return (
        <Card>
            {statementPeriods.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                    No statements available for this customer.
                </div>
            ) : (
                <Table
                    headers={["Statement Period", "Invoice Count", "Total Amount", "Status"]}
                    data={statementPeriods}
                    renderRow={(row, i) => (
                        <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                            <td className="px-6 py-4 font-medium text-text-main">{row.period}</td>
                            <td className="px-6 py-4 text-text-muted">{row.invoices.length} invoice(s)</td>
                            <td className="px-6 py-4 font-mono font-bold text-text-main">${row.total.toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <Badge variant="secondary">Generated</Badge>
                            </td>
                        </tr>
                    )}
                />
            )}
        </Card>
    );
}
