import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-text-main tracking-wide">Loading...</span>
                <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] animate-pulse">Synchronizing Data</span>
            </div>
        </div>
    );
}
