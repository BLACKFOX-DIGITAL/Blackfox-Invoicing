import { getServices } from "@/app/actions/services";
import { getCustomers } from "@/app/actions/customers";
import { getMonthlyImageCount, getLastMonthImageCount, getYearlyImageCount } from "@/app/actions/work-logs";
import { getSettings } from "@/app/actions/settings";
import ServicesContent from "@/components/services/ServicesContent";

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
    const [
        servicesResult,
        customersResult,
        imageCountResult,
        lastMonthImageCountResult,
        yearlyImageCountResult,
        settingsResult
    ] = await Promise.all([
        getServices(),
        getCustomers(),
        getMonthlyImageCount(),
        getLastMonthImageCount(),
        getYearlyImageCount(),
        getSettings()
    ]);

    const services = servicesResult.success ? servicesResult.data : [];
    const customers = customersResult.success ? customersResult.data.customers : [];
    const monthlyImageCount = imageCountResult.success ? imageCountResult.data : 0;
    const lastMonthImageCount = lastMonthImageCountResult.success ? lastMonthImageCountResult.data : 0;
    const yearlyImageCount = yearlyImageCountResult.success ? yearlyImageCountResult.data : 0;
    const settings = settingsResult.success ? settingsResult.data : null;

    // Serialize settings to avoid passing Date objects to client components
    const serializedSettings = settings ? {
        ...settings,
    } : null;

    return (
        <ServicesContent
            initialServices={services}
            customers={customers}
            monthlyImageCount={monthlyImageCount}
            lastMonthImageCount={lastMonthImageCount}
            yearlyImageCount={yearlyImageCount}
            settings={serializedSettings}
        />
    );
}
