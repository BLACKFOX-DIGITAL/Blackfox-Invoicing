import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/app/actions/sendEmail";
import { auth } from "@/auth";
import { buildInvoiceEmailHtml } from "@/lib/emailUtils";
import { getCurrencySymbol } from "@/lib/format";

export async function POST(request: Request) {

    // Check for Cron Secret (Automation) OR Session (Manual)
    // SEC-07 fix: guard against CRON_SECRET being unset (would match 'Bearer undefined')
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

    // Only verify session if not a valid cron request
    if (!isCron) {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch company settings for branding (logo, company name)
        const settings = await prisma.settings.findFirst();
        const companyName = settings?.companyName || "Your Company";
        const logoUrl = settings?.logoUrl || "";
        const baseUrl = process.env.NEXTAUTH_URL || "";

        // Get invoices that are Sent, Partially Paid, or Overdue (exclude Draft, Paid, Cancelled)
        const invoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["Sent", "Partially Paid", "Overdue"] },
                dueDate: { not: null }
            },
            include: { customer: true }
        });

        // BUG-09 fix: collect all pending sends then dispatch concurrently with Promise.allSettled
        // so a single slow ZeptoMail call doesn't block all other reminders.
        type PendingReminder = {
            invoiceId: string;
            subject: string;
            htmlBody: string;
            to: string;
            customerId: string;
            senderName: string;
        };

        const pending: PendingReminder[] = [];

        for (const invoice of invoices) {
            const customerEmail = invoice.customer.email || (invoice.customer as any).contactEmail;
            if (!invoice.dueDate || !customerEmail) continue;

            // Skip if a reminder was already sent today
            if (invoice.lastReminderSentAt) {
                const lastSent = new Date(invoice.lastReminderSentAt);
                lastSent.setHours(0, 0, 0, 0);
                if (lastSent.getTime() === today.getTime()) continue;
            }

            const dueDate = new Date(invoice.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            const invoiceTotal = invoice.total.toNumber();
            const totalPaid = invoice.totalPaid ? invoice.totalPaid.toNumber() : 0;
            const balanceDue = invoiceTotal - totalPaid;
            const currencySymbol = getCurrencySymbol(invoice.customer.currency || settings?.currency || "USD");
            const amountStr = `${currencySymbol}${balanceDue.toFixed(2)}`;
            const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const customerName = (invoice.customer as any).contactFirstName || "Concern";

            let shouldSend = false;
            let subject = "";
            let messageText = "";

            if (diffDays === -3) {
                shouldSend = true;
                subject = `Reminder: Invoice ${invoice.id} is due soon`;
                messageText = `Dear ${customerName},\n\nThis is a friendly reminder that invoice <strong>${invoice.id}</strong> for <strong>${amountStr}</strong> is due on <strong>${dueDateStr}</strong>.\n\nPlease ensure payment is made by the due date.\n\nThank you,\n${companyName}`;
            } else if (diffDays === 0) {
                shouldSend = true;
                subject = `Invoice ${invoice.id} is due today`;
                messageText = `Dear ${customerName},\n\nThis is a reminder that invoice <strong>${invoice.id}</strong> for <strong>${amountStr}</strong> is due <strong>today</strong>.\n\nPlease organize payment as soon as possible.\n\nThank you,\n${companyName}`;
            } else if (diffDays === 3) {
                shouldSend = true;
                subject = `Overdue: Invoice ${invoice.id}`;
                messageText = `Dear ${customerName},\n\nWe haven't received payment for invoice <strong>${invoice.id}</strong> which was due on <strong>${dueDateStr}</strong>.\n\nThe total amount due is <strong>${amountStr}</strong>. Please let us know if there is any issue.\n\nThank you,\n${companyName}`;
            } else if (diffDays > 3 && (diffDays - 3) % 15 === 0) {
                shouldSend = true;
                subject = `Urgent: Invoice ${invoice.id} is overdue`;
                messageText = `Dear ${customerName},\n\nThis is an urgent reminder that invoice <strong>${invoice.id}</strong> is still outstanding.\n\nIt was due on <strong>${dueDateStr}</strong> and is now <strong>${diffDays} days overdue</strong>. Please arrange payment immediately.\n\nThank you,\n${companyName}`;
            }

            if (shouldSend) {
                const htmlBody = buildInvoiceEmailHtml({
                    companyName,
                    logoUrl,
                    invoiceId: invoice.id,
                    amount: amountStr,
                    dueDate: dueDateStr,
                    messageHtml: messageText.replace(/\n/g, "<br/>"),
                    invoiceLink: `${baseUrl}/public/invoice/${invoice.id}?token=${invoice.publicToken}`,
                    type: diffDays >= 3 ? 'overdue' : 'invoice'
                });
                pending.push({
                    invoiceId: invoice.id,
                    subject,
                    htmlBody,
                    to: customerEmail,
                    customerId: invoice.customer.id,
                    senderName: companyName
                });
            }
        }

        // Send all pending reminders concurrently
        const sendResults = await Promise.allSettled(
            pending.map(async (rem) => {
                const result = await sendEmail({
                    to: rem.to,
                    subject: rem.subject,
                    htmlBody: rem.htmlBody,
                    invoiceId: rem.invoiceId,
                    customerId: rem.customerId,
                    senderName: rem.senderName
                });
                if (result.success) {
                    await prisma.invoice.update({
                        where: { id: rem.invoiceId },
                        data: { lastReminderSentAt: new Date() }
                    });
                    return { invoiceId: rem.invoiceId, status: "Sent", type: rem.subject };
                } else {
                    return { invoiceId: rem.invoiceId, status: "Failed", error: result.error };
                }
            })
        );

        const results = sendResults.map(r =>
            r.status === 'fulfilled' ? r.value : { invoiceId: 'unknown', status: 'Failed', error: String(r.reason) }
        );


        return NextResponse.json({ success: true, processed: results.length, details: results });

    } catch (error: any) {
        console.error("Error processing reminders:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
