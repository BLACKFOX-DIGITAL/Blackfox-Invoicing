import { getInvoice } from "@/app/actions/invoices";
import InvoiceDetailContent from "@/components/invoices/InvoiceDetailContent";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getCustomers } from "@/app/actions/customers";
import { getSettings } from "@/app/actions/settings";
import { getWorkLogs } from "@/app/actions/work-logs";
import { getServices } from "@/app/actions/services";


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const invoice = await getInvoice(id);

    if (!invoice.success || !invoice.data) {
        return {
            title: "Invoice Not Found | Invofox",
            description: "The requested invoice could not be found."
        };
    }

    return {
        title: `Invoice #${invoice.data.id} - ${invoice.data.clientName} | Invofox`,
        description: `View invoice #${invoice.data.id} for ${invoice.data.clientName}. Status: ${invoice.data.status}.`
    };
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const [invoiceResult, settingsResult, workLogsResult, servicesResult] = await Promise.all([
        getInvoice(id),
        getSettings(),
        getWorkLogs(),
        getServices()
    ]);

    if (!invoiceResult.success || !invoiceResult.data) {
        notFound();
    }

    // Fetch all customers for the generator
    const customersResult = await getCustomers();
    const customers = customersResult.success ? customersResult.data.customers : [];

    // Find the specific customer for this invoice
    const customer = customers.find(c => c.id === invoiceResult.data.customerId) || null;
    const settings = settingsResult.success ? settingsResult.data : null;
    const services = servicesResult.success ? servicesResult.data : [];

    // Pass ALL unbilled work logs (InvoiceGenerator will filter them/select them)
    const workLogs = workLogsResult.success
        ? workLogsResult.data.logs.filter(log => log.status === "Unbilled")
        : [];

    // Serialize settings to avoid passing Date objects to client components
    const serializedSettings = settings ? {
        ...settings,
    } : null;

    // The invoice already includes its items from the getInvoice action
    return (
        <InvoiceDetailContent
            invoice={invoiceResult.data}
            items={invoiceResult.data.items}
            customer={customer}
            customers={customers}
            workLogs={workLogs}
            services={services}
            settings={serializedSettings}
        />
    );
}
