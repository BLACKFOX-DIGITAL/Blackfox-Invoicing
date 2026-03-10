"use client";

import React, { useState, useEffect } from 'react';
import { useRole } from "@/lib/roleContext";
import Button from "@/components/ui/Button";
import { Download, Calendar, Filter } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';

interface DashboardHeaderProps {
    showDateFilter?: boolean;
}

export default function DashboardHeader({ showDateFilter = false }: DashboardHeaderProps) {
    const { role } = useRole();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [date, setDate] = useState<string>("");

    useEffect(() => {
        setDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, []);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fromDate, setFromDate] = useState(searchParams.get('from') || '');
    const [toDate, setToDate] = useState(searchParams.get('to') || '');

    const handleApplyFilter = () => {
        const params = new URLSearchParams(searchParams);
        if (fromDate) params.set('from', fromDate);
        else params.delete('from');

        if (toDate) params.set('to', toDate);
        else params.delete('to');

        router.push(`/dashboard?${params.toString()}`);
        setIsFilterOpen(false);
    };

    const handleClearFilter = () => {
        setFromDate('');
        setToDate('');
        router.push('/dashboard');
        setIsFilterOpen(false);
    };

    return (
        <div className="flex flex-col gap-4 pb-2 border-b border-border-subtle/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Dashboard</h1>
                    <p className="text-text-muted mt-1">
                        Overview of your business performance.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-text-main">{date}</p>
                        <p className="text-xs text-text-muted mt-0.5">{role} View</p>
                    </div>

                    {showDateFilter && (
                        <div className="relative">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex gap-2"
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <Calendar size={14} /> Filter
                            </Button>

                            {isFilterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-bg-surface border border-border-subtle rounded-lg shadow-xl p-4 z-50">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <Filter size={14} /> Filter by Date
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-text-muted block mb-1">From</label>
                                            <input
                                                type="date"
                                                className="w-full p-2 text-sm bg-bg-app border border-border-subtle rounded-md"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-muted block mb-1">To</label>
                                            <input
                                                type="date"
                                                className="w-full p-2 text-sm bg-bg-app border border-border-subtle rounded-md"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button size="sm" variant="secondary" className="w-full" onClick={handleClearFilter}>Clear</Button>
                                            <Button size="sm" className="w-full" onClick={handleApplyFilter}>Apply</Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <Button variant="secondary" size="sm" className="hidden md:flex gap-2">
                        <Download size={14} /> Export
                    </Button>
                </div>
            </div>
        </div>
    );
}
