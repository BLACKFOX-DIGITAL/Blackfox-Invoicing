import { getRevenueSeries } from "@/app/actions/reports";
import ReportRevenueChart from "@/components/reports/client/ReportRevenueChart";
import { prisma } from "@/lib/db";
import { getCurrencySymbol } from "@/lib/format";

export default async function RevenueTrendsWidget({ searchParams }: { searchParams: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month" } }) {
    const [result, settings] = await Promise.all([
        getRevenueSeries(searchParams),
        prisma.settings.findFirst()
    ]);
    const data = result.success ? result.data : [];
    const symbol = getCurrencySymbol(settings?.currency || "USD");

    return (
        <div className="h-full">
            <ReportRevenueChart data={data} groupBy={searchParams.groupBy || "month"} symbol={symbol} />
        </div>
    );
}
