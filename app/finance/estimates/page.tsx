import { auth } from "@/auth";
import EstimatesContent from "@/components/finance/EstimatesContent";
import VendorEstimatesContent from "@/components/finance/VendorEstimatesContent";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
    const session = await auth();
    const company = (session?.user as any)?.company || "blackfox";
    if (company !== "blackfox") {
        return <VendorEstimatesContent />;
    }
    return <EstimatesContent />;
}
