"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CheckCheck, Bell, Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { formatDate } from "@/lib/format";
import type { AuditNotification } from "@/app/actions/audit";

interface Props {
    initialNotifications: AuditNotification[];
}

export default function NotificationsContent({ initialNotifications }: Props) {
    const [notifications, setNotifications] = useState(initialNotifications);
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle2 size={18} className="text-status-success" />;
            case "warning": return <AlertTriangle size={18} className="text-status-warning" />;
            case "error": return <XCircle size={18} className="text-status-error" />;
            default: return <Info size={18} className="text-primary" />;
        }
    };

    const handleMarkRead = (id: string) =>
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));

    const handleMarkAllRead = () =>
        setNotifications(notifications.map(n => ({ ...n, read: true })));

    const filtered = notifications.filter(n => {
        if (filterType !== "all" && n.type !== filterType) return false;
        if (filterStatus === "unread" && n.read) return false;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-text-main">Notifications</h1>
                    {unreadCount > 0 && (
                        <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <Button variant="ghost" onClick={handleMarkAllRead} className="text-text-muted hover:text-primary">
                    <CheckCheck size={16} className="mr-2" /> Mark all as read
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-bg-surface p-4 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-muted">Status:</span>
                    <select
                        className="bg-bg-app border border-border-subtle rounded-md px-2 py-1 text-sm text-text-main focus:outline-none focus:border-primary"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="unread">Unread</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-muted">Type:</span>
                    <select
                        className="bg-bg-app border border-border-subtle rounded-md px-2 py-1 text-sm text-text-main focus:outline-none focus:border-primary"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="success">Success</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>
                <span className="text-xs text-text-muted ml-auto">Showing last {notifications.length} activities</span>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border-subtle text-text-muted text-sm font-medium">
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Activity</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                filtered.map((notif) => (
                                    <tr
                                        key={notif.id}
                                        className={clsx(
                                            "border-b border-border-subtle last:border-0 hover:bg-bg-app/50 transition-colors",
                                            !notif.read ? "bg-primary/5" : ""
                                        )}
                                    >
                                        <td className="px-6 py-4 w-[120px]">
                                            <div className="flex items-center gap-2">
                                                {getIcon(notif.type)}
                                                <span className="capitalize text-xs font-medium text-text-muted">{notif.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={clsx("text-sm text-text-main mb-0.5", !notif.read ? "font-bold" : "font-medium")}>
                                                    {notif.title}
                                                    {!notif.read && <span className="ml-2 w-2 h-2 rounded-full bg-primary inline-block" />}
                                                </span>
                                                <span className="text-sm text-text-muted">{notif.message}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted text-sm whitespace-nowrap w-[200px]">
                                            {formatDate(notif.date)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!notif.read && (
                                                <button
                                                    onClick={() => handleMarkRead(notif.id)}
                                                    className="text-xs text-primary hover:underline font-medium"
                                                >
                                                    Mark as read
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-text-muted">
                                        <Bell size={24} className="mx-auto mb-2 opacity-20" />
                                        No notifications found matching filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
