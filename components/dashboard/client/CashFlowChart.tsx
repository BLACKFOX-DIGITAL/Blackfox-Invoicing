"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Card from "@/components/ui/Card";
import { getCurrencySymbol } from "@/lib/format";

interface CashFlowChartProps {
    data: { date: string; amount: number }[];
    currency?: string;
}

export default function CashFlowChart({ data, currency = "USD" }: CashFlowChartProps) {
    const symbol = getCurrencySymbol(currency);
    const totalForecast = data.reduce((acc, item) => acc + item.amount, 0);

    return (
        <Card className="p-4 h-full flex flex-col">
            <div className="mb-2 flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-bold text-text-main">Cash Flow</h3>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-status-success">
                        +{symbol}{totalForecast.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                            tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            tickFormatter={(value) => `${symbol}${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            itemStyle={{ color: 'var(--text-main)' }}
                            formatter={(value: any) => [`${symbol}${(value || 0).toLocaleString()}`, "Expected"]}
                            labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            cursor={{ fill: 'var(--bg-surface-hover)' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#10b981' : '#ef4444'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
