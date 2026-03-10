"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { auth, hasRole, ROLES } from "@/auth";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { logAction } from "@/lib/audit-utils";
import { cache } from "react";

import { ActionResult } from "@/lib/types";

export type AdditionalContact = {
    name: string;
    email: string;
    role: string;
    phone: string;
    sendInvoices?: boolean;
};

export type CustomerAddressData = {
    id: string;
    customerId: string;
    companyName: string | null;
    address: string;
    taxId: string | null;
    createdAt: string;
    updatedAt: string;
};

type CustomerWithProjects = {
    id: string;
    name: string;
    email: string | null;
    status: string;
    currency: string;
    createdAt: string;
    updatedAt: string;
    projects: number;
    hasOverdue: boolean;
    paymentStatus: string;
    paymentTerms: number | null;
    additionalContacts: AdditionalContact[];
    lastWorkLogDate: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    contactFirstName?: string | null;
    contactMiddleName?: string | null;
    contactLastName?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactRole?: string | null;
    contactSendInvoices?: boolean;
    companySendInvoices?: boolean;
    phone?: string | null;
    taxId?: string | null;
    paymentMethod?: {
        id: number;
        type: string;
        name: string;
        details: string;
    } | null;
    addresses?: {
        id: string;
        customerId: string;
        companyName: string | null;
        address: string;
        taxId: string | null;
        createdAt: string | Date;
        updatedAt: string | Date;
    }[];
};

export type SerializedCustomerData = {
    customers: CustomerWithProjects[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
};

export const getCustomers = cache(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}): Promise<ActionResult<SerializedCustomerData>> => {
    return createAction("getCustomers", async () => {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };
        
        const company = (session.user as any).company;
        // Both blackfox and frameit (vendor) can view customers needed for work logging
        if (company && company !== "blackfox" && company !== "frameit") {
            return { success: false, error: "Unauthorized" };
        }

        const page = params?.page || 1;
        const limit = params?.limit || 100;
        const skip = (page - 1) * limit;

        const where: Prisma.CustomerWhereInput = {};

        if (params?.search) {
            const isVendor = company === "frameit";
            if (isVendor) {
                // Vendors can ONLY search by ID (which they see as Confidential but have the ID)
                // This prevents them from "fishing" for names by searching for strings.
                where.id = { contains: params.search };
            } else {
                where.OR = [
                    { id: { contains: params.search } },
                    { name: { contains: params.search } },
                    { email: { contains: params.search } },
                ];
            }
        }

        if (params?.status && params.status !== "all") {
            where.status = params.status;
        }

        const [customers, totalCount] = await Promise.all([
            prisma.customer.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: {
                    invoices: {
                        take: 1,
                        where: {
                            OR: [
                                { status: 'Overdue' },
                                {
                                    status: { in: ['Sent', 'Partially Paid'] },
                                    dueDate: { lt: new Date() }
                                }
                            ]
                        },
                        select: { id: true }
                    },
                    workLogs: {
                        take: 1,
                        orderBy: { date: 'desc' },
                        select: { date: true }
                    },
                    _count: {
                        select: {
                            services: true,
                            invoices: {
                                where: {
                                    status: { in: ['Overdue', 'Sent', 'Partially Paid'] }
                                }
                            }
                        }
                    },
                    paymentMethod: true,
                    addresses: true
                },
                skip,
                take: limit,
            }),
            prisma.customer.count({ where })
        ]);

        const isVendor = company === "frameit";

        const data = customers.map(c => {
            const isOverdue = c.invoices.length > 0;
            const isOutstanding = c._count.invoices > 0;

            let paymentStatus = "All Clear";
            if (isOverdue) paymentStatus = "Overdue";
            else if (isOutstanding) paymentStatus = "Outstanding";

            return {
                id: c.id,
                name: isVendor ? `Confidential` : c.name,
                email: isVendor ? null : c.email,
                status: c.status,
                currency: c.currency,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
                projects: c._count.services,
                hasOverdue: isOverdue, // Keep for backward compatibility if needed, or remove
                paymentStatus,
                paymentTerms: c.paymentTerms,
                additionalContacts: isVendor ? [] : (c.additionalContacts ? JSON.parse(c.additionalContacts) as AdditionalContact[] : []),
                lastWorkLogDate: c.workLogs[0]?.date.toISOString().split('T')[0] || null,
                website: isVendor ? null : c.website,
                address: isVendor ? null : c.address,
                city: isVendor ? null : c.city,
                state: isVendor ? null : c.state,
                zip: isVendor ? null : c.zip,
                country: isVendor ? null : c.country,
                contactFirstName: isVendor ? null : c.contactFirstName,
                contactMiddleName: isVendor ? null : c.contactMiddleName,
                contactLastName: isVendor ? null : c.contactLastName,
                contactName: isVendor ? null : [c.contactFirstName, c.contactMiddleName, c.contactLastName].filter(Boolean).join(" "),
                contactEmail: isVendor ? null : c.contactEmail,
                contactRole: isVendor ? null : c.contactRole,
                contactSendInvoices: isVendor ? false : c.contactSendInvoices,
                companySendInvoices: isVendor ? false : c.companySendInvoices,
                paymentMethod: isVendor ? null : c.paymentMethod,
                phone: isVendor ? null : c.phone,
                taxId: isVendor ? null : c.taxId,
                addresses: isVendor ? [] : (c.addresses?.map((addr: any) => ({
                    id: addr.id,
                    customerId: addr.customerId,
                    companyName: addr.companyName,
                    address: addr.address,
                    taxId: addr.taxId,
                    contactEmail: addr.contactEmail,
                    contactPhone: addr.contactPhone,
                    createdAt: addr.createdAt.toISOString(),
                    updatedAt: addr.updatedAt.toISOString(),
                })) || [])
            };
        });

        return {
            success: true,
            data: {
                customers: data,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page
            }
        };
    });
});

