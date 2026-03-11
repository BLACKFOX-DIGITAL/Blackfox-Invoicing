"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { auth, hasRole, ROLES } from "@/auth";
import { createAction } from "@/lib/action-utils";
import { ActionResult } from "@/lib/types";
import { PRIMARY_COMPANY } from "@/lib/constants/tenant";

export type PaymentMethod = {
    id: number;
    type: string;
    name: string;
    details: string;
};

export type SettingsData = {
    id: number;
    companyName: string;
    email: string;
    address: string;
    phone: string | null;
    website: string | null;
    tinId: string | null;
    currency: string;
    taxRate: number;
    defaultPaymentTerms: string;
    logoUrl: string | null;
    zohoApiKey: string | null;
    zeptoMailUrl: string | null;
    zeptoMailSender: string | null;
    zeptoMailWebhookSecret: string | null;
    paymentMethods: PaymentMethod[];
    themeColor: string | null;
};

export async function getSettings(): Promise<ActionResult<SettingsData>> {
    return createAction("getSettings", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const company = (session.user as any)?.company || PRIMARY_COMPANY;

        let settings = await prisma.settings.findUnique({ where: { company } });

        if (!settings) {
            settings = await prisma.settings.create({
                data: {
                    company,
                    companyName: "Your Company",
                    email: "billing@yourcompany.com",
                    address: "123 Business St, City, Country",
                    currency: "৳ BDT",
                    taxRate: 0,
                    defaultPaymentTerms: "Net 30"
                }
            });
        }

        const paymentMethods = await prisma.paymentMethod.findMany();

        // Explicitly map to SettingsData — deliberately omit API keys/secrets.
        // Those are only returned by getEmailApiSettings() which is Owner-gated.
        const safeSettings: SettingsData = {
            id: settings.id,
            companyName: settings.companyName,
            email: settings.email,
            address: settings.address,
            phone: settings.phone,
            website: settings.website,
            tinId: settings.tinId,
            currency: settings.currency,
            taxRate: settings.taxRate.toNumber(),
            defaultPaymentTerms: settings.defaultPaymentTerms,
            logoUrl: settings.logoUrl,
            zohoApiKey: null,              // Never expose in the general settings response.
            zeptoMailUrl: null,            // Use getEmailApiSettings() (Owner-only) instead.
            zeptoMailSender: null,
            zeptoMailWebhookSecret: null,
            paymentMethods,
            themeColor: settings.themeColor || "slate"
        };

        return {
            success: true,
            data: safeSettings
        };
    });
}

export async function updateSettings(data: {
    companyName?: string;
    email?: string;
    address?: string;
    phone?: string;
    website?: string;
    tinId?: string;
    currency?: string;
    taxRate?: number;
    defaultPaymentTerms?: string;
    paymentMethods?: { id?: number; type: string; name: string; details: string }[];
    themeColor?: string;
}): Promise<ActionResult<void>> {
    return createAction("updateSettings", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER, ROLES.VENDOR_MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const session = await auth();
        const company = (session?.user as any)?.company || PRIMARY_COMPANY;

        await prisma.$transaction(async (tx) => {
            await tx.settings.upsert({
                where: { company },
                update: {
                    companyName: data.companyName,
                    email: data.email,
                    address: data.address,
                    phone: data.phone,
                    website: data.website,
                    tinId: data.tinId,
                    currency: data.currency,
                    taxRate: data.taxRate,
                    defaultPaymentTerms: data.defaultPaymentTerms,
                    themeColor: data.themeColor,
                },
                create: {
                    company,
                    companyName: data.companyName || "Your Company",
                    email: data.email || "",
                    address: data.address || "",
                    phone: data.phone || "",
                    website: data.website || "",
                    tinId: data.tinId || "",
                    currency: data.currency || "৳ BDT",
                    taxRate: data.taxRate || 0,
                    defaultPaymentTerms: data.defaultPaymentTerms || "Net 30",
                    themeColor: data.themeColor || "slate",
                }
            });

            if (data.paymentMethods) {
                const incomingMethods = data.paymentMethods;
                const existingMethods = await tx.paymentMethod.findMany();

                // 1. Identify methods to delete (those in DB but not in incoming data)
                const incomingIds = incomingMethods
                    .filter(m => typeof m.id === 'number' && m.id > 0)
                    .map(m => m.id);

                await tx.paymentMethod.deleteMany({
                    where: {
                        id: { notIn: incomingIds as number[] }
                    }
                });

                // 2. Separate into Create and Update
                for (const method of incomingMethods) {
                    if (typeof method.id === 'number' && method.id > 0) {
                        // Update existing
                        await tx.paymentMethod.update({
                            where: { id: method.id },
                            data: {
                                type: method.type,
                                name: method.name,
                                details: method.details
                            }
                        });
                    } else {
                        // Create new
                        await tx.paymentMethod.create({
                            data: {
                                type: method.type,
                                name: method.name,
                                details: method.details
                            }
                        });
                    }
                }
            }
        });

        revalidatePath("/", "layout");
        revalidatePath("/settings/payment-methods");
        return { success: true, data: undefined };
    });
}

