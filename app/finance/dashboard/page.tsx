import { auth } from "@/auth";
import FinanceDashboardContent from "@/components/finance/FinanceDashboardContent";
import VendorFinanceDashboardContent from "@/components/finance/VendorFinanceDashboardContent";

export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
    const session = await auth();
    const company = (session?.user as any)?.company || "blackfox";
    // Vendor users don't have a separate dashboard; show their transactions instead
    if (company !== "blackfox") {
        return <VendorFinanceDashboardContent />;
    }
    return <FinanceDashboardContent />;
}
