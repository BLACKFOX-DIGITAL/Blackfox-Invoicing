import { getRevenueTrend } from "@/app/actions/dashboard";
import { getSettings } from "@/app/actions/settings";
import RevenueChart from "@/components/dashboard/client/RevenueChart";

export default async function RevenueChartWidget() {
    const [trendResult, settingsResult] = await Promise.all([
        getRevenueTrend(),
        getSettings()
    ]);

    const data = trendResult.success ? trendResult.data : [];
    const settings = settingsResult.success ? settingsResult.data : null;
    const currency = settings?.currency || "USD";

    return <RevenueChart data={data} currency={currency} />;
}
