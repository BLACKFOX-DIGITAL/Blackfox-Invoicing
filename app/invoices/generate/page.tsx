import { getCustomers } from "@/app/actions/customers";
import { getWorkLogs } from "@/app/actions/work-logs";
import { getServices } from "@/app/actions/services";
import { getSettings } from "@/app/actions/settings";
import GenerateInvoiceContent from "./GenerateInvoiceContent";

export const dynamic = 'force-dynamic';

export default async function GenerateInvoicePage() {
    const [customersResult, workLogsResult, servicesResult, settingsResult] = await Promise.all([
        getCustomers(),
        getWorkLogs({ status: "Unbilled", limit: 5000 }),
        getServices(),
        getSettings()
    ]);

    const customers = customersResult.success ? customersResult.data.customers : [];
    const services = servicesResult.success ? servicesResult.data : [];
    const settings = settingsResult.success ? settingsResult.data : null;

    const serializedSettings = settings ? {
        ...settings,
    } : null;

    const unbilledLogs = workLogsResult.success
        ? workLogsResult.data.logs.filter(log => log.status === "Unbilled")
        : [];

    return (
        <GenerateInvoiceContent
            customers={customers}
            unbilledLogs={unbilledLogs}
            services={services}
            settings={serializedSettings}
        />
    );
}
