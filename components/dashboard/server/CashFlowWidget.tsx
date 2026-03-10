import { getCashFlowForecast } from "@/app/actions/dashboard";
import { getSettings } from "@/app/actions/settings";
import CashFlowChart from "@/components/dashboard/client/CashFlowChart";

export default async function CashFlowWidget() {
    const [forecastResult, settingsResult] = await Promise.all([
        getCashFlowForecast(),
        getSettings()
    ]);

    const data = forecastResult.success ? forecastResult.data : [];
    const settings = settingsResult.success ? settingsResult.data : null;
    const currency = settings?.currency || "USD";

    return <CashFlowChart data={data} currency={currency} />;
}
