import { getCustomers } from "@/app/actions/customers";
import CustomersContent from "@/components/customers/CustomersContent";

export const dynamic = 'force-dynamic';

export default async function CustomersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedParams = await searchParams;
    const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
    const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined;
    const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined;

    const result = await getCustomers({ page, search, status });
    const customersData = result.success ? result.data : { customers: [], totalCount: 0, totalPages: 0, currentPage: 1 };

    return <CustomersContent initialCustomersData={customersData} />;
}
