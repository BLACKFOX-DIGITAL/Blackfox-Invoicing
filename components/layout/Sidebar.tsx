"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRole } from "@/lib/roleContext";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
    LayoutDashboard,
    Users,
    Wrench,
    ClipboardList,
    FileText,
    CreditCard,
    FileSpreadsheet,
    Mail,
    Bell,
    LayoutTemplate,
    BarChart3,
    Lock,
    Settings,
    Shield,
    ListTodo,
    Wallet,
    Layers,
    ChevronDown,
    X,
    Banknote,
    Receipt,
    Tag,
    PieChart,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    CalendarDays,
    FolderOpen
} from "lucide-react";

interface MenuItem {
    label: string;
    href: string;
    icon?: any;
    roles?: string[];
    companies?: string[]; // if set, only show to these companies
    children?: MenuItem[];
}

const MENU_ITEMS: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["Owner", "Manager", "Worker"], companies: ["blackfox"] },
    { label: "Work Logs", href: "/work-logs", icon: ClipboardList }, // Accessible by all companies
    { label: "Customers", href: "/customers", icon: Users, roles: ["Owner"], companies: ["blackfox"] },
    { label: "Services", href: "/services", icon: Wrench, roles: ["Owner"], companies: ["blackfox"] },
    { label: "Invoices", href: "/invoices", icon: FileText, roles: ["Owner"], companies: ["blackfox"] },
    { label: "Reminders", href: "/reminders", icon: ListTodo, roles: ["Owner"], companies: ["blackfox"] },
    { label: "Payments", href: "/payments", icon: CreditCard, roles: ["Owner"], companies: ["blackfox"] },
    { label: "Statements", href: "/statements", icon: FileSpreadsheet, roles: ["Owner"], companies: ["blackfox"] },
    { label: "Reports", href: "/reports", icon: BarChart3, roles: ["Owner"], companies: ["blackfox"] },
    {
        label: "Finance",
        href: "/finance",
        icon: Banknote,
        roles: ["Owner", "VendorManager"],
        children: [
            { label: "Overview", href: "/finance/dashboard", icon: LayoutDashboard },
            { label: "Estimates", href: "/finance/estimates", icon: FileText },
            { label: "Transactions", href: "/finance", icon: Receipt },
            { label: "Profit & Loss", href: "/finance/profit-loss", icon: PieChart },
            { label: "Categories", href: "/finance/categories", icon: Tag },
        ]
    },
    {
        label: "HR & Payroll",
        href: "/hr",
        icon: Briefcase,
        roles: ["Owner", "Manager", "Worker", "VendorManager"], // Hide from VendorWorker
        children: [
            { label: "Directory", href: "/hr/directory", icon: Users },
            { label: "Payroll", href: "/hr/payroll", icon: Wallet },
            { label: "Leaves", href: "/hr/leaves", icon: CalendarDays },
            { label: "Documents", href: "/hr/documents", icon: FolderOpen },
        ]
    },
    {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["Owner", "VendorManager"], // Allow VendorManager
        // Remove companies restriction from parent so both can see it
        children: [
            { label: "General", href: "/settings", icon: Settings },
            // Only Owner of internal companies can see these:
            { label: "Users", href: "/settings/users", icon: Users, roles: ["Owner"], companies: ["blackfox"] },
            { label: "Payments", href: "/settings/payment-methods", icon: Wallet, roles: ["Owner"], companies: ["blackfox"] },
            { label: "Email API", href: "/settings/email-api", icon: Mail, roles: ["Owner"], companies: ["blackfox"] },
            { label: "Templates", href: "/settings/templates", icon: LayoutTemplate, roles: ["Owner"], companies: ["blackfox"] },
        ]
    },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    companyName?: string;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, onClose, companyName, isCollapsed = false, onToggleCollapse }: SidebarProps) {
    const appName = companyName || "Business Suite";
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const { role, company } = useRole();
    const userName = session?.user?.name || "User"; // Default to "User" if name missing

    const [openMenus, setOpenMenus] = useState<string[]>([]);

    // Toggle submenu
    const toggleMenu = (label: string) => {
        setOpenMenus(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    // Filter menu items by role and company
    const filteredItems = MENU_ITEMS.filter((item) => {
        if (item.companies && !item.companies.includes(company)) return false;
        if (item.roles && !item.roles.includes(role)) return false;
        return true;
    }).map(item => {
        if (item.children) {
            return {
                ...item,
                children: item.children.filter(child => {
                    if (child.companies && !child.companies.includes(company)) return false;
                    if (child.roles && !child.roles.includes(role)) return false;
                    return true;
                })
            };
        }
        return item;
    });

    const isChildActive = (item: any) => {
        if (!item.children) return false;
        return item.children.some((child: any) => pathname === child.href);
    };

    // Auto-open menu if child is active
    useEffect(() => {
        MENU_ITEMS.forEach(item => {
            if (item.children && isChildActive(item)) {
                setOpenMenus(prev => {
                    if (!prev.includes(item.label)) {
                        return [...prev, item.label];
                    }
                    return prev;
                });
            }
        });
    }, [pathname]);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 transform bg-bg-sidebar shadow-xl md:shadow-none md:border-r border-border-subtle/30 transition-all duration-300 ease-in-out flex flex-col",
                "md:relative md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full",
                isCollapsed ? "w-20" : "w-72"
            )}>
                {/* Collapse Toggle Button (Desktop) */}
                <button
                    onClick={onToggleCollapse}
                    className={clsx(
                        "hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-20 bg-white border border-border-subtle shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-full items-center justify-center text-primary/60 hover:text-primary hover:bg-primary/5 hover:border-primary/20 hover:shadow-[0_8px_15px_rgba(0,0,0,0.08)] transition-all duration-300 z-[60]",
                        isCollapsed && "rotate-0"
                    )}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className={clsx(
                    "p-6 border-b border-border-subtle/30 flex justify-between items-center overflow-hidden transition-all duration-300",
                    isCollapsed ? "px-5" : "px-6"
                )}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shrink-0">
                            <Layers size={22} className="text-white" />
                        </div>
                        {!isCollapsed && (
                            <div className="animate-in fade-in duration-500 truncate">
                                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent tracking-tight truncate">
                                    {appName}
                                </h1>
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">Invoicing &amp; More</p>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <button
                            onClick={onClose}
                            className="md:hidden text-text-muted hover:text-text-main transition-colors shrink-0"
                            aria-label="Close sidebar"
                        >
                            <X size={24} aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className={clsx(
                    "flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar transition-all duration-300",
                    isCollapsed ? "px-3" : "px-4"
                )}>
                    {/* Navigation Items */}
                    <nav className="space-y-1" aria-label="Main Navigation">
                        {status === "loading" ? (
                            <div className="flex flex-col gap-2 p-2 px-4">
                                <div className="h-10 bg-bg-app rounded-xl animate-pulse"></div>
                                <div className="h-10 bg-bg-app rounded-xl animate-pulse"></div>
                                <div className="h-10 bg-bg-app rounded-xl animate-pulse"></div>
                                <div className="h-10 bg-bg-app rounded-xl animate-pulse"></div>
                            </div>
                        ) : filteredItems.map((item) => {
                            const isActive = pathname === item.href;
                            const isMenuOpen = openMenus.includes(item.label);
                            const hasChildren = !!item.children;
                            const isParentActive = hasChildren && isChildActive(item);

                            return (
                                <div key={item.label} className="mb-1">
                                    {hasChildren ? (
                                        <button
                                            onClick={() => isCollapsed ? onToggleCollapse?.() : toggleMenu(item.label)}
                                            aria-expanded={isMenuOpen}
                                            aria-label={isMenuOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                                            className={clsx(
                                                "w-full flex items-center px-4 py-3 text-[15px] font-medium rounded-xl transition-all duration-200 group relative",
                                                isParentActive
                                                    ? "bg-primary/10 text-primary shadow-sm"
                                                    : "text-text-dim hover:bg-bg-app hover:text-text-main",
                                                isCollapsed ? "justify-center px-0" : "justify-between"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={20} aria-hidden="true" className={clsx(
                                                    "transition-colors",
                                                    isParentActive ? "text-primary" : "text-text-muted group-hover:text-text-main"
                                                )} />
                                                {!isCollapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                                            </div>
                                            {!isCollapsed && (
                                                <ChevronDown size={16} aria-hidden="true" className={clsx(
                                                    "transition-transform duration-200 text-text-muted animate-in fade-in duration-300",
                                                    isMenuOpen && "transform rotate-180"
                                                )} />
                                            )}
                                            {isCollapsed && isParentActive && (
                                                <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                                            )}
                                        </button>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            className={clsx(
                                                "flex items-center gap-3 px-4 py-3 text-[15px] font-medium rounded-xl transition-all duration-200 group relative",
                                                isActive
                                                    ? "bg-primary text-white shadow-md shadow-primary/25"
                                                    : "text-text-dim hover:bg-bg-app hover:text-text-main",
                                                isCollapsed && "justify-center px-0"
                                            )}
                                        >
                                            <item.icon size={20} aria-hidden="true" className={clsx(
                                                "transition-colors",
                                                isActive ? "text-white" : "text-text-muted group-hover:text-text-main"
                                            )} />
                                            {!isCollapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                                            {isCollapsed && isActive && (
                                                <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                                            )}
                                        </Link>
                                    )}

                                    {/* Submenu */}
                                    {hasChildren && isMenuOpen && !isCollapsed && (
                                        <div className="mt-1 ml-4 pl-4 border-l-2 border-border-subtle space-y-1 animate-in slide-in-from-top-2 duration-200">
                                            {item.children?.map((child) => {
                                                const isChildActive = pathname === child.href;
                                                const ChildIcon = child.icon;
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={clsx(
                                                            "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                                                            isChildActive
                                                                ? "text-primary bg-primary/5"
                                                                : "text-text-muted hover:text-text-main hover:bg-bg-app/50"
                                                        )}
                                                    >
                                                        {ChildIcon && <ChildIcon size={16} aria-hidden="true" className={clsx("mr-2.5", isChildActive ? "text-primary" : "text-text-dim")} />}
                                                        <span>{child.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                <div className={clsx(
                    "mt-auto space-y-3 transition-all duration-300",
                    isCollapsed ? "p-3" : "p-6"
                )}>
                    <div className={clsx(
                        "bg-bg-surface rounded-2xl border border-border-subtle transition-all duration-300",
                        isCollapsed ? "p-2" : "p-4"
                    )}>
                        <div className="flex items-center gap-3">
                            {status === "loading" ? (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                                    <div className="flex flex-col gap-1.5 overflow-hidden w-full">
                                        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                                        <div className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div
                                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-md uppercase shrink-0"
                                        aria-label={`${userName}'s profile avatar`}
                                        role="img"
                                    >
                                        {userName.charAt(0)}
                                    </div>
                                    {!isCollapsed && (
                                        <div className="overflow-hidden animate-in fade-in duration-500">
                                            <p className="text-sm font-bold text-text-main truncate">{userName}</p>
                                            <p className="text-xs text-text-muted truncate">{role}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className={clsx(
                            "w-full flex items-center text-[15px] font-medium text-status-error hover:bg-status-error/10 rounded-xl transition-all duration-200 group",
                            isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
                        )}
                        aria-label="Sign out"
                    >
                        <Shield size={20} aria-hidden="true" className="text-status-error/70 group-hover:text-status-error transition-colors" />
                        {!isCollapsed && <span className="animate-in fade-in duration-300">Sign Out</span>}
                    </button>
                    {!isCollapsed && (
                        <div className="text-center animate-in fade-in duration-500">
                            <p className="text-[10px] text-text-muted/50 font-medium">{appName} • {new Date().getFullYear()}</p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