export const getCustomer = cache(async (id: string) => {
    return createAction("getCustomer", async () => {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };
        
        const company = (session.user as any).company;
        if (company && company !== "blackfox" && company !== "frameit") {
            return { success: false, error: "Unauthorized" };
        }

        const [customer, outstandingStats] = await Promise.all([
            prisma.customer.findUnique({
                where: { id },
                include: {
                    services: true,
                    paymentMethod: true,
                    addresses: true,
                    invoices: {
                        orderBy: { date: 'desc' },
                        take: 5
                    }
                }
            }),
            prisma.invoice.aggregate({
                where: {
                    customerId: id,
                    status: { notIn: ['Paid', 'Cancelled'] }
                },
                _sum: { total: true }
            })
        ]);

        if (!customer) {
            return { success: false, error: `Customer not found for ID: [${id}]` };
        }

        const isVendor = company === "frameit";

        const serializedCustomer = {
            ...customer,
            name: isVendor ? `Confidential` : customer.name,
            email: isVendor ? null : customer.email,
            website: isVendor ? null : customer.website,
            address: isVendor ? null : customer.address,
            city: isVendor ? null : customer.city,
            state: isVendor ? null : customer.state,
            zip: isVendor ? null : customer.zip,
            country: isVendor ? null : customer.country,
            contactFirstName: isVendor ? null : customer.contactFirstName,
            contactMiddleName: isVendor ? null : customer.contactMiddleName,
            contactLastName: isVendor ? null : customer.contactLastName,
            contactName: isVendor ? null : [customer.contactFirstName, customer.contactMiddleName, customer.contactLastName].filter(Boolean).join(" "),
            contactEmail: isVendor ? null : customer.contactEmail,
            contactRole: isVendor ? null : customer.contactRole,
            contactSendInvoices: isVendor ? false : customer.contactSendInvoices,
            companySendInvoices: isVendor ? false : customer.companySendInvoices,
            phone: isVendor ? null : customer.phone,
            taxId: isVendor ? null : customer.taxId,
            paymentMethod: isVendor ? null : customer.paymentMethod,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: customer.updatedAt.toISOString(),
            services: customer.services.map(s => ({
                ...s,
                rate: s.rate.toNumber()
            })),
            invoices: customer.invoices.map(inv => ({
                ...inv,
                subtotal: inv.subtotal.toNumber(),
                tax: inv.tax.toNumber(),
                total: inv.total.toNumber(),
                totalPaid: inv.totalPaid ? inv.totalPaid.toNumber() : 0,
            })),
            additionalContacts: (isVendor || !customer.additionalContacts || customer.additionalContacts.trim() === '') ? [] : (() => { try { return JSON.parse(customer.additionalContacts); } catch { return []; } })(),
            outstandingBalance: outstandingStats?._sum?.total ? outstandingStats._sum.total.toNumber() : 0,
            addresses: isVendor ? [] : (customer.addresses?.map((addr: any) => ({
                id: addr.id,
                customerId: addr.customerId,
                companyName: addr.companyName,
                address: addr.address,
                taxId: addr.taxId,
                contactFirstName: addr.contactFirstName,
                contactMiddleName: addr.contactMiddleName,
                contactLastName: addr.contactLastName,
                contactName: [addr.contactFirstName, addr.contactMiddleName, addr.contactLastName].filter(Boolean).join(" "),
                contactEmail: addr.contactEmail,
                contactPhone: addr.contactPhone,
                website: addr.website,
                createdAt: addr.createdAt.toISOString(),
                updatedAt: addr.updatedAt.toISOString(),
            })) || [])
        };

        return { success: true, data: serializedCustomer };
    });
});

