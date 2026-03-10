"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from "@/components/ui/Card";
import { getCurrencySymbol } from "@/lib/format";

interface InvoiceStatsChartProps {
    data: { status: string; count: number; total: number }[];
    currency?: string;
}

const COLORS = {
    'Paid': '#10b981',      // Success
    'Overdue': '#ef4444',   // Error
    'Sent': '#3b82f6',      // Info
    'Draft': '#9ca3af',     // Muted
    'Void': '#6b7280'       // Gray
};

export default function InvoiceStatsChart({ data, currency = "USD" }: InvoiceStatsChartProps) {
    const symbol = getCurrencySymbol(currency);

    // Process data for charts
    const chartData = data.filter(d => d.count > 0).map(item => ({
        name: item.status,
        value: item.count,
        total: item.total,
        color: COLORS[item.status as keyof typeof COLORS] || '#6366f1' // Default Indigo
    }));

    const totalInvoices = data.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-text-main mb-2">Invoice Status</h3>

            <div className="h-[200px] relative w-full">
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                borderRadius: '8px'
                            }}
                            itemStyle={{ color: 'var(--text-main)' }}
                            formatter={(value: any, name: any, props: any) => [
                                `${value} (${symbol}${(props.payload.total || 0).toLocaleString()})`,
                                name
                            ]}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-text-main">{totalInvoices}</span>
                    <span className="text-xs text-text-muted uppercase tracking-wider">Total</span>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {chartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-text-main">{item.name}</span>
                        </div>
                        <div className="text-right">
                            <span className="font-medium text-text-main block">{item.value}</span>
                            <span className="text-xs text-text-muted">{symbol}{item.total.toLocaleString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
