import { getCustomer } from "@/app/actions/customers";
import { getInvoices } from "@/app/actions/invoices";
import { getWorkLogs } from "@/app/actions/work-logs";
import { getServices } from "@/app/actions/services";
import CustomerDetailContent from "./components/CustomerDetailContent";
import { notFound } from "next/navigation";
import { Metadata } from "next";


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const customer = await getCustomer(id);

    if (!customer.success || !customer.data) {
        return {
            title: "Customer Not Found | Invofox",
            description: "The requested customer could not be found."
        };
    }

    return {
        title: `${customer.data.name} | Customer Details`,
        description: `View details for ${customer.data.name}, including invoices, services, and work logs.`
    };
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const customerResult = await getCustomer(id);

    if (!customerResult.success || !customerResult.data) {
        notFound();
    }

    // Get related data for this customer
    const [invoicesResult, workLogsResult, servicesResult] = await Promise.all([
        getInvoices({ customerId: id, limit: 200 }),      // QA-07: capped from 1000
        getWorkLogs({ customerId: id, limit: 200 }),      // QA-07: capped from 5000
        getServices()
    ]);


    const customer = customerResult.data;

    // Invoices returns { invoices: [], ... }
    const invoices = invoicesResult.success ? invoicesResult.data.invoices : [];

    // WorkLogs returns { logs: [], ... }
    // We already filtered by customerId on server, but safety check doesn't hurt.
    const workLogs = workLogsResult.success ? workLogsResult.data.logs : [];

    // Services returns []
    const services = servicesResult.success ? servicesResult.data : [];


    return (
        <CustomerDetailContent
            customer={customer}
            id={id}
            invoices={invoices}
            workLogs={workLogs}
            services={services}
        />
    );
}
