"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
    containerClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, containerClassName, label, error, helperText, ...props }, ref) => {
        return (
            <div className={clsx("w-full", containerClassName)}>
                {label && (
                    <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">
                        {label} {props.required && <span className="text-status-error">*</span>}
                    </label>
                )}
                <div className="relative">
                    <textarea
                        ref={ref}
                        className={twMerge(
                            "w-full bg-bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm placeholder:text-text-muted/50 disabled:opacity-50 disabled:bg-gray-50 min-h-[100px] resize-y",
                            error && "border-status-error focus:border-status-error focus:ring-status-error/10",
                            className
                        )}
                        {...props}
                    />
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

Textarea.displayName = "Textarea";

export default Textarea;
