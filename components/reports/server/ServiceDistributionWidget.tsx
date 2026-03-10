import { getServiceDistribution } from "@/app/actions/reports";
import ServiceDistributionChart from "@/components/reports/client/ServiceDistributionChart";
import Card from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { getCurrencySymbol } from "@/lib/format";

export default async function ServiceDistributionWidget({ searchParams }: { searchParams: { startDate?: string; endDate?: string } }) {
    const [result, settings] = await Promise.all([
        getServiceDistribution(searchParams),
        prisma.settings.findFirst()
    ]);
    const data = result.success ? result.data : [];
    const symbol = getCurrencySymbol(settings?.currency || "USD");

    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-text-main mb-4">Top Services by Revenue</h3>
            <div className="flex-1 w-full min-h-[250px]">
                <ServiceDistributionChart data={data} symbol={symbol} />
            </div>
        </Card>
    );
}
