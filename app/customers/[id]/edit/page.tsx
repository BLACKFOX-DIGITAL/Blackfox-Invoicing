import { getCustomer } from "@/app/actions/customers";
import CustomerEditContent from "./CustomerEditContent";
import { notFound } from "next/navigation";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const customerResult = await getCustomer(id);

    if (!customerResult.success || !customerResult.data) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Error loading customer</h1>
                <p className="font-mono text-sm bg-gray-100 p-4 rounded text-black">
                    ID: {id}<br />
                    Error: {!customerResult.success ? customerResult.error : "No data returned"}
                </p>
            </div>
        );
    }

    return <CustomerEditContent customer={customerResult.data} id={id} />;
}
