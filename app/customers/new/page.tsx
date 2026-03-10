"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import CustomerForm from "@/components/forms/CustomerForm";
import { ArrowLeft } from "lucide-react";
import { createCustomer } from "@/app/actions/customers";
import { useToast } from "@/components/ui/ToastProvider";

export default function NewCustomerPage() {
    const router = useRouter();
    const toast = useToast();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: any) => {
        setError(null);

        const result = await createCustomer({
            id: data.id || `CUST-${Date.now()}`,
            name: data.name,
            email: data.email,
            companySendInvoices: data.sendInvoicesToCompanyEmail,
            website: data.website,
            address: data.address,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country,
            contactFirstName: data.primaryContact?.firstName,
            contactMiddleName: data.primaryContact?.middleName,
            contactLastName: data.primaryContact?.lastName,
            contactEmail: data.primaryContact?.email,
            contactRole: data.primaryContact?.role,
            contactSendInvoices: data.primaryContact?.sendInvoices,
            currency: data.currency,
            taxId: data.taxId,
            phone: data.primaryContact?.phone,
            status: data.status ? "Active" : "Inactive",
            paymentTerms: data.billing?.paymentTerms,
            additionalContacts: data.additionalContacts,
            paymentMethodId: data.paymentMethodId ? Number(data.paymentMethodId) : undefined // Force number cast
        });

        if (result.success && data.addresses && data.addresses.length > 0) {
            const { createCustomerAddress } = await import("@/app/actions/customers");
            for (const addr of data.addresses) {
                await createCustomerAddress({
                    customerId: result.data.id,
                    companyName: addr.companyName,
                    address: addr.address,
                    taxId: addr.taxId,
                    contactFirstName: addr.contactFirstName,
                    contactMiddleName: addr.contactMiddleName,
                    contactLastName: addr.contactLastName,
                    contactEmail: addr.contactEmail,
                    contactPhone: addr.contactPhone,
                    website: addr.website
                });
            }
        }

        if (result.success) {
            toast.success("Customer created successfully!");
            startTransition(() => {
                router.push('/customers');
                router.refresh();
            });
        } else {
            setError(result.error || "Failed to create customer");
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => window.history.back()} className="text-text-muted hover:text-text-main flex items-center gap-2">
                    <ArrowLeft size={18} /> Back
                </button>
                <h1 className="text-2xl font-bold text-text-main">Add New Customer</h1>
            </div>

            {error && (
                <div className="bg-status-error/10 border border-status-error/20 text-status-error px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <CustomerForm onSubmit={handleSubmit} />
        </div>
    );
}
