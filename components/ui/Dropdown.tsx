"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import Link from "next/link";

interface DropdownProps {
    trigger: ReactNode;
    children: ReactNode;
    align?: "left" | "right";
    className?: string;
}

export default function Dropdown({ trigger, children, align = "right", className }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Toggle dropdown and calculate position
    const toggleDropdown = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const MENU_WIDTH = 224; // w-56 = 14rem = 224px
            const MENU_HEIGHT = 120; // Approx height

            let top = rect.bottom + window.scrollY + 8; // Default: open downwards
            let left = align === "right"
                ? rect.right + window.scrollX - MENU_WIDTH
                : rect.left + window.scrollX;

            // Check if it fits below, otherwise open upwards
            if (window.innerHeight - rect.bottom < MENU_HEIGHT) {
                top = rect.top + window.scrollY - MENU_HEIGHT - 8;
            }

            setPosition({ top, left });
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            if (isOpen) setIsOpen(false); // Close on scroll to avoid floating issues
        };

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleScroll);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [isOpen]);

    return (
        <div className={clsx("relative inline-block text-left", className)} ref={triggerRef}>
            <div onClick={toggleDropdown} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        top: position.top,
                        left: position.left,
                        position: "absolute",
                        zIndex: 9999
                    }}
                    className="w-56 rounded-xl shadow-xl bg-bg-card ring-1 ring-black/5 focus:outline-none border border-border-subtle p-1 animate-in fade-in zoom-in-95 duration-100 ease-out"
                    onClick={() => setIsOpen(false)}
                >
                    <div className="flex flex-col gap-0.5" role="menu" aria-orientation="vertical">
                        {children}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: ReactNode;
    children: ReactNode;
    href?: string;
}

export function DropdownItem({ icon, children, className, href, onClick, ...props }: DropdownItemProps) {
    const content = (
        <div className="flex items-center gap-3">
            {icon && <span className="text-text-muted group-hover:text-text-main transition-colors">{icon}</span>}
            <span className="font-medium">{children}</span>
        </div>
    );

    const baseClasses = clsx(
        "group flex w-full items-center px-3 py-2 text-sm text-text-main hover:bg-bg-surface-hover hover:text-text-main rounded-lg transition-colors cursor-pointer mx-0",
        className
    );

    if (href) {
        return (
            <Link href={href} className={baseClasses}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type="button"
            className={baseClasses}
            role="menuitem"
            onClick={onClick}
            {...props}
        >
            {content}
        </button>
    );
}
