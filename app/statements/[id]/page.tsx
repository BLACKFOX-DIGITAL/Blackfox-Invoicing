import { getCustomers } from "@/app/actions/customers";
import { getInvoices } from "@/app/actions/invoices";
import { getSettings } from "@/app/actions/settings";

import StatementDetailContent from "@/components/statements/StatementDetailContent";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `Statement - ${id} | Invofox`,
        description: `View statement for customer ${id}.`
    };
}

export default async function StatementDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const startDate = typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : undefined;
    const endDate = typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : undefined;
    const type = typeof resolvedSearchParams.type === 'string' && ['outstanding', 'activity'].includes(resolvedSearchParams.type)
        ? (resolvedSearchParams.type as "outstanding" | "activity")
        : "outstanding";

    const [customersResult, invoicesResult, settingsResult] = await Promise.all([
        getCustomers(),
        getInvoices(),
        getSettings()
    ]);

    const customers = customersResult.success ? customersResult.data.customers : [];
    const customer = customers.find(c => c.id === id);

    if (!customer) {
        notFound();
    }

    const invoices = invoicesResult.success ? invoicesResult.data.invoices : [];
    const settings = settingsResult.success ? settingsResult.data : null;

    // Filter invoices for this customer and date range
    const statementItems = invoices.filter(inv => {
        const matchesCustomer = inv.customerId === id;
        const matchesStart = startDate ? new Date(inv.date) >= new Date(startDate) : true;
        const matchesEnd = endDate ? new Date(inv.date) <= new Date(endDate) : true;
        // Filter logic: Include all logical invoices for a statement
        // Usually statements include unpaid invoices regardless of date, or all invoices within a period.
        // Based on StatementsContent.tsx logic:
        return matchesCustomer && matchesStart && matchesEnd;
    });

    const totalAmount = statementItems.reduce((sum, inv) => {
        if (inv.status === "Paid") return sum;
        return sum + (inv.balanceDue ?? inv.total);
    }, 0);

    const customerCurrency = customer.currency || settings?.currency || "USD";

    // Serialize settings
    const serializedSettings = settings ? {
        ...settings,
    } : null;

    return (
        <StatementDetailContent
            customer={customer}
            items={statementItems}
            settings={serializedSettings}
            totalAmount={totalAmount}
            currency={customerCurrency}
            startDate={startDate}
            endDate={endDate}
            type={type}
        />
    );
}
