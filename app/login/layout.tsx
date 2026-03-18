import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"

export default async function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // If no users exist, force redirect to /setup so they can create the master admin
    const userCount = await prisma.user.count()
    if (userCount === 0) {
        redirect("/setup")
    }

    return (
        <section>
            {children}
        </section>
    )
}
