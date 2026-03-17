"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth, hasRole, ROLES } from "@/auth";
import { ActionResult } from "@/lib/types";
import { createAction } from "@/lib/action-utils";

const DEFAULT_TEMPLATES = [
    {
        name: "Invoice Email",
        subject: "Invoice #{id} from {company}",
        content: "Dear {client_name},\n\nPlease find attached invoice #{id} for {amount}.\n\nThank you,\n{company}",
        heading: "Invoice for <strong>{amount}</strong> due by <strong>{due_date}</strong>",
        footer: "",
        isDefault: true
    },
    {
        name: "Payment Receipt",
        subject: "Payment Received for Invoice #{id}",
        content: "Dear {client_name},\n\nWe have received your payment of {paid_amount} for invoice #{id}.\n\nThank you,\n{company}",
        heading: "Payment Receipt",
        footer: "",
        isDefault: false
    },
    {
        name: "Account Statement",
        subject: "Statement for {customerName} from {company}",
        content: "Dear {customerName},\n\nPlease find attached your account statement. Total outstanding balance is {total}.\n\nThank you,\n{company}",
        heading: "Account Statement for <strong>{companyName}</strong>",
        footer: "",
        isDefault: false
    }
];

export async function getTemplates(): Promise<ActionResult<any[]>> {
    return createAction("getTemplates", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        let templates = await prisma.emailTemplate.findMany({
            orderBy: { createdAt: 'asc' }
        });

        // Seed default templates if none exist
        if (templates.length === 0) {
            await prisma.emailTemplate.createMany({
                data: DEFAULT_TEMPLATES
            });
            templates = await prisma.emailTemplate.findMany({
                orderBy: { createdAt: 'asc' }
            });
        }

        return { success: true, data: templates };
    });
}

export async function updateTemplate(id: string, data: { subject: string; content: string; heading?: string; footer?: string }): Promise<ActionResult<any>> {
    return createAction("updateTemplate", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const updated = await prisma.emailTemplate.update({
            where: { id },
            data: {
                subject: data.subject,
                content: data.content,
                heading: data.heading || null,
                footer: data.footer || null
            }
        });

        revalidatePath("/settings");
        return { success: true, data: updated };
    });
}

export async function createTemplate(data: { name: string; subject: string; content: string; heading?: string; footer?: string; isDefault?: boolean }): Promise<ActionResult<any>> {
    return createAction("createTemplate", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const created = await prisma.emailTemplate.create({
            data: {
                name: data.name,
                subject: data.subject,
                content: data.content,
                heading: data.heading || null,
                footer: data.footer || null,
                isDefault: data.isDefault || false
            }
        });
        revalidatePath("/templates");
        revalidatePath("/settings");
        return { success: true, data: created };
    });
}

export async function deleteTemplate(id: string): Promise<ActionResult<null>> {
    return createAction("deleteTemplate", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        // BUG-04 fix: prevent deletion of built-in default templates server-side
        const existing = await prisma.emailTemplate.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Template not found." };
        if (existing.isDefault) {
            return { success: false, error: "Cannot delete a built-in default template." };
        }

        await prisma.emailTemplate.delete({ where: { id } });
        revalidatePath("/templates");
        revalidatePath("/settings");
        return { success: true, data: null };
    });
}
