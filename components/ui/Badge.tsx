import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "default" | "secondary" | "success" | "warning" | "error" | "info";
    className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
    const variants = {
        default: "bg-bg-surface text-text-main border-border-subtle",
        secondary: "bg-bg-sidebar text-text-muted border-transparent",
        success: "bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/20",
        warning: "bg-[var(--status-warning)]/10 text-[var(--status-warning)] border-[var(--status-warning)]/20",
        error: "bg-[var(--status-error)]/10 text-[var(--status-error)] border-[var(--status-error)]/20",
        info: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
    };

    return (
        <span className={twMerge("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", variants[variant], className)}>
            {children}
        </span>
    );
}
