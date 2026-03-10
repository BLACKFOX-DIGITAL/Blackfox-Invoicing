import RemindersContent from "@/components/reminders/RemindersContent";

export const metadata = {
    title: "Reminders | Invofox 2.0",
    description: "Manage your tasks and reminders",
};

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RemindersPage() {
    const session = await auth();
    if (session?.user?.role !== "Owner") {
        redirect("/dashboard");
    }

    return <RemindersContent />;
}
