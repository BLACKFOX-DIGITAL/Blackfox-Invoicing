import { auth } from "@/auth";
import ProfitLossContent from "@/components/finance/ProfitLossContent";
import VendorProfitLossContent from "@/components/finance/VendorProfitLossContent";

export const dynamic = "force-dynamic";

export default async function ProfitLossPage() {
    const session = await auth();
    const company = (session?.user as any)?.company || "blackfox";
    if (company !== "blackfox") {
        return <VendorProfitLossContent />;
    }
    return <ProfitLossContent />;
}
