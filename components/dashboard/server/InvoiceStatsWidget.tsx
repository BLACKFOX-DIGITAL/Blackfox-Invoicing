import { getInvoiceStats } from "@/app/actions/dashboard";
import { getSettings } from "@/app/actions/settings";
import InvoiceStatsChart from "@/components/dashboard/client/InvoiceStatsChart";

export default async function InvoiceStatsWidget() {
    const [statsResult, settingsResult] = await Promise.all([
        getInvoiceStats(),
        getSettings()
    ]);

    const data = statsResult.success ? statsResult.data : [];
    const settings = settingsResult.success ? settingsResult.data : null;
    const currency = settings?.currency || "USD";

    return <InvoiceStatsChart data={data} currency={currency} />;
}
