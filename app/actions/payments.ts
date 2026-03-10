"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { Decimal } from "decimal.js";
import { auth, hasRole, ROLES } from "@/auth";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { ActionResult } from "@/lib/types";


import { z } from "zod";

import { PAYMENT_METHODS } from "@/lib/constants";

const RecordPaymentSchema = z.object({
    invoiceId: z.string().min(1, "Invoice ID is required"),
    amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be a positive number",
    }),
    fee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
        message: "Fee must be a non-negative number",
    }),
    method: z.string().min(1, "Payment method is required"),
    date: z.string().min(1, "Date is required"),
    notes: z.string().optional(),
    sendReceipt: z.boolean().optional(),
});

export async function recordPayment(rawData: z.infer<typeof RecordPaymentSchema>): Promise<ActionResult<{ id: number }>> {
    return createAction("recordPayment", async () => {
        const bfSession = await requireBlackfox();
        if (!bfSession) return { success: false, error: "Unauthorized" };
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const data = RecordPaymentSchema.parse(rawData);
        const { invoiceId, amount, method, date, notes, sendReceipt } = data;

        const amountPaidByCustomer = new Decimal(amount);
        const inputFee = data.fee ? new Decimal(data.fee) : undefined;

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: { payments: true, customer: true }
            });

            if (!invoice) {
                throw new Error("Invoice not found");
            }

            const oneMinuteAgo = new Date(Date.now() - 60000);
            const duplicate = await tx.payment.findFirst({
                where: {
                    invoiceId: invoiceId,
                    amount: { equals: amountPaidByCustomer },
                    method: method,
                    notes: notes || null,
                    createdAt: { gt: oneMinuteAgo }
                }
            });

            if (duplicate) {
                return { payment: duplicate, invoice, isDuplicate: true };
            }

            if (invoice.status === "Paid" || invoice.status === "Cancelled") {
                throw new Error(`Cannot record payment. Invoice is ${invoice.status}.`);
            }

            if (amountPaidByCustomer.lte(0)) {
                throw new Error("Payment amount must be greater than zero.");
            }

            const invoiceTotal = new Decimal(invoice.total?.toString() || 0);
            const existingPaid = invoice.payments.reduce(
                (sum: Decimal, p) => sum.plus(new Decimal(p.amount.toString())),
                new Decimal(0)
            );

            const remaining = invoiceTotal.minus(existingPaid);

            if (amountPaidByCustomer.gt(remaining)) {
                throw new Error(`Overpayment rejected. Maximum allowed: $${remaining.toFixed(2)}`);
            }

            let transactionFee = new Decimal(0);
            if (inputFee !== undefined) {
                transactionFee = inputFee;
            } else if (method === "Credit Card") {
                transactionFee = amountPaidByCustomer.times(0.029).plus(0.30);
                transactionFee = new Decimal(transactionFee.toFixed(2));
            }

            const netReceived = amountPaidByCustomer.minus(transactionFee);

            const payment = await tx.payment.create({
                data: {
                    invoiceId,
                    amount: amountPaidByCustomer.toNumber(),
                    fee: transactionFee.toNumber(),
                    net: netReceived.toNumber(),
                    method,
                    date: new Date(date),
                    notes
                }
            });

            const newTotalPaid = existingPaid.plus(amountPaidByCustomer);
            let newStatus = invoice.status;

            if (newTotalPaid.greaterThanOrEqualTo(invoiceTotal)) {
                newStatus = "Paid";
            } else if (newTotalPaid.gt(0)) {
                newStatus = "Partially Paid";
            } else {
                newStatus = "Sent";
            }

            await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    totalPaid: newTotalPaid.toNumber(),
                    status: newStatus
                }
            });

            if (newStatus === "Paid") {
                await tx.workLog.updateMany({
                    where: { invoiceId: invoiceId },
                    data: { status: "Paid" }
                });
            }

            return {
                payment,
                invoice,
                isDuplicate: false,
                isFull: newStatus === "Paid",
                newTotalPaid: newTotalPaid.toNumber(),
                invoiceTotal: invoiceTotal.toNumber()
            };
        }, { timeout: 10000 });

        revalidatePath("/invoices");
        revalidatePath(`/invoices/${invoiceId}`);
        revalidatePath("/payments");
        revalidateTag("dashboard", "default");

        // Attempt to send email receipt in background
        if (!result.isDuplicate && result.invoice && sendReceipt) {
            (async () => {
                try {
                    const { sendEmail } = await import("@/app/actions/sendEmail");
                    const { buildInvoiceEmailHtml } = await import("@/lib/emailUtils");

                    const settings = await prisma.settings.findFirst();
                    const companyName = settings?.companyName || "Your Company";
                    const logoUrl = settings?.logoUrl || "";

                    const inv = result.invoice as any;
                    const cust = inv.customer as any;
                    const customerEmail = inv.clientEmail || cust?.contactEmail || cust?.email;

                    if (customerEmail) {
                        const currency = cust?.currency || settings?.currency || "USD";
                        const amountStr = `${currency} ${result.payment.amount.toFixed(2)}`;
                        const customerName = inv.clientCompany || inv.clientName || cust?.name || "Customer";

                        const template = await prisma.emailTemplate.findFirst({
                            where: { name: "Payment Receipt" }
                        });

                        let subjectRaw = template?.subject || `Payment Receipt: Invoice #{id}`;
                        let messageRaw = template?.content || `Dear {client_name},\n\nWe have received your payment of {paid_amount} for invoice #{id}.\n\nThank you,\n{company}`;
                        let headingRaw = (template as any)?.heading || `Payment Receipt`;
                        let footerRaw = template?.footer || "";

                        const replaceVars = (text: string) => {
                            let remaining = 0;
                            if (result.invoiceTotal !== undefined && result.newTotalPaid !== undefined) {
                                remaining = result.invoiceTotal - result.newTotalPaid;
                            }
                            const remainingStr = `${currency} ${remaining.toFixed(2)}`;

                            return text
                                .replace(/{client_name}/g, customerName)
                                .replace(/{customerName}/g, customerName)
                                .replace(/{id}/g, inv.id)
                                .replace(/{paid_amount}/g, amountStr)
                                .replace(/{amount}/g, amountStr)
                                .replace(/{remaining_balance}/g, remainingStr)
                                .replace(/{company}/g, companyName)
                                .replace(/{due_date}/g, inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'On receipt');
                        };

                        const subject = replaceVars(subjectRaw).replace(/<br\s*\/?>/g, '').replace(/\n/g, ' '); // No HTML in subject
                        const messageHtml = replaceVars(messageRaw).replace(/\n/g, '<br />');
                        const headingHtml = replaceVars(headingRaw);
                        const footerHtml = replaceVars(footerRaw).replace(/\n/g, '<br />');

                        const baseUrl = process.env.NEXTAUTH_URL || "";
                        const invoiceLink = `${baseUrl}/public/invoice/${inv.id}?token=${inv.publicToken}`;

                        const htmlBody = buildInvoiceEmailHtml({
                            companyName,
                            logoUrl,
                            invoiceId: inv.id,
                            amount: amountStr,
                            messageHtml,
                            type: 'receipt',
                            invoiceLink,
                            headingHtml,
                            footerHtml
                        });

                        await sendEmail({
                            to: customerEmail,
                            subject: subject,
                            htmlBody,
                            invoiceId: inv.id,
                            customerId: inv.customerId,
                            senderName: companyName
                        });
                    }
                } catch (e) {
                    console.error("Failed to send payment receipt:", e);
                }
            })();
        }

        return { success: true, data: { id: result.payment.id } };
    });
}


