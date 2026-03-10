import { getWorkLogs } from "@/app/actions/work-logs";
import { getCustomers } from "@/app/actions/customers";
import { getServices } from "@/app/actions/services";
import { getSettings } from "@/app/actions/settings";
import WorkLogsContent from "@/components/work-logs/WorkLogsContent";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

// Define searchParams type for the page
export default async function WorkLogsPage({
    searchParams
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        tab?: string;
        customerId?: string;
        from?: string;
        to?: string;
    }>
}) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";
    // Map 'tab' from URL to 'status' for backend
    // URL tabs: Unbilled | Billed | Archived
    // Backend status: Unbilled | Billed | Archived
    const status = (params.tab as any) || "Unbilled";
    const customerId = params.customerId || undefined;
    const dateFrom = params.from || undefined;
    const dateTo = params.to || undefined;

    const session = await auth();
    const userRole = session?.user?.role || "Worker";

    const [logsResult, customersResult, servicesResult, settingsResult] = await Promise.all([
        getWorkLogs({
            page,
            limit: 50,
            search,
            status,
            customerId,
            dateFrom,
            dateTo
        }),
        getCustomers(),
        getServices(),
        getSettings()
    ]);

    const logsData = logsResult.success ? logsResult.data : { logs: [], totalCount: 0, totalPages: 0 };
    const customers = customersResult.success ? customersResult.data.customers : [];
    const services = servicesResult.success ? servicesResult.data : [];
    const settings = settingsResult.success ? settingsResult.data : null;

    // Serialize settings to avoid passing Date objects to client components
    const serializedSettings = settings ? {
        ...settings,
    } : null;

    return (
        <WorkLogsContent
            initialLogs={logsData.logs}
            pagination={{
                currentPage: page,
                totalPages: logsData.totalPages,
                totalCount: logsData.totalCount
            }}
            customers={customers}
            services={services}
            settings={serializedSettings}
            userRole={userRole}
        />
    );
}
