import { getEmailLogs, getEmailLogStats } from "@/app/actions/email-logs";
import EmailLogsContent from "@/components/email-logs/EmailLogsContent";

export default async function EmailLogsPage() {
    const [logsResult, statsResult] = await Promise.all([
        getEmailLogs(),
        getEmailLogStats()
    ]);

    const logs = logsResult.success ? logsResult.data : [];
    const stats = statsResult.success ? statsResult.data : { total: 0, sent: 0, failed: 0 };

    return <EmailLogsContent logs={logs} stats={stats} />;
}
