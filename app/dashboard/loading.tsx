import { Skeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";

export default function Loading() {
    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-4 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                        <div>
                            <Skeleton className="h-8 w-32 mb-1" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity Skeleton */}
                <Card className="lg:col-span-2 h-[400px] p-6">
                    <div className="flex items-center justify-between mb-6">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Quick Actions Skeleton */}
                <Card className="h-[400px] p-6">
                    <Skeleton className="h-6 w-32 mb-6" />
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
