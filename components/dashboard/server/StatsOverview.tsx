import { getDashboardStats } from "@/app/actions/dashboard";
import Card from "@/components/ui/Card";
import { Users, DollarSign, AlertCircle, Wrench, ArrowUpRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { getCurrencySymbol } from "@/lib/format";
import { getSettings } from "@/app/actions/settings";

interface StatsOverviewProps {
    searchParams: { from?: string, to?: string };
}

export default async function StatsOverview({ searchParams }: StatsOverviewProps) {
    const from = searchParams.from ? new Date(searchParams.from) : undefined;
    const to = searchParams.to ? new Date(searchParams.to) : undefined;

    const [statsResult, settingsResult] = await Promise.all([
        getDashboardStats(from, to),
        getSettings()
    ]);

    const stats = statsResult.success ? statsResult.data : {
        totalRevenue: 0,
        activeCustomers: 0,
        pendingInvoices: 0,
        activeServices: 0,
        imageStats: { thisMonth: 0, lastMonth: 0, thisYear: 0 }
    };

    const settings = settingsResult.success ? settingsResult.data : null;
    const currency = settings?.currency || "USD";
    const symbol = getCurrencySymbol(currency);

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Link href="/customers" className="block group">
                <Card className="hover:shadow-lg transition-all cursor-pointer h-full bg-primary text-white border-primary relative overflow-hidden p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">Customers</h3>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className="text-3xl font-bold mb-1">{stats.activeCustomers}</div>
                        <span className="text-[10px] font-medium opacity-80 bg-white/10 px-2 py-1 rounded">Active</span>
                    </div>
                </Card>
            </Link>

            <Card className="h-full hover:shadow-md transition-shadow p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Revenue</h3>
                    <div className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                        <DollarSign size={16} />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-text-main mb-1">
                        {symbol}{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <span className="text-[10px] font-medium text-text-muted bg-text-muted/10 px-2 py-1 rounded">Total Revenue</span>
                </div>
            </Card>

            <Link href="/invoices" className="block group">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Open Invoices</h3>
                        <div className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <ArrowUpRight size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-text-main mb-1">{stats.pendingInvoices}</div>
                        <span className="text-[10px] font-medium text-text-dim px-2 py-1 rounded bg-bg-surface-hover">Pending</span>
                    </div>
                </Card>
            </Link>

            <Link href="/services" className="block group">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Services</h3>
                        <div className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Wrench size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-text-main mb-1">{stats.activeServices}</div>
                        <span className="text-[10px] font-medium text-text-dim px-2 py-1 rounded bg-bg-surface-hover">Services</span>
                    </div>
                </Card>
            </Link>
        </div>
    );
}
