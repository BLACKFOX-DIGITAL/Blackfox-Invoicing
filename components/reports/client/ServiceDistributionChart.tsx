"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ServiceDistributionChartProps {
    data: { name: string; value: number }[];
    symbol: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ServiceDistributionChart({ data, symbol }: ServiceDistributionChartProps) {

    if (!data || data.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-text-muted italic">
                No data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px'
                    }}
                    itemStyle={{ color: 'var(--text-main)' }}
                    formatter={(value: any) => [`${symbol}${(value || 0).toLocaleString()}`, "Revenue"]}
                />
                <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
