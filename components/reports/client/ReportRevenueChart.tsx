"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Card from "@/components/ui/Card";

interface ReportRevenueChartProps {
    data: { name: string; revenue: number }[];
    groupBy: string;
    symbol: string;
}

export default function ReportRevenueChart({ data, groupBy, symbol }: ReportRevenueChartProps) {



    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-text-main mb-4">Revenue ({groupBy})</h3>

            <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis
                            dataKey="name"
                            stroke="var(--text-muted)"
                            fontSize={12}
                            tickMargin={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${symbol}${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            itemStyle={{ color: 'var(--text-main)' }}
                            cursor={{ fill: 'var(--bg-surface-hover)' }}
                            formatter={(value: any) => [`${symbol}${(value || 0).toLocaleString()}`, "Revenue"]}
                        />
                        <Bar
                            dataKey="revenue"
                            fill="var(--primary)"
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
