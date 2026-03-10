import { getCustomers } from "@/app/actions/customers";
import { getInvoices } from "@/app/actions/invoices";
import { getSettings } from "@/app/actions/settings";
import StatementsContent from "@/components/statements/StatementsContent";

export const dynamic = 'force-dynamic';

export default async function StatementsPage() {
    const [customersResult, invoicesResult, settingsResult] = await Promise.all([
        getCustomers(),
        getInvoices(),
        getSettings()
    ]);

    const customers = customersResult.success ? customersResult.data.customers : [];
    const invoices = invoicesResult.success ? invoicesResult.data.invoices : [];
    const settings = settingsResult.success ? settingsResult.data : null;

    return <StatementsContent customers={customers} invoices={invoices} settings={settings} />;
}
