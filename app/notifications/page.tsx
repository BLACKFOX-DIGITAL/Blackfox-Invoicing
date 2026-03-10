import { getAuditNotifications } from "@/app/actions/audit";
import NotificationsContent from "@/components/notifications/NotificationsContent";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Notifications | Invofox",
    description: "Activity log and system notifications",
};

export default async function NotificationsPage() {
    const result = await getAuditNotifications();
    const notifications = result.success ? result.data : [];

    return <NotificationsContent initialNotifications={notifications} />;
}
