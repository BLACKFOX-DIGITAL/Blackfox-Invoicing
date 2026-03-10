import { getReportKPIs } from "@/app/actions/reports";
import Card from "@/components/ui/Card";
import { DollarSign, TrendingUp, Users, Image as ImageIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrencySymbol } from "@/lib/format";

export default async function ReportKPIs({ searchParams }: { searchParams: { startDate?: string; endDate?: string } }) {
    const [result, settings] = await Promise.all([
        getReportKPIs(searchParams),
        prisma.settings.findFirst()
    ]);
    const data = result.success ? result.data : { totalRevenue: 0, avgRevenuePerCustomer: 0, totalWorkUnits: 0, activeCustomers: 0 };
    const symbol = getCurrencySymbol(settings?.currency || "USD");

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <DollarSign size={20} />
                    </div>
                </div>
                <div className="mt-2">
                    <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-text-main">{symbol}{data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </Card>

            <Card className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-status-success/10 rounded-lg text-status-success">
                        <TrendingUp size={20} />
                    </div>
                </div>
                <div className="mt-2">
                    <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Avg. Revenue/Customer</p>
                    <p className="text-2xl font-bold text-text-main">{symbol}{data.avgRevenuePerCustomer.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </Card>

            <Card className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-status-warning/10 rounded-lg text-status-warning">
                        <ImageIcon size={20} />
                    </div>
                </div>
                <div className="mt-2">
                    <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Total Work Units</p>
                    <p className="text-2xl font-bold text-text-main">{data.totalWorkUnits.toLocaleString()}</p>
                </div>
            </Card>

            <Card className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                        <Users size={20} />
                    </div>
                </div>
                <div className="mt-2">
                    <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Active Customers</p>
                    <p className="text-2xl font-bold text-text-main">{data.activeCustomers}</p>
                </div>
            </Card>
        </div>
    );
}