export async function createCustomer(data: {
    id: string;
    name: string;
    email: string;
    currency?: string;
    status?: string;
    paymentTerms?: number;
    additionalContacts?: any[];
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    contactFirstName?: string;
    contactMiddleName?: string;
    contactLastName?: string;
    contactEmail?: string;
    contactRole?: string;
    contactSendInvoices?: boolean;
    companySendInvoices?: boolean;
    phone?: string;
    taxId?: string;
    paymentMethodId?: number;
}): Promise<ActionResult<{ id: string }>> {
    return createAction("createCustomer", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        // Validate ID is numeric
        if (!/^\d+$/.test(data.id)) {
            return { success: false, error: "Customer ID must contain digits only." };
        }

        const customerData = {
            id: data.id,
            name: data.name,
            email: (data.email || null) as any,
            companySendInvoices: data.companySendInvoices,
            currency: data.currency || "USD",
            status: data.status || "Active",
            paymentTerms: data.paymentTerms,
            additionalContacts: data.additionalContacts ? JSON.stringify(data.additionalContacts) : null,
            website: data.website,
            address: data.address,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country,
            contactFirstName: data.contactFirstName,
            contactMiddleName: data.contactMiddleName,
            contactLastName: data.contactLastName,
            contactEmail: data.contactEmail,
            contactRole: data.contactRole,
            contactSendInvoices: data.contactSendInvoices,
            phone: data.phone,
            taxId: data.taxId,
            paymentMethodId: data.paymentMethodId
        };

        const customer = await prisma.customer.upsert({
            where: { id: data.id },
            update: customerData,
            create: customerData
        });

        // Natively cascade name change strictly backwards across all invoices/services linked
        if (data.name) {
            await prisma.invoice.updateMany({
                where: { customerId: data.id },
                data: { clientName: data.name }
            });
            await prisma.service.updateMany({
                where: { customerId: data.id },
                data: { customerName: data.name }
            });
        }

        await logAction({
            action: "CREATE_CUSTOMER",
            entityType: "Customer",
            entityId: customer.id,
            details: { name: customer.name }
        });

        revalidatePath("/customers");

        return { success: true, data: { id: String(customer.id) } };
    });
}

