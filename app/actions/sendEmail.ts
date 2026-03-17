"use server";

import { SendMailClient } from "zeptomail";
import { createEmailLog } from "./email-logs";
import { prisma } from "@/lib/db";
import { createAction, requireBlackfox } from "@/lib/action-utils";
import { ActionResult } from "@/lib/types";

export async function sendEmail({
    to,
    subject,
    htmlBody,
    senderName = "Invofox Notification",
    senderEmail = "noreply@invofox.com",
    invoiceId,
    customerId,
    attachments
}: {
    to: string | string[];
    subject: string;
    htmlBody: string;
    senderName?: string;
    senderEmail?: string;
    invoiceId?: string;
    customerId?: string;
    attachments?: Array<{
        filename: string;
        content: string; // Base64
        mimeType: string;
    }>;
}): Promise<ActionResult<{ message: string }>> {
    return createAction("sendEmail", async () => {
        const session = await requireBlackfox();
        if (!session) return { success: false, error: "Unauthorized" };

        // Standardize 'to' as an array of objects for ZeptoMail
        const recipients = Array.isArray(to)
            ? to
            : to.split(",").map(email => email.trim()).filter(email => email !== "");

        const formattedRecipients = recipients.map(email => ({
            email_address: {
                address: email,
                name: "Recipient",
            },
        }));

        if (formattedRecipients.length === 0) {
            return { success: false, error: "No recipients provided" };
        }

        const toLog = recipients.join(", ");
        let url = process.env.ZEPTOMAIL_API_URL || "api.zeptomail.com/";
        let processedHtmlBody = htmlBody;

        // Ensure all relative URLs (like /uploads/logo.png) are absolute so email clients can resolve them
        if (process.env.NEXTAUTH_URL) {
            const baseUrl = process.env.NEXTAUTH_URL.replace(/\/$/, '');
            processedHtmlBody = processedHtmlBody.replace(/src="(\/[^"]+)"/g, `src="${baseUrl}$1"`);
            processedHtmlBody = processedHtmlBody.replace(/href="(\/[^"]+)"/g, `href="${baseUrl}$1"`);
        }

        // Try to get token from DB first, then fall back to env var
        let token = process.env.ZEPTOMAIL_API_TOKEN;
        let resolvedSenderEmail = senderEmail || "noreply@invofox.com";
        try {
            const settings = await prisma.settings.findFirst({
                select: { zohoApiKey: true, email: true, zeptoMailUrl: true, zeptoMailSender: true } as any
            }) as any;
            if (settings?.zohoApiKey) {
                token = settings.zohoApiKey;
            }
            if (settings?.zeptoMailUrl) {
                url = settings.zeptoMailUrl;
            }
            // 1. Explicitly configured ZeptoMail Sender Address (best, matches generic token domain)
            // 2. The generic company email from settings (fallback)
            // 3. noreply@invofox.com (last resort)
            if (settings?.zeptoMailSender && senderEmail === "noreply@invofox.com") {
                resolvedSenderEmail = settings.zeptoMailSender;
            } else if (settings?.email && senderEmail === "noreply@invofox.com") {
                resolvedSenderEmail = settings.email;
            }
        } catch {
            // Silently fall back to env var
        }

        // SANDBOX / MOCK MODE
        // If no token is provided, we simulate a successful send.
        if (!token) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Generate a mock message ID for testing
            const mockMessageId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;

            // Log the email attempt
            await createEmailLog({
                to: toLog,
                subject,
                body: processedHtmlBody,
                status: "Sent",
                invoiceId,
                customerId,
                messageId: mockMessageId
            });

            return { success: true, data: { message: "Email simulated (Sandbox Mode)" } };
        }

        // REAL MODE
        try {
            const client = new SendMailClient({ url, token });

            const response = await client.sendMail({
                from: {
                    address: resolvedSenderEmail,
                    name: senderName,
                },
                to: formattedRecipients,
                subject: subject,
                htmlbody: processedHtmlBody,
                attachments: (attachments || []).map(att => ({
                    content: att.content,
                    mime_type: att.mimeType,
                    name: att.filename
                }))
            } as any);

            // ZeptoMail response usually contains a request_id or data array with messageIds
            // We'll use request_id as the primary correlation ID for the batch, 
            // or the first messageId if available.
            const headerRequestId = (response as any).data?.[0]?.message_id || (response as any).requestId || (response as any).request_id; // varies by version

            // Log the successful email
            await createEmailLog({
                to: toLog,
                subject,
                body: processedHtmlBody,
                status: "Sent",
                invoiceId,
                customerId,
                messageId: headerRequestId
            });

            return { success: true, data: { message: "Email sent successfully" } };

        } catch (error: any) {
            console.error("ZeptoMail Error:", error);

            // Log the failed email
            await createEmailLog({
                to: toLog,
                subject,
                body: processedHtmlBody,
                status: "Failed",
                invoiceId,
                customerId,
                errorMsg: error.message || "Unknown error"
            });

            return { success: false, error: error.message || "Failed to send email" };
        }
    });
}
