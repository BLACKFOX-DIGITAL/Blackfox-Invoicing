import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
    label: string | React.ReactNode;
    sortKey: string;
    currentSort: string;
    currentOrder: "asc" | "desc";
    onSort: (key: string) => void;
    underline?: boolean;
    className?: string;
}

export default function SortableHeader({
    label,
    sortKey,
    currentSort,
    currentOrder,
    onSort,
    underline = false,
    className
}: SortableHeaderProps) {
    return (
        <button
            onClick={() => onSort(sortKey)}
            className={cn("flex items-center gap-1 hover:text-white/80 transition-colors group font-bold font-sans text-white group", className)}
        >
            <span className={cn(underline && "border-b border-dashed border-gray-400 hover:border-gray-600")}>
                {label}
            </span>
            {currentSort === sortKey ? (
                currentOrder === 'asc' ? (
                    <ChevronUp size={14} className="text-white" />
                ) : (
                    <ChevronDown size={14} className="text-white" />
                )
            ) : (
                <div className="opacity-0 group-hover:opacity-100 flex flex-col -space-y-1">
                    <ChevronUp size={10} />
                    <ChevronDown size={10} />
                </div>
            )}
        </button>
    );
}
