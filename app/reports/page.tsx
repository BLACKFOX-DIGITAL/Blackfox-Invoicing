import { Suspense } from "react";
import ReportsHeader from "@/components/reports/client/ReportsHeader";
import ReportKPIs from "@/components/reports/server/ReportKPIs";
import RevenueTrendsWidget from "@/components/reports/server/RevenueTrendsWidget";
import WorkVolumeWidget from "@/components/reports/server/WorkVolumeWidget";
import ServiceDistributionWidget from "@/components/reports/server/ServiceDistributionWidget";
import TopCustomersWidget from "@/components/reports/server/TopCustomersWidget";
import { Skeleton } from "@/components/ui/Skeleton";

export const dynamic = 'force-dynamic';

function GenericSkeleton({ className }: { className?: string }) {
    return <Skeleton className={`w-full rounded-lg ${className}`} />;
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await auth();
    if (session?.user?.role !== "Owner") {
        redirect("/dashboard");
    }
    // Next.js 15: await searchParams
    const resolvedParams = await searchParams;
    const params = {
        startDate: typeof resolvedParams.startDate === 'string' ? resolvedParams.startDate : undefined,
        endDate: typeof resolvedParams.endDate === 'string' ? resolvedParams.endDate : undefined,
        groupBy: (typeof resolvedParams.groupBy === 'string' && ["day", "week", "month"].includes(resolvedParams.groupBy))
            ? (resolvedParams.groupBy as "day" | "week" | "month")
            : "month" as "day" | "week" | "month"
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-10 space-y-6">
            <ReportsHeader />

            <Suspense fallback={<GenericSkeleton className="h-32" />}>
                <ReportKPIs searchParams={params} />
            </Suspense>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[350px]">
                    <Suspense fallback={<GenericSkeleton className="h-full" />}>
                        <RevenueTrendsWidget searchParams={params} />
                    </Suspense>
                </div>
                <div className="h-[350px]">
                    <Suspense fallback={<GenericSkeleton className="h-full" />}>
                        <WorkVolumeWidget searchParams={params} />
                    </Suspense>
                </div>
            </div>

            {/* Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[400px]">
                    <Suspense fallback={<GenericSkeleton className="h-full" />}>
                        <ServiceDistributionWidget searchParams={params} />
                    </Suspense>
                </div>
                <div className="h-[400px]">
                    <Suspense fallback={<GenericSkeleton className="h-full" />}>
                        <TopCustomersWidget searchParams={params} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
