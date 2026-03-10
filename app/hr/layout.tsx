import { ReactNode } from "react";
import { auth, ROLES } from "@/auth";
import { redirect } from "next/navigation";

export default async function HRLayout({ children }: { children: ReactNode }) {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role === ROLES.VENDOR_WORKER) {
        redirect("/work-logs");
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-10">
            {children}
        </div>
    );
}
