import Card from "@/components/ui/Card";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function MiniDashboard({ customer, onViewLog }: { customer: any, onViewLog?: () => void }) {
    return (
        <div className="flex flex-col gap-6">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex flex-col justify-center">
                    <div className="text-sm text-text-muted mb-1">Active Services</div>
                    <div className="text-2xl font-bold text-text-main">{customer.stats.totalServices}</div>
                </Card>
                <Card className="flex flex-col justify-center">
                    <div className="text-sm text-text-muted mb-1">Total Images Logged</div>
                    <div className="text-2xl font-bold text-text-main">{customer.stats.totalImages?.toLocaleString() || customer.stats.totalUnits}</div>
                    <div className="text-xs text-text-muted mt-1">Lifetime Volume</div>
                </Card>
                <Card className="flex flex-col justify-center">
                    <div className="text-sm text-text-muted mb-1">Unpaid Balance</div>
                    <div className="text-2xl font-bold text-status-error">{customer.stats.balance}</div>
                </Card>
                <Card className="flex flex-col justify-center">
                    <div className="text-sm text-text-muted mb-1">Last Work Log</div>
                    <div className="text-sm font-medium text-text-main truncate" title={customer.stats.lastWorkLog}>
                        {customer.stats.lastWorkLog || "No recent work"}
                    </div>
                    <div className="text-xs text-text-muted mt-1">{customer.stats.lastActivity}</div>
                </Card>
            </div>

            {/* Health Alerts */}
            <div className="flex flex-col gap-3">
                {customer.stats.daysInactive > 30 && (
                    <div className="flex items-center justify-between p-4 bg-status-warning/10 border border-status-warning/20 rounded-md text-status-warning">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={18} />
                            <span className="font-medium">Inactive for {customer.stats.daysInactive} days</span>
                        </div>
                        <button className="text-sm font-semibold hover:underline">Send Check-in Email</button>
                    </div>
                )}

                {customer.stats.overdueInvoice && (
                    <div className="flex items-center justify-between p-4 bg-status-error/10 border border-status-error/20 rounded-md text-status-error">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={18} />
                            <span className="font-medium">
                                Overdue Invoice #{customer.stats.overdueInvoice.id} (${Number(customer.stats.overdueInvoice.amount).toFixed(2)})
                            </span>
                        </div>
                        <button className="text-sm font-semibold hover:underline">Send Reminder</button>
                    </div>
                )}

                {customer.stats.lastWorkLog !== "No recent work" && customer.stats.daysInactive <= 7 && (
                    <div className="flex items-center justify-between p-4 bg-status-success/10 border border-status-success/20 rounded-md text-status-success">
                        <div className="flex items-center gap-3">
                            <CheckCircle size={18} />
                            <span className="font-medium">Work logged recently</span>
                        </div>
                        <button onClick={onViewLog} className="text-sm font-semibold hover:underline">View Log</button>
                    </div>
                )}
            </div>
        </div>
    );
}
