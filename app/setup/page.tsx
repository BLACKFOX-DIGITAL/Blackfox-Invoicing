import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import SetupForm from "./SetupForm"

export const dynamic = "force-dynamic"

export default async function SetupPage() {
    const userCount = await prisma.user.count()
    
    // If an admin/user already exists, don't allow setup
    if (userCount > 0) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-700" />
            </div>
            <div className="w-full max-w-md relative z-10">
                <SetupForm />
            </div>
        </div>
    )
}
