import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export default function Card({ children, className, title, action }: CardProps) {
    return (
        <div className={twMerge("bg-bg-card border border-border-subtle/50 rounded-2xl p-6 shadow-sm", className)}>
            {(title || action) && (
                <div className="flex items-center justify-between mb-6">
                    {title && <h3 className="text-lg font-bold text-text-main tracking-tight">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
