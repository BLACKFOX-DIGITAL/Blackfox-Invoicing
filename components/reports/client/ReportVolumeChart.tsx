"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Card from "@/components/ui/Card";

interface ReportVolumeChartProps {
    data: { name: string; units: number }[];
    groupBy: string;
}

export default function ReportVolumeChart({ data, groupBy }: ReportVolumeChartProps) {
    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-text-main mb-4">Work Volume ({groupBy})</h3>

            <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            itemStyle={{ color: 'var(--text-main)' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="units"
                            stroke="var(--status-success)"
                            strokeWidth={2}
                            dot={{ fill: 'var(--status-success)' }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
