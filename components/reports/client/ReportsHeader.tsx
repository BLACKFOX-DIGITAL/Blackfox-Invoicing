"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, Filter, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";

export default function ReportsHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const toast = useToast();

    const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
    const [groupBy, setGroupBy] = useState(searchParams.get("groupBy") || "month");

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleDateChange = (type: "startDate" | "endDate", value: string) => {
        if (type === "startDate") setStartDate(value);
        if (type === "endDate") setEndDate(value);
        updateFilters(type, value);
    };

    const handleGroupByChange = (value: string) => {
        setGroupBy(value);
        updateFilters("groupBy", value);
    };

    const handleExport = () => {
        toast.success("Export started (Not implemented fully yet)");
    };

    return (
        <div className="space-y-4">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Reports & Analytics</h1>
                    <p className="text-text-muted text-sm mt-1">Track financial performance and operational metrics</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2">
                        <Download size={16} /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 block">Start Date</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleDateChange("startDate", e.target.value)}
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
                                value={endDate}
                                onChange={(e) => handleDateChange("endDate", e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all color-scheme-dark"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 block">Group By</label>
                        <div className="relative">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <select
                                value={groupBy}
                                onChange={(e) => handleGroupByChange(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-bg-app border border-border-subtle rounded-lg text-sm text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer"
                            >
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
