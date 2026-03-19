"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    href?: string;
    className?: string;
    children?: React.ReactNode;
    disabled?: boolean;
}

export default function Button({
    children,
    variant = "primary",
    size = "md",
    className = "",
    href,
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 rounded-full active:scale-95";

    const variants = {
        primary: "bg-primary text-white font-bold hover:bg-primary-hover shadow-sm border border-transparent active:scale-[0.98]",
        secondary: "bg-white text-text-main border border-border-subtle hover:bg-bg-surface-hover hover:border-text-muted/50 shadow-sm active:scale-[0.98]",
        danger: "bg-status-error text-white hover:bg-[var(--status-error-hover)] shadow-sm active:scale-[0.98]",
        ghost: "hover:bg-bg-surface-hover text-text-main hover:text-primary active:scale-[0.98]",
        outline: "bg-transparent text-text-main border border-border-subtle hover:bg-bg-surface-hover active:scale-[0.98]",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-8 text-base",
    };

    const classes = twMerge(clsx(baseStyles, variants[variant], sizes[size], className));

    if (href) {
        return (
            <Link href={href} className={classes}>
                {children}
            </Link>
        );
    }

    return (
        <button className={classes} {...props}>
            {children}
        </button>
    );
}
