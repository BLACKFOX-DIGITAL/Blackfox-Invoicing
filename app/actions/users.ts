"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth, hasRole, ROLES } from "@/auth";
import bcrypt from "bcryptjs";
import { ActionResult } from "@/lib/types";
import { createAction } from "@/lib/action-utils";

export async function getUsers(): Promise<ActionResult<any[]>> {
    return createAction("getUsers", async () => {
        const isAuthorized = await hasRole([ROLES.OWNER]);
        if (!isAuthorized) return { success: false, error: "Unauthorized: Only Owners can view users." };

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                company: true,
                createdAt: true,
            }
        });
        return { success: true, data: users };
    });
}


export async function createUser(data: { name: string; email: string; password: string; role: string; company?: string }): Promise<ActionResult<any>> {
    const isAuthorized = await hasRole([ROLES.OWNER]);
    if (!isAuthorized) return { success: false, error: "Unauthorized: Only Owners can create users." };
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            return { success: false, error: "User with this email already exists" };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role,
                company: data.company || "blackfox",
            }
        });

        revalidatePath("/settings/users");
        return { success: true, data: newUser };
    } catch (error) {
        console.error("Failed to create user:", error);
        return { success: false, error: "Failed to create user" };
    }
}

export async function deleteUser(id: string): Promise<ActionResult<void>> {
    const isAuthorized = await hasRole([ROLES.OWNER]);
    if (!isAuthorized) return { success: false, error: "Unauthorized: Only Owners can delete users." };
    try {
        // Prevent deleting the last Owner
        const user = await prisma.user.findUnique({ where: { id } });
        if (user?.role === "Owner") {
            const ownerCount = await prisma.user.count({ where: { role: "Owner" } });
            if (ownerCount <= 1) {
                return { success: false, error: "Cannot delete the last Owner account." };
            }
        }

        await prisma.user.delete({
            where: { id }
        });

        revalidatePath("/settings/users");
        return { success: true, data: undefined };
    } catch (error) {
        console.error("Failed to delete user:", error);
        return { success: false, error: "Failed to delete user" };
    }
}
