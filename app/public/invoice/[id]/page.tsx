import { getPublicInvoice } from "@/app/actions/invoices";
import PublicInvoiceDetailContent from "@/components/invoices/PublicInvoiceDetailContent";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getSettings } from "@/app/actions/settings";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const token = typeof resolvedSearchParams.token === 'string' ? resolvedSearchParams.token : "";

    // We shouldn't hit the DB in metadata if not strictly necessary, 
    // but we can just use the ID for the title.
    return {
        title: `Invoice #${id} | Invofox`,
        description: `View invoice #${id}.`
    };
}

export default async function PublicInvoicePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const id = resolvedParams.id;
    const token = typeof resolvedSearchParams.token === 'string' ? resolvedSearchParams.token : "";

    if (!token) {
        notFound();
    }

    const [invoiceResult, settingsResult] = await Promise.all([
        getPublicInvoice(id, token),
        getSettings(),
    ]);

    if (!invoiceResult.success || !invoiceResult.data) {
        // Render 404 if invalid token or non-existent invoice
        notFound();
    }

    const settings = settingsResult.success ? settingsResult.data : null;

    // Serialize settings to avoid passing Date objects to client components
    const serializedSettings = settings ? {
        ...settings,
    } : null;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <PublicInvoiceDetailContent
                invoice={invoiceResult.data}
                items={invoiceResult.data.items}
                customer={invoiceResult.data.customer}
                settings={serializedSettings}
            />
        </div>
    );
}
