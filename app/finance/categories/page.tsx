import { auth } from "@/auth";
import CategoriesContent from "@/components/finance/CategoriesContent";
import VendorCategoriesContent from "@/components/finance/VendorCategoriesContent";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
    const session = await auth();
    const company = (session?.user as any)?.company || "blackfox";
    return company === "frameit" ? <VendorCategoriesContent /> : <CategoriesContent />;
}
