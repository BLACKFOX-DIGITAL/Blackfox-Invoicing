import { getInvoices } from "@/app/actions/invoices";
import { getCustomers } from "@/app/actions/customers";
import { getWorkLogs } from "@/app/actions/work-logs";
import { getServices } from "@/app/actions/services";
import { getSettings } from "@/app/actions/settings";
import InvoicesContent from "@/components/invoices/InvoicesContent";

export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function InvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await auth();
    if (!session || !["Owner", "Manager"].includes(session?.user?.role as string)) {
        redirect("/dashboard");
    }
    const resolvedParams = await searchParams;
    const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
    const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined;
    const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined;
    const range = typeof resolvedParams.range === 'string' ? resolvedParams.range : undefined;
    let startDate = typeof resolvedParams.startDate === 'string' ? resolvedParams.startDate : undefined;
    let endDate = typeof resolvedParams.endDate === 'string' ? resolvedParams.endDate : undefined;
    const customerId = typeof resolvedParams.customerId === 'string' ? resolvedParams.customerId : undefined;
    const sortField = typeof resolvedParams.sortField === 'string' ? resolvedParams.sortField : undefined;
    const sortOrder = typeof resolvedParams.sortOrder === 'string' && (resolvedParams.sortOrder === 'asc' || resolvedParams.sortOrder === 'desc') ? resolvedParams.sortOrder : undefined;

    // Calculate dates from range if provided and manual dates are missing
    if (range && !startDate && !endDate) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (range) {
            case 'this-month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
                break;
            case 'last-month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
                break;
            case 'last-3-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
                break;
            case 'last-6-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
                break;
            case 'this-year':
                startDate = new Date(now.getFullYear(), 0, 1).toISOString();
                break;
            case 'last-year':
                startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString();
                endDate = new Date(now.getFullYear() - 1, 11, 31).toISOString();
                break;
        }
    }

    const [invoicesResult, customersResult, workLogsResult, servicesResult, settingsResult] = await Promise.all([
        getInvoices({ page, search, status, startDate, endDate, customerId, sortField, sortOrder }),
        getCustomers(),
        getWorkLogs(),
        getServices(),
        getSettings()
    ]);

    const invoicesData = invoicesResult.success ? invoicesResult.data : {
        invoices: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        stats: { overdue: 0, open: 0, paid: 0, unpaidCount: 0, draftCount: 0 }
    };
    const customersData = customersResult.success ? customersResult.data : { customers: [], totalCount: 0, totalPages: 0, currentPage: 1 };
    const customers = customersData.customers;
    const services = servicesResult.success ? servicesResult.data : [];
    const settings = settingsResult.success ? settingsResult.data : null;

    // Serialize settings to avoid passing Date objects to client components
    const serializedSettings = settings ? {
        ...settings,
    } : null;

    // Filter only unbilled work logs for invoice creation
    const unbilledLogs = workLogsResult.success
        ? workLogsResult.data.logs.filter(log => log.status === "Unbilled")
        : [];

    return (
        <InvoicesContent
            initialInvoicesData={invoicesData}
            customers={customers}
            unbilledLogs={unbilledLogs}
            services={services}
            settings={serializedSettings}
        />
    );
}
