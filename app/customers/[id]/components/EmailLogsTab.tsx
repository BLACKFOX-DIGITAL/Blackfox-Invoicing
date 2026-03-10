"use client";

import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { Mail, CheckCircle2, XCircle, Clock } from "lucide-react";

// Email logs would typically come from an email service - for now show empty state
export default function EmailLogsTab() {
    const emailLogs: any[] = [];

    return (
        <Card>
            {emailLogs.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                    <Mail size={24} className="mx-auto mb-2 opacity-50" />
                    <p>No email logs found for this customer.</p>
                    <p className="text-xs mt-1">Email logs will appear here once emails are sent.</p>
                </div>
            ) : (
                <Table
                    headers={["Date", "Subject", "Type", "Status"]}
                    data={emailLogs}
                    renderRow={(row, i) => (
                        <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                            <td className="px-6 py-4 text-text-muted">{row.date}</td>
                            <td className="px-6 py-4 font-medium text-text-main">{row.subject}</td>
                            <td className="px-6 py-4 text-text-muted">{row.type}</td>
                            <td className="px-6 py-4">
                                <Badge variant={row.status === "Sent" ? "success" : row.status === "Failed" ? "error" : "warning"}>
                                    {row.status}
                                </Badge>
                            </td>
                        </tr>
                    )}
                />
            )}
        </Card>
    );
}