export async function getPaymentMethods(): Promise<ActionResult<PaymentMethod[]>> {
    return createAction("getPaymentMethods", async () => {
        const session = await auth();
        if (!session) return { success: false, error: "Unauthorized" };

        const methods = await prisma.paymentMethod.findMany();
        return { success: true, data: methods };
    });
}

// Allowlists for logo upload validation (SVG excluded — XSS risk when served inline)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function uploadCompanyLogo(formData: FormData): Promise<ActionResult<string>> {
    return createAction("uploadCompanyLogo", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER, ROLES.MANAGER, ROLES.VENDOR_MANAGER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Insufficient permissions." };

        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, error: "No file provided" };
        }

        // --- Security: validate file type, extension, and size ---
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return { success: false, error: "Invalid file type. Only JPEG, PNG, GIF, WebP, or SVG images are allowed." };
        }
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return { success: false, error: "Invalid file extension." };
        }
        if (file.size > MAX_LOGO_SIZE_BYTES) {
            return { success: false, error: "File too large. Maximum size is 2 MB." };
        }
        // ---------------------------------------------------------

        const buffer = Buffer.from(await file.arrayBuffer());

        // SEC-M4: Validate actual file content via magic bytes
        const MAGIC_BYTES: Record<string, number[]> = {
            'jpg':  [0xFF, 0xD8, 0xFF],
            'jpeg': [0xFF, 0xD8, 0xFF],
            'png':  [0x89, 0x50, 0x4E, 0x47],
            'gif':  [0x47, 0x49, 0x46],
            'webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
        };
        const expectedMagic = MAGIC_BYTES[ext];
        if (expectedMagic) {
            const fileMagic = Array.from(buffer.subarray(0, expectedMagic.length));
            const isValid = expectedMagic.every((byte, i) => fileMagic[i] === byte);
            if (!isValid) {
                return { success: false, error: "File content does not match its extension. Upload rejected." };
            }
        }

        const filename = `logo-${Date.now()}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");

        try {
            await fs.mkdir(uploadDir, { recursive: true });
        } catch (e) { }

        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, buffer);

        const logoUrl = `/uploads/${filename}`;

        const session = await auth();
        const company = (session?.user as any)?.company || PRIMARY_COMPANY;

        await prisma.settings.upsert({
            where: { company },
            update: { logoUrl },
            create: {
                company,
                companyName: "Your Company",
                email: "billing@yourcompany.com",
                address: "New Company",
                currency: "৳ BDT",
                taxRate: 0,
                defaultPaymentTerms: "Net 30",
                logoUrl
            }
        });

        revalidatePath("/settings");
        return { success: true, data: logoUrl };
    });
}

export async function getEmailApiSettings(): Promise<ActionResult<{ zohoApiKey: string, zeptoMailUrl: string, zeptoMailSender: string, zeptoMailWebhookSecret: string }>> {
    return createAction("getEmailApiSettings", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Only Owners can view API settings." };

        const settings = await prisma.settings.findUnique({
            where: { company: PRIMARY_COMPANY }, // API keys are global, use primary company
            select: { zohoApiKey: true, zeptoMailUrl: true, zeptoMailSender: true, zeptoMailWebhookSecret: true } as any
        });
        return {
            success: true,
            data: {
                zohoApiKey: settings?.zohoApiKey || "",
                zeptoMailUrl: (settings as any)?.zeptoMailUrl || "",
                zeptoMailSender: (settings as any)?.zeptoMailSender || "",
                zeptoMailWebhookSecret: (settings as any)?.zeptoMailWebhookSecret || ""
            }
        };
    });
}

export async function updateEmailApiSettings(data: { zohoApiKey: string, zeptoMailUrl?: string, zeptoMailSender?: string, zeptoMailWebhookSecret?: string }): Promise<ActionResult<void>> {
    return createAction("updateEmailApiSettings", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Only Owners can manage API keys." };

        const settings = await prisma.settings.findUnique({ where: { company: PRIMARY_COMPANY } });
        const settingsId = settings?.id || 1;

        await prisma.settings.upsert({
            where: { company: PRIMARY_COMPANY },
            update: {
                zohoApiKey: data.zohoApiKey || null,
                zeptoMailUrl: data.zeptoMailUrl || null,
                zeptoMailSender: data.zeptoMailSender || null,
                zeptoMailWebhookSecret: data.zeptoMailWebhookSecret || null
            } as any,
            create: {
                company: PRIMARY_COMPANY,
                companyName: "Your Company",
                email: "admin@yourcompany.com",
                address: "",
                currency: "৳ BDT",
                taxRate: 0,
                defaultPaymentTerms: "Net 30",
                zohoApiKey: data.zohoApiKey || null,
                zeptoMailUrl: data.zeptoMailUrl || null,
                zeptoMailSender: data.zeptoMailSender || null,
                zeptoMailWebhookSecret: data.zeptoMailWebhookSecret || null
            } as any
        });

        revalidatePath("/settings/email-api");
        return { success: true, data: undefined };
    });
}