export type SerializedPayment = {
    id: number;
    invoiceId: string;
    customerName: string;
    amount: number;
    fee: number;
    net: number;
    method: string;
    date: string;
    notes: string | null;
    status: string;
    invoiceStatus: string;
    currency: string;
    createdAt: string;
};

export async function getInvoicePayments(invoiceId: string): Promise<ActionResult<any[]>> {
    return createAction("getInvoicePayments", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        const payments = await prisma.payment.findMany({
            where: { invoiceId },
            orderBy: { date: 'desc' }
        });

        const safePayments = payments.map(p => ({
            id: p.id,
            amount: p.amount.toNumber(),
            fee: p.fee.toNumber(),
            net: p.net.toNumber(),
            method: p.method,
            date: p.date,
            notes: p.notes,
            createdAt: p.createdAt
        }));

        return { success: true, data: safePayments };
    });
}

export async function getAllPayments(): Promise<ActionResult<SerializedPayment[]>> {
    return createAction("getAllPayments", async () => {
        const bfSession = await requireBlackfox();
        if (!bfSession) return { success: false, error: "Unauthorized" };
        // BUG-11 fix: restrict to Owner/Manager and cap result set
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const payments = await prisma.payment.findMany({
            orderBy: { date: 'desc' },
            take: 500,   // BUG-11: cap from unbounded
            include: {
                invoice: {
                    select: {
                        clientName: true,
                        status: true,
                        customer: {
                            select: {
                                currency: true
                            }
                        }
                    }
                }
            }
        });

        const settings = await prisma.settings.findFirst();

        const data: SerializedPayment[] = payments.map(p => ({
            id: p.id,
            invoiceId: p.invoiceId,
            customerName: p.invoice.clientName,
            amount: p.amount.toNumber(),
            fee: p.fee.toNumber(),
            net: p.net.toNumber(),
            method: p.method,
            date: p.date.toISOString().split('T')[0],
            notes: p.notes,
            status: p.invoice.status, // Use Invoice Status as the Payment Status for UI
            invoiceStatus: p.invoice.status,
            currency: p.invoice.customer?.currency || settings?.currency || "USD",
            createdAt: p.createdAt.toISOString()
        }));

        return { success: true, data };
    });
}
