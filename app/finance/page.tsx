import { auth } from "@/auth";
import TransactionsContent from "@/components/finance/TransactionsContent";
import VendorTransactionsContent from "@/components/finance/VendorTransactionsContent";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
    const session = await auth();
    const company = (session?.user as any)?.company || "blackfox";
    return company === "frameit" ? <VendorTransactionsContent /> : <TransactionsContent />;
}
