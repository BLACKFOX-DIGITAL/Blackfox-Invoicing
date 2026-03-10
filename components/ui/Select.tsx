"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options?: SelectOption[]; // Optional: can also passed children directly
    containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, containerClassName, label, error, helperText, children, options, ...props }, ref) => {
        return (
            <div className={twMerge("w-full", containerClassName)}>
                {label && (
                    <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">
                        {label} {props.required && <span className="text-status-error">*</span>}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={twMerge(
                            "w-full bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-50 appearance-none pr-10",
                            error && "border-status-error focus:border-status-error focus:ring-status-error/10",
                            className
                        )}
                        {...props}
                    >
                        {options
                            ? options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))
                            : children}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                        <ChevronDown size={16} />
                    </div>
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

Select.displayName = "Select";

export default Select;
