import { Suspense } from 'react';
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsOverview from "@/components/dashboard/server/StatsOverview";
import RevenueChartWidget from "@/components/dashboard/server/RevenueChartWrapper";
import InvoiceStatsWidget from "@/components/dashboard/server/InvoiceStatsWidget";
import CashFlowWidget from "@/components/dashboard/server/CashFlowWidget";
import ActivityFeed from "@/components/dashboard/server/ActivityFeed";
import CustomerOverview from "@/components/dashboard/server/CustomerOverview";
import { Skeleton } from "@/components/ui/Skeleton";

// Skeletons for Suspense fallbacks
function StatsSkeleton() {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-[120px]">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-full w-full rounded-xl" />)}
    </div>;
}

function ChartSkeleton() {
    return <Skeleton className="w-full h-[400px] rounded-xl" />;
}

function FeedSkeleton() {
    return <Skeleton className="w-full h-[500px] rounded-xl" />;
}

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ from?: string, to?: string }> }) {
    const resolvedParams = await searchParams; // Next.js 15 requires awaiting searchParams

    return (
        <div className="max-w-[1400px] mx-auto pb-10 space-y-4">
            <DashboardHeader showDateFilter={true} />

            <Suspense fallback={<StatsSkeleton />}>
                <StatsOverview searchParams={resolvedParams} />
            </Suspense>

            {/* Charts Row - 3 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Suspense fallback={<ChartSkeleton />}>
                    <RevenueChartWidget />
                </Suspense>

                <Suspense fallback={<ChartSkeleton />}>
                    <CashFlowWidget />
                </Suspense>

                <Suspense fallback={<ChartSkeleton />}>
                    <InvoiceStatsWidget />
                </Suspense>
            </div>

            {/* Content Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <Suspense fallback={<FeedSkeleton />}>
                        <ActivityFeed />
                    </Suspense>
                </div>

                <div className="md:col-span-1">
                    <Suspense fallback={<FeedSkeleton />}>
                        <CustomerOverview />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
