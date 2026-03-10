"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    containerClassName?: string;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, containerClassName, label, error, helperText, startIcon, endIcon, ...props }, ref) => {
        return (
            <div className={twMerge("w-full", containerClassName)}>
                {label && (
                    <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">
                        {label} {props.required && <span className="text-status-error">*</span>}
                    </label>
                )}
                <div className="relative">
                    {startIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                            {startIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={twMerge(
                            "w-full bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm placeholder:text-text-muted/50 disabled:opacity-50 disabled:bg-gray-50",
                            startIcon && "pl-10",
                            endIcon && "pr-10",
                            error && "border-status-error focus:border-status-error focus:ring-status-error/10",
                            className
                        )}
                        {...props}
                    />
                    {endIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                            {endIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="text-xs text-status-error mt-1.5 ml-1 flex items-center gap-1">
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p className="text-xs text-text-muted mt-1.5 ml-1">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;
