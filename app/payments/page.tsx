import { getAllPayments } from "@/app/actions/payments";

export const dynamic = 'force-dynamic';
import { getSettings } from "@/app/actions/settings";
import PaymentsContent from "@/components/payments/PaymentsContent";

export default async function PaymentsPage() {
    const [paymentsResult, settingsResult] = await Promise.all([
        getAllPayments(),
        getSettings()
    ]);

    const payments = paymentsResult.success ? paymentsResult.data : [];
    const settings = settingsResult.success ? settingsResult.data : null;

    // Serialize settings to avoid passing Date objects to client components
    const serializedSettings = settings ? {
        ...settings,
    } : null;

    const formattedPayments = payments.map(p => ({
        id: `PAY-${p.id}`, // Formatting for UI
        customer: p.customerName,
        invoice: p.invoiceId,
        amount: p.amount,
        method: p.method,
        date: p.date,
        status: p.status,
        invoiceStatus: p.invoiceStatus,
        currency: p.currency
    }));

    return <PaymentsContent payments={formattedPayments} settings={serializedSettings} />;
}