export async function updateCustomer(
    id: string,
    data: {
        name?: string;
        email?: string;
        currency?: string;
        status?: string;
        paymentTerms?: number;
        additionalContacts?: any[];
        website?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        phone?: string;
        contactFirstName?: string;
        contactMiddleName?: string;
        contactLastName?: string;
        contactEmail?: string;
        contactRole?: string;
        contactSendInvoices?: boolean;
        companySendInvoices?: boolean;
        taxId?: string;
        paymentMethodId?: number;
    }
): Promise<ActionResult<{ id: string }>> {
    return createAction("updateCustomer", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                ...data,
                email: (data.email === "" ? null : data.email) as any,
                companySendInvoices: data.companySendInvoices,
                contactEmail: data.contactEmail,
                contactSendInvoices: data.contactSendInvoices,
                additionalContacts: data.additionalContacts ? JSON.stringify(data.additionalContacts) : undefined
            }
        });

        // Natively cascade name change strictly backwards across all invoices/services linked
        if (data.name) {
            await prisma.invoice.updateMany({
                where: { customerId: id },
                data: { clientName: data.name }
            });
            await prisma.service.updateMany({
                where: { customerId: id },
                data: { customerName: data.name }
            });
        }

        await logAction({
            action: "UPDATE_CUSTOMER",
            entityType: "Customer",
            entityId: id,
            details: { name: customer.name }
        });

        revalidatePath("/customers");
        revalidatePath(`/customers/${id}`);
        return { success: true, data: { id: customer.id } };
    });
}

export async function deleteCustomer(id: string): Promise<ActionResult<null>> {
    return createAction("deleteCustomer", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Only Owners and Managers can delete customers." };

        // SEC-02 fix: block deletion if the customer has outstanding invoices
        const outstandingCount = await prisma.invoice.count({
            where: {
                customerId: id,
                status: { notIn: ["Paid", "Cancelled", "Draft"] }
            }
        });
        if (outstandingCount > 0) {
            return {
                success: false,
                error: `Cannot delete this customer — they have ${outstandingCount} outstanding invoice(s). Please resolve them first.`
            };
        }

        await prisma.customer.delete({ where: { id } });
        await logAction({
            action: "DELETE_CUSTOMER",
            entityType: "Customer",
            entityId: id
        });

        revalidatePath("/customers");
        return { success: true, data: null };
    });
}

// ----------------------------------------------------------------------------
// Customer Addresses (Billing Profiles)
// ----------------------------------------------------------------------------

export async function createCustomerAddress(data: {
    customerId: string;
    companyName?: string;
    address: string;
    taxId?: string;
    contactFirstName?: string;
    contactMiddleName?: string;
    contactLastName?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
}): Promise<ActionResult<{ id: string }>> {
    return createAction("createCustomerAddress", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const address = await prisma.customerAddress.create({
            data: {
                customerId: data.customerId,
                companyName: data.companyName,
                address: data.address,
                taxId: data.taxId,
                contactFirstName: data.contactFirstName,
                contactMiddleName: data.contactMiddleName,
                contactLastName: data.contactLastName,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                website: data.website,
            }
        });

        revalidatePath(`/customers/${data.customerId}`);
        return { success: true, data: { id: address.id } };
    });
}

export async function updateCustomerAddress(
    id: string,
    data: {
        companyName?: string;
        address?: string;
        taxId?: string;
        contactFirstName?: string;
        contactMiddleName?: string;
        contactLastName?: string;
        contactEmail?: string;
        contactPhone?: string;
        website?: string;
    }
): Promise<ActionResult<{ id: string }>> {
    return createAction("updateCustomerAddress", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const address = await prisma.customerAddress.update({
            where: { id },
            data: {
                companyName: data.companyName,
                address: data.address,
                taxId: data.taxId,
                contactFirstName: data.contactFirstName,
                contactMiddleName: data.contactMiddleName,
                contactLastName: data.contactLastName,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                website: data.website,
            }
        });

        revalidatePath(`/customers/${address.customerId}`);
        return { success: true, data: { id: address.id } };
    });
}

export async function deleteCustomerAddress(id: string): Promise<ActionResult<null>> {
    return createAction("deleteCustomerAddress", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const address = await prisma.customerAddress.delete({ where: { id } });

        revalidatePath(`/customers/${address.customerId}`);
        return { success: true, data: null };
    });
}
