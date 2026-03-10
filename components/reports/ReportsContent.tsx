"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download, TrendingUp, Users, DollarSign, Image as ImageIcon, BarChart3, Calendar, Filter } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useToast } from "@/components/ui/ToastProvider";

interface ReportsContentProps {
    totalRevenue: number;
    avgRevenuePerCustomer: number;
    totalWorkUnits: number;
    activeCustomers: number;
    revenueData: { name: string; revenue: number }[];
    workVolume: { name: string; units: number }[];
    customerActivity: { name: string; value: number; color: string }[];
    initialFilters: {
        startDate?: string;
        endDate?: string;
        groupBy: "day" | "week" | "month";
    };
}

export default function ReportsContent({
    totalRevenue,
    avgRevenuePerCustomer,
    totalWorkUnits,
    activeCustomers,
    revenueData,
    workVolume,
    customerActivity,
    initialFilters
}: ReportsContentProps) {
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleExportCSV = () => {
        try {
            // Build CSV for Revenue
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Type,Period,Value\n";

            revenueData.forEach(row => {
                csvContent += `Revenue,${row.name},${row.revenue}\n`;
            });

            workVolume.forEach(row => {
                csvContent += `Work Volume,${row.name},${row.units}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `invofox_report_${initialFilters.groupBy}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Report exported successfully.");
        } catch (err) {
            toast.error("Failed to export report.");
        }
    };

    const hasData = revenueData.length > 0 || workVolume.length > 0 || totalRevenue > 0;

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Reports & Analytics</h1>
                    <p className="text-text-muted text-sm mt-1">Track financial performance and operational metrics</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2">
                        <Download size={16} /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 block">Start Date</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="date"
                                    value={initialFilters.startDate || ""}
                                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all color-scheme-dark"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 block">End Date</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="date"
                                    value={initialFilters.endDate || ""}
                                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all color-scheme-dark"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 block">Group By</label>
                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <select
                                    value={initialFilters.groupBy}
                                    onChange={(e) => handleFilterChange("groupBy", e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer"
                                >
                                    <option value="day">Daily</option>
                                    <option value="week">Weekly</option>
                                    <option value="month">Monthly</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Total Revenue</p>
                        <p className="text-2xl font-bold text-text-main">৳{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </Card>

                <Card className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-status-success/10 rounded-lg text-status-success">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Avg. Revenue/Customer</p>
                        <p className="text-2xl font-bold text-text-main">৳{avgRevenuePerCustomer.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </Card>

                <Card className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-status-warning/10 rounded-lg text-status-warning">
                            <ImageIcon size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Total Work Units</p>
                        <p className="text-2xl font-bold text-text-main">{totalWorkUnits.toLocaleString()}</p>
                    </div>
                </Card>

                <Card className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Active Customers</p>
                        <p className="text-2xl font-bold text-text-main">{activeCustomers}</p>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            {hasData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-text-main mb-4">Revenue ({initialFilters.groupBy})</h3>
                        {revenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="name" stroke="#888" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="#888" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-text-muted italic">
                                No revenue data for this period
                            </div>
                        )}
                    </Card>

                    {/* Work Volume Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-text-main mb-4">Work Volume ({initialFilters.groupBy})</h3>
                        {workVolume.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={workVolume}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="name" stroke="#888" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="#888" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Line type="monotone" dataKey="units" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-text-muted italic">
                                No work log data for this period
                            </div>
                        )}
                    </Card>

                    {/* Customer Activity Pie Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-text-main mb-4">Customer Status</h3>
                        {customerActivity.some(c => c.value > 0) ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={customerActivity.filter(c => c.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        dataKey="value"
                                        label={(props: any) => `${props.name}: ${props.value}`}
                                    >
                                        {customerActivity.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-text-muted italic">
                                No customer data available
                            </div>
                        )}
                    </Card>

                    {/* Summary Card */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-text-main mb-4">Quick Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-text-muted">Total Customers</span>
                                <span className="font-bold text-text-main">{customerActivity.reduce((sum, c) => sum + c.value, 0)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-text-muted">Total Work Units Logged</span>
                                <span className="font-bold text-text-main">{totalWorkUnits.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-text-muted">Revenue Collected</span>
                                <span className="font-bold text-status-success">৳{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-text-muted">Avg. per Customer</span>
                                <span className="font-bold text-text-main">৳{avgRevenuePerCustomer.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : (
                <Card className="p-12 text-center">
                    <BarChart3 size={48} className="mx-auto mb-4 text-text-muted opacity-30" />
                    <h3 className="text-lg font-semibold text-text-main mb-2">No data to display yet</h3>
                    <p className="text-text-muted max-w-md mx-auto">
                        Charts and analytics will appear here once you start adding customers, logging work, and generating invoices.
                    </p>
                </Card>
            )}
        </div>
    );
}
