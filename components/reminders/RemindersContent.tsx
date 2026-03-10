"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { ListTodo, Play, RefreshCw, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { getEmailLogs } from "@/app/actions/email-logs";
import { getQueuedReminders, snoozeInvoice, getSnoozedReminders, snoozeMultipleInvoices, unsnoozeInvoices } from "@/app/actions/reminders";
import clsx from "clsx";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDate, formatCurrency } from "@/lib/format";

export default function RemindersContent() {
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [queuedLogs, setQueuedLogs] = useState<any[]>([]);
    const [snoozedLogs, setSnoozedLogs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"history" | "queued" | "snoozed">("queued");
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedQueued, setSelectedQueued] = useState<string[]>([]);
    const [selectedSnoozed, setSelectedSnoozed] = useState<string[]>([]);
    const toast = useToast();

    const fetchAllData = async () => {
        setLoading(true);
        const [historyRes, queuedRes, snoozedRes] = await Promise.all([
            getEmailLogs(),
            getQueuedReminders(),
            getSnoozedReminders()
        ]);

        if (historyRes.success) setHistoryLogs(historyRes.data);
        if (queuedRes.success) setQueuedLogs(queuedRes.data);
        if (snoozedRes.success) setSnoozedLogs(snoozedRes.data);

        setSelectedQueued([]);
        setSelectedSnoozed([]);
        setLoading(false);
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleProcessReminders = async () => {
        setProcessing(true);
        try {
            const res = await fetch("/api/reminders/process", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                toast.success(`Processed ${data.processed} reminders.`);
                fetchAllData();
            } else {
                toast.error(`Error: ${data.error}`);
            }
        } catch (err) {
            toast.error("Failed to process reminders");
        } finally {
            setProcessing(false);
        }
    };

    const handleSnooze = async (id: string) => {
        const result = await snoozeInvoice(id, 7);
        if (result.success) {
            toast.success(`Reminder for ${id} snoozed for 7 days.`);
            fetchAllData();
        } else {
            toast.error("Failed to snooze reminder");
        }
    };

    const handleBatchSnooze = async () => {
        if (selectedQueued.length === 0) return;
        const result = await snoozeMultipleInvoices(selectedQueued, 7);
        if (result.success) {
            toast.success(`${selectedQueued.length} reminders snoozed for 7 days.`);
            fetchAllData();
        } else {
            toast.error("Failed to snooze reminders");
        }
    };

    const handleBatchUnsnooze = async () => {
        if (selectedSnoozed.length === 0) return;
        const result = await unsnoozeInvoices(selectedSnoozed);
        if (result.success) {
            toast.success(`${selectedSnoozed.length} reminders unsnoozed.`);
            fetchAllData();
        } else {
            toast.error("Failed to unsnooze reminders");
        }
    };

    const handleUnsnooze = async (id: string) => {
        const result = await unsnoozeInvoices([id]);
        if (result.success) {
            toast.success(`Reminder for ${id} unsnoozed.`);
            fetchAllData();
        } else {
            toast.error("Failed to unsnooze reminder");
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Reminders</h1>
                    <p className="text-text-muted mt-2">Manage automated email reminders for invoices.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={fetchAllData} disabled={loading}>
                        <RefreshCw size={18} className={clsx(loading && "animate-spin")} />
                    </Button>
                    <Button onClick={handleProcessReminders} disabled={processing} className="flex items-center gap-2">
                        {processing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                        Run Reminders Now
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-main">Upcoming</h3>
                        <p className="text-sm text-text-muted mt-1">Sent 3 days before due date</p>
                    </div>
                </Card>
                <Card className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-main">Due Today</h3>
                        <p className="text-sm text-text-muted mt-1">Sent on the due date</p>
                    </div>
                </Card>
                <Card className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
                        <ListTodo size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-main">Overdue</h3>
                        <p className="text-sm text-text-muted mt-1">3 days after + every 15 days</p>
                    </div>
                </Card>
            </div>

            <div className="flex gap-4 border-b border-border-subtle px-2">
                <button
                    onClick={() => setActiveTab("queued")}
                    className={clsx(
                        "pb-4 px-2 text-sm font-semibold transition-colors relative",
                        activeTab === "queued" ? "text-primary" : "text-text-muted hover:text-text-main"
                    )}
                >
                    Queued / Upcoming
                    {activeTab === "queued" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab("snoozed")}
                    className={clsx(
                        "pb-4 px-2 text-sm font-semibold transition-colors relative",
                        activeTab === "snoozed" ? "text-primary" : "text-text-muted hover:text-text-main"
                    )}
                >
                    Snoozed
                    {activeTab === "snoozed" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={clsx(
                        "pb-4 px-2 text-sm font-semibold transition-colors relative",
                        activeTab === "history" ? "text-primary" : "text-text-muted hover:text-text-main"
                    )}
                >
                    History / Activity
                    {activeTab === "history" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
            </div>

            <Card className="overflow-hidden">
                {activeTab === "queued" ? (
                    <>
                        <div className="p-6 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-text-main">Queued Reminders</h3>
                                <p className="text-sm text-text-muted">Invoices that will trigger a reminder in the next 7 days.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {selectedQueued.length > 0 && (
                                    <Button variant="secondary" onClick={handleBatchSnooze}>
                                        Snooze Selected ({selectedQueued.length})
                                    </Button>
                                )}
                                <Badge variant="info">{queuedLogs.length} Pending</Badge>
                            </div>
                        </div>
                        <Table
                            headers={[
                                <input
                                    key="selectAllQueued"
                                    type="checkbox"
                                    checked={selectedQueued.length === queuedLogs.length && queuedLogs.length > 0}
                                    onChange={(e) => setSelectedQueued(e.target.checked ? queuedLogs.map(l => l.id) : [])}
                                    className="cursor-pointer"
                                />,
                                "Scheduled Date", "Recipient", "Invoice", "Next Trigger", "Action"
                            ]}
                            data={queuedLogs}
                            renderRow={(rem, i) => (
                                <tr key={rem.id || i} className="hover:bg-bg-app/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedQueued.includes(rem.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedQueued(prev => [...prev, rem.id]);
                                                else setSelectedQueued(prev => prev.filter(id => id !== rem.id));
                                            }}
                                            className="cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-main font-medium">
                                        {formatDate(rem.reminderDate)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-text-main">{rem.customerName}</span>
                                            <span className="text-xs text-text-muted">{rem.customerEmail}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-primary">{rem.id}</span>
                                            <span className="text-xs text-text-muted">{formatCurrency(rem.amount, rem.currency)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="warning">{rem.type}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button variant="secondary" size="sm" onClick={() => handleSnooze(rem.id)}>
                                            Snooze 7d
                                        </Button>
                                    </td>
                                </tr>
                            )}
                        />
                        {queuedLogs.length === 0 && !loading && (
                            <div className="p-12 text-center text-text-muted">No reminders queued for the next 7 days.</div>
                        )}
                    </>
                ) : activeTab === "snoozed" ? (
                    <>
                        <div className="p-6 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-text-main">Snoozed Reminders</h3>
                                <p className="text-sm text-text-muted">Invoices that have had their reminders temporarily paused.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {selectedSnoozed.length > 0 && (
                                    <Button variant="secondary" onClick={handleBatchUnsnooze}>
                                        Unsnooze Selected ({selectedSnoozed.length})
                                    </Button>
                                )}
                                <Badge variant="warning">{snoozedLogs.length} Snoozed</Badge>
                            </div>
                        </div>
                        <Table
                            headers={[
                                <input
                                    key="selectAllSnoozed"
                                    type="checkbox"
                                    checked={selectedSnoozed.length === snoozedLogs.length && snoozedLogs.length > 0}
                                    onChange={(e) => setSelectedSnoozed(e.target.checked ? snoozedLogs.map(l => l.id) : [])}
                                    className="cursor-pointer"
                                />,
                                "Snoozed Until", "Recipient", "Invoice", "Action"
                            ]}
                            data={snoozedLogs}
                            renderRow={(rem, i) => (
                                <tr key={rem.id || i} className="hover:bg-bg-app/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedSnoozed.includes(rem.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedSnoozed(prev => [...prev, rem.id]);
                                                else setSelectedSnoozed(prev => prev.filter(id => id !== rem.id));
                                            }}
                                            className="cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-main font-medium text-amber-600">
                                        {formatDate(rem.snoozedUntil)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-text-main">{rem.customerName}</span>
                                            <span className="text-xs text-text-muted">{rem.customerEmail}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-primary">{rem.id}</span>
                                            <span className="text-xs text-text-muted">{formatCurrency(rem.amount, rem.currency)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button variant="secondary" size="sm" onClick={() => handleUnsnooze(rem.id)}>
                                            Unsnooze
                                        </Button>
                                    </td>
                                </tr>
                            )}
                        />
                        {snoozedLogs.length === 0 && !loading && (
                            <div className="p-12 text-center text-text-muted">No snoozed reminders found.</div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="p-6">
                            <h3 className="font-bold text-lg text-text-main">Recent Activity</h3>
                        </div>
                        <Table
                            headers={["Date", "Recipient", "Subject", "Status"]}
                            data={historyLogs}
                            renderRow={(log, i) => (
                                <tr key={log.id || i} className="hover:bg-bg-app/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-text-muted">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-text-main">
                                        {log.to}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-main">
                                        {log.subject}
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            let variant: "default" | "success" | "warning" | "error" | "info" = "default";
                                            let Icon = CheckCircle;

                                            switch (log.status) {
                                                case "Sent":
                                                    variant = "default"; // Gray
                                                    Icon = CheckCircle;
                                                    break;
                                                case "Delivered":
                                                    variant = "info"; // Blue
                                                    Icon = CheckCircle;
                                                    break;
                                                case "Opened":
                                                case "Clicked":
                                                    variant = "success"; // Green
                                                    Icon = CheckCircle;
                                                    break;
                                                case "Bounced":
                                                case "Failed":
                                                    variant = "error"; // Red
                                                    Icon = AlertCircle;
                                                    break;
                                                default:
                                                    variant = "default";
                                            }

                                            return (
                                                <Badge variant={variant}>
                                                    <Icon size={12} className="mr-1" />
                                                    {log.status}
                                                </Badge>
                                            );
                                        })()}
                                        {log.errorMsg && <div className="text-xs text-status-error mt-1">{log.errorMsg}</div>}
                                    </td>
                                </tr>
                            )}
                        />
                        {historyLogs.length === 0 && !loading && (
                            <div className="p-12 text-center text-text-muted">No history found.</div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}
