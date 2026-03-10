import { getCustomers } from "@/app/actions/customers";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCustomerDisplay } from "@/lib/format";
import { AlertCircle } from 'lucide-react';

export default async function CustomerOverview() {
    // We reuse getCustomers but we could optimize it to take=5
    // For now, fetching first page is fine.
    const customersResult = await getCustomers({ page: 1, limit: 10 });
    const customersData = customersResult.success ? customersResult.data : { customers: [], totalCount: 0 };
    const customers = customersData.customers;

    // Identifying "dormant" or "at risk" could be moved to a specific action
    // But for now, let's just show top customers.
    const topCustomers = customers.slice(0, 5);

    // Quick dormant check on these 10
    const dormantCount = customers.filter(c => {
        const lastLogDate = c.createdAt ? new Date(c.createdAt) : null; // Approximating since we don't have lastLogDate on this payload easily without extra query
        return lastLogDate && (new Date().getTime() - lastLogDate.getTime() > 30 * 24 * 60 * 60 * 1000);
    }).length;

    return (
        <div className="space-y-6">
            <Card title="Top Customers" className="h-full">
                <div className="mt-4 space-y-4">
                    {topCustomers.map((customer, i) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 bg-bg-app rounded-lg border border-border-subtle">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                    {i + 1}
                                </div>
                                <div>
                                    <div className="font-medium text-text-main text-sm">{formatCustomerDisplay(customer)}</div>
                                    <div className="text-xs text-text-muted truncate max-w-[150px]">{customer.email}</div>
                                </div>
                            </div>
                            <Badge variant={customer.status === "Active" ? "success" : "secondary"}>{customer.status}</Badge>
                        </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full mt-2" href="/customers">View All Customers</Button>
                </div>
            </Card>

            {dormantCount > 0 && (
                <Card className="bg-status-warning/5 border-status-warning/20 p-4">
                    <div className="flex items-center gap-3 text-status-warning">
                        <AlertCircle size={20} />
                        <div>
                            <p className="font-bold">{dormantCount} Dormant Customers</p>
                            <p className="text-xs opacity-80">No activity in 30+ days</p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
