"use server"

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

const prisma = new PrismaClient()

export async function createSetupAdmin(params: { name: string, email: string, password: string }) {
    // SECURITY CHECK: Ensure there are no users yet!
    const userCount = await prisma.user.count()
    if (userCount > 0) {
        throw new Error("Setup already completed! You cannot create another admin this way.")
    }

    const { name, email, password } = params

    if (!name || !email || !password || password.length < 6) {
        return { error: "Please provide a name, a valid email, and a password of at least 6 characters." }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'Owner'
            }
        })
        
        // Setup initial default settings
        await prisma.settings.create({
            data: {
                companyName: "My Company",
                email: email,
                address: "",
                currency: "USD",
                taxRate: 0,
                defaultPaymentTerms: "due_on_receipt",
                logoUrl: "",
            }
        })
    } catch (err: any) {
        return { error: err.message || "Something went wrong" }
    }

    // Redirect to login after successful creation
    redirect("/login")
}
