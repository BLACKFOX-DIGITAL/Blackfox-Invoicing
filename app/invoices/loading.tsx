import { Skeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";

export default function Loading() {
    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-64 rounded-md" />
                    <Skeleton className="h-10 w-40 rounded-full" />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-full p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-6 rounded-full" />
                        </div>
                        <div>
                            <Skeleton className="h-8 w-32 mb-1" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    </Card>
                ))}
            </div>

            {/* Table Skeleton */}
            <Card className="border-0 shadow-sm ring-1 ring-black/5">
                <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-surface/50">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                </div>
                <div className="divide-y divide-border-subtle">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <div className="flex gap-8">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
