"use client";

import CustomerForm from "@/components/forms/CustomerForm";
import { ArrowLeft } from "lucide-react";
import { updateCustomer } from "@/app/actions/customers";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui/ToastProvider";

interface CustomerEditContentProps {
    customer: any;
    id: string;
}

export default function CustomerEditContent({ customer, id }: CustomerEditContentProps) {
    const router = useRouter();
    const toast = useToast();
    const [isPending, startTransition] = useTransition();

    const defaultValues = {
        // 1. Basic Info
        id: id,
        name: customer.name || "Unknown Customer",
        email: customer.email || "",
        sendInvoicesToCompanyEmail: customer.companySendInvoices ?? false,
        website: customer.website || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zip: customer.zip || "",
        country: customer.country || "US",
        currency: customer.currency || "USD",
        taxId: customer.taxId || "",
        paymentMethodId: customer.paymentMethodId ?? undefined, // Load existing ID or undefined
        status: customer.status === "Active",
        notes: "",

        // 2. Primary Contact
        primaryContact: {
            firstName: customer.contactFirstName || "",
            middleName: customer.contactMiddleName || "",
            lastName: customer.contactLastName || "",
            role: customer.contactRole || "",
            email: customer.contactEmail || "", // Load from contactEmail column
            phone: customer.phone || "",
            sendInvoices: customer.contactSendInvoices ?? false,
            preferredMethod: "Email" as const,
        },

        // 3. Additional Contacts
        additionalContacts: Array.isArray(customer.additionalContacts) ? customer.additionalContacts : [],

        // 4. Billing Profiles
        addresses: Array.isArray(customer.addresses) ? customer.addresses : [],

        // 4. Billing
        billing: {
            emailOverride: customer.email || "",
            paymentTerms: customer.paymentTerms ?? 30,
            language: "English",
            attachLogs: true
        }
    };

    const systemMetadata = {
        createdAt: customer.createdAt,
        lastInvoice: customer.invoices?.[0] ? {
            id: customer.invoices[0].id,
            date: customer.invoices[0].date
        } : undefined,
        outstandingBalance: customer.outstandingBalance || 0
    };

    const handleSubmit = (data: any) => {
        startTransition(async () => {
            const result = await updateCustomer(id, {
                name: data.name,
                email: data.email,
                companySendInvoices: data.sendInvoicesToCompanyEmail,
                website: data.website,
                address: data.address,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
                status: data.status ? "Active" : "Inactive",
                currency: data.currency,
                paymentTerms: data.billing?.paymentTerms,
                additionalContacts: data.additionalContacts,
                contactFirstName: data.primaryContact?.firstName,
                contactMiddleName: data.primaryContact?.middleName,
                contactLastName: data.primaryContact?.lastName,
                contactEmail: data.primaryContact?.email, // Now maps to contactEmail!
                contactRole: data.primaryContact?.role,
                contactSendInvoices: data.primaryContact?.sendInvoices,
                phone: data.primaryContact?.phone,
                taxId: data.taxId,
                paymentMethodId: data.paymentMethodId ? Number(data.paymentMethodId) : undefined // Force number cast
            });

            // Handle addresses independently (syncing them with the database)
            const { createCustomerAddress, updateCustomerAddress, deleteCustomerAddress } = await import("@/app/actions/customers");

            if (result.success && data.addresses) {
                // Determine which addresses were edited/created
                const existingAddresses = customer.addresses || [];
                const submittedAddresses = data.addresses;

                // 1. Create new (no ID) or Update existing (has ID)
                for (const addr of submittedAddresses) {
                    if (!addr.id) {
                        await createCustomerAddress({
                            customerId: id,
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
                    } else {
                        await updateCustomerAddress(addr.id, {
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

                // 2. Delete removed ones
                const submittedIds = submittedAddresses.map((a: any) => a.id).filter(Boolean);
                for (const existing of existingAddresses) {
                    if (!submittedIds.includes(existing.id)) {
                        await deleteCustomerAddress(existing.id);
                    }
                }
            }

            if (result.success) {
                toast.success("Customer updated successfully!");
                router.push(`/customers/${id}`);
            } else {
                toast.error("Error: " + result.error);
            }
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="text-text-muted hover:text-text-main flex items-center gap-2">
                    <ArrowLeft size={18} /> Back
                </button>
                <h1 className="text-2xl font-bold text-text-main">Edit Customer: {customer.name || id}</h1>
            </div>

            <CustomerForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                isEditing={true}
                systemMetadata={systemMetadata}
            />
        </div>
    );
}
