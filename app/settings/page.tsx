import { getSettings } from "@/app/actions/settings";
import SettingsForm from "@/components/settings/SettingsForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Settings | Invofox",
    description: "Configure your company profile, financial defaults, and appearance.",
};

/**
 * QA-04 fix: Converted from a "use client" + useEffect waterfall to a proper
 * Server Component. Settings are fetched on the server and passed as props to
 * the SettingsForm client component — no loading spinner, no flash of empty state.
 */
export default async function SettingsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    const result = await getSettings();
    const settings = result.success && result.data ? result.data : null;

    if (!settings) {
        return (
            <div className="flex h-screen items-center justify-center text-text-muted">
                Failed to load settings. Please try refreshing.
            </div>
        );
    }

    return <SettingsForm initialSettings={settings} />;
}
