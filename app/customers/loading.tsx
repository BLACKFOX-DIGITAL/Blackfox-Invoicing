import { Skeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";

export default function Loading() {
    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center px-1">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-72" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-64 rounded-md" />
                    <Skeleton className="h-10 w-40 rounded-full" />
                </div>
            </div>

            {/* Table Skeleton */}
            <Card className="border-0 shadow-sm ring-1 ring-black/5">
                <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-surface/50">
                    <div className="flex gap-4">
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
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <div className="flex gap-12">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
