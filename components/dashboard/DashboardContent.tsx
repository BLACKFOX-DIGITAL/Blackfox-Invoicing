"use client";

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    Users, DollarSign, AlertCircle, FileText,
    Clock, Plus, Mail, ArrowUpRight, ArrowDownRight, MoreHorizontal,
    Wrench, ClipboardList, Image as ImageIcon
} from 'lucide-react';
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Link from 'next/link';
import { useRole } from "@/lib/roleContext";
import { getCurrencySymbol, formatCustomerDisplay } from "@/lib/format";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface DashboardContentProps {
    stats: {
        totalRevenue: number;
        activeCustomers: number;
        pendingInvoices: number;
        activeServices: number;
        totalWorkLogs?: number;
        unbilledWorkLogs?: number;
        totalImagesProcessed?: number;
        imageStats?: {
            thisMonth: number;
            lastMonth: number;
            thisYear: number;
        };
    };
    recentActivity: any[];
    topCustomers?: any[];
    settings?: any;
    dormantCount?: number;
}

export default function DashboardContent({ stats, recentActivity, topCustomers = [], settings, dormantCount = 0 }: DashboardContentProps) {
    const { role } = useRole();
    const isRestricted = role === "Worker" || role === "Manager";

    const totalRevenue = stats.totalRevenue;
    const totalImagesProcessed = stats.totalImagesProcessed || 0;
    const pendingInvoices = stats.pendingInvoices;
    const totalWorkLogs = stats.totalWorkLogs || 0;
    const unbilledWorkLogs = stats.unbilledWorkLogs || 0;

    // Calculate unpaid from recentActivity or stats
    const unpaidBalance = 0; // This would come from actual invoice data

    if (isRestricted) {
        const imageStats = stats.imageStats || { thisMonth: 0, lastMonth: 0, thisYear: 0 };

        // RESTRICTED VIEW: Strictly non-financial (Worker & Manager)
        return (
            <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">
                <DashboardHeader />
                <h2 className="text-xl font-bold text-text-main tracking-tight">Image Processing Overview</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* This Month */}
                    <Card className="h-full hover:shadow-md transition-shadow p-6 bg-primary/5 border-primary/20">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Processed This Month</h3>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <ImageIcon size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-text-main mb-1">{imageStats.thisMonth}</div>
                            <span className="text-xs text-text-muted">Images processed since {new Date().toLocaleDateString('default', { day: '2-digit' })} of this month</span>
                        </div>
                    </Card>

                    {/* Last Month */}
                    <Card className="h-full hover:shadow-md transition-shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Last Month</h3>
                            <div className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                                <ImageIcon size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-text-main mb-1">{imageStats.lastMonth}</div>
                            <span className="text-xs text-text-muted">Images processed in previous month</span>
                        </div>
                    </Card>

                    {/* This Year */}
                    <Card className="h-full hover:shadow-md transition-shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">This Year</h3>
                            <div className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                                <ImageIcon size={16} />
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-text-main mb-1">{imageStats.thisYear}</div>
                            <span className="text-xs text-text-muted">Total images processed in {new Date().getFullYear()}</span>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    // OWNER VIEW (Default)
    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">
            <DashboardHeader />

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                <Link href="/customers" className="block group">
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full bg-primary text-white border-primary relative overflow-hidden p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">Customers</h3>
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Users size={12} />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <div className="text-2xl font-bold mb-1">{stats.activeCustomers}</div>
                            <span className="text-[10px] font-medium opacity-80 bg-white/10 px-1.5 py-0.5 rounded">Active</span>
                        </div>
                    </Card>
                </Link>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Revenue</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <ArrowUpRight size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {(() => {
                                const currency = settings?.currency || "USD";
                                const symbol = getCurrencySymbol(currency);
                                return `${symbol}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
                            })()}
                        </div>
                        <span className="text-[10px] font-medium text-text-muted bg-text-muted/10 px-1.5 py-0.5 rounded">Total Revenue</span>
                    </div>
                </Card>

                <Link href="/invoices" className="block group">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Services</h3>
                            <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                                <Wrench size={12} />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-main mb-1">{stats.activeServices}</div>
                            <span className="text-[10px] font-medium text-text-dim px-1.5 py-0.5 rounded bg-bg-surface-hover">Active</span>
                        </div>
                    </Card>
                </Link>

                <Link href="/invoices" className="block group">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Open</h3>
                            <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                                <ArrowUpRight size={12} />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-main mb-1">{pendingInvoices}</div>
                            <span className="text-[10px] font-medium text-text-dim px-1.5 py-0.5 rounded bg-bg-surface-hover">Invoices</span>
                        </div>
                    </Card>
                </Link>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Work Logs</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <ClipboardList size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">{totalWorkLogs}</div>
                        <span className="text-[10px] font-medium text-text-muted bg-text-muted/10 px-1.5 py-0.5 rounded">{unbilledWorkLogs} Unbilled</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between bg-status-warning/5 border-status-warning/20">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-status-warning uppercase tracking-wider">At Risk</h3>
                        <div className="w-6 h-6 rounded-full border border-status-warning/30 flex items-center justify-center text-status-warning">
                            <AlertCircle size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">{dormantCount}</div>
                        <span className="text-[10px] font-medium text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded">Customers &gt; 30d</span>
                    </div>
                </Card>
            </div>

            {/* Row 2: Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                    <h3 className="text-lg font-bold text-text-main mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/work-logs" className="flex flex-col items-center p-4 bg-bg-surface rounded-lg hover:bg-bg-surface-hover transition-colors">
                            <ClipboardList size={24} className="text-primary mb-2" />
                            <span className="text-sm font-medium text-text-main">Log Work</span>
                        </Link>
                        <Link href="/invoices" className="flex flex-col items-center p-4 bg-bg-surface rounded-lg hover:bg-bg-surface-hover transition-colors">
                            <FileText size={24} className="text-primary mb-2" />
                            <span className="text-sm font-medium text-text-main">New Invoice</span>
                        </Link>
                        <Link href="/customers/new" className="flex flex-col items-center p-4 bg-bg-surface rounded-lg hover:bg-bg-surface-hover transition-colors">
                            <Users size={24} className="text-primary mb-2" />
                            <span className="text-sm font-medium text-text-main">Add Customer</span>
                        </Link>
                        <Link href="/services" className="flex flex-col items-center p-4 bg-bg-surface rounded-lg hover:bg-bg-surface-hover transition-colors">
                            <Wrench size={24} className="text-primary mb-2" />
                            <span className="text-sm font-medium text-text-main">New Service</span>
                        </Link>
                    </div>
                </Card>

                {/* Recent Activity */}
                <Card className="col-span-1 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-text-main">Recent Activity</h3>
                        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">View All</Button>
                    </div>
                    <div className="space-y-6">
                        {recentActivity.length === 0 ? (
                            <p className="text-text-muted text-sm text-center py-4">No recent activity</p>
                        ) : (
                            recentActivity.map((item) => (
                                <div key={item.id} className="flex items-start gap-4 group">
                                    <div className={`mt-1 w-2 h-2 rounded-full ring-4 ring-opacity-20 flex-shrink-0 ${item.type === 'invoice' ? 'bg-blue-500 ring-blue-500' :
                                        item.type === 'payment' ? 'bg-green-500 ring-green-500' :
                                            item.type === 'work' ? 'bg-purple-500 ring-purple-500' :
                                                'bg-gray-400 ring-gray-400'
                                        }`} />
                                    <div className="flex-1 pb-6 border-b border-border-subtle group-last:border-0 group-last:pb-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-semibold text-text-main">{item.action}</p>
                                                <p className="text-xs text-text-muted mt-0.5">
                                                    <span className="font-medium text-text-main">{item.target}</span> • {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted bg-bg-surface px-2 py-1 rounded-full">
                                                {item.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Row 3: Top Customers */}
            {topCustomers.length > 0 && (
                <div className="grid grid-cols-1">
                    <Card title="Top Customers">
                        <div className="mt-4 space-y-4">
                            {topCustomers.slice(0, 5).map((customer, i) => (
                                <div key={customer.id} className="flex items-center justify-between p-3 bg-bg-app rounded-lg border border-border-subtle">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="medium text-text-main text-sm">{formatCustomerDisplay(customer)}</div>
                                            <div className="text-xs text-text-muted">{customer.email}</div>
                                        </div>
                                    </div>
                                    <Badge variant={customer.status === "Active" ? "success" : "secondary"}>{customer.status}</Badge>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" className="w-full mt-2" href="/customers">View All Customers</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
