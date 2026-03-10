import { getTopCustomers } from "@/app/actions/reports";
import Card from "@/components/ui/Card";
import { getCurrencySymbol } from "@/lib/format";
import { prisma } from "@/lib/db";

export default async function TopCustomersWidget({ searchParams }: { searchParams: { startDate?: string; endDate?: string } }) {
    const [result, settings] = await Promise.all([
        getTopCustomers({ ...searchParams, limit: 10 }),
        prisma.settings.findFirst()
    ]);
    const customers = result.success ? result.data : [];
    const symbol = getCurrencySymbol(settings?.currency || "USD");

    return (
        <Card className="p-0 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-border-subtle">
                <h3 className="text-sm font-bold text-text-main">Top Customers</h3>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-bg-surface text-text-muted font-medium">
                        <tr>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3 text-right">Invoices</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {customers.map((c, i) => (
                            <tr key={i} className="group hover:bg-bg-surface-hover transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-text-main">{c.name}</div>
                                    <div className="text-xs text-text-muted">{c.email}</div>
                                </td>
                                <td className="px-4 py-3 text-right text-text-muted">{c.count}</td>
                                <td className="px-4 py-3 text-right font-medium text-text-main">
                                    {symbol}{c.revenue.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-text-muted italic">
                                    No data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
