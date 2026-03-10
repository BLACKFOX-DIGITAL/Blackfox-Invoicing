"use client";

import React from "react";
import Link from "next/link";
import { useRole } from "@/lib/roleContext";
import { useSession } from "next-auth/react";
import { Search, Bell, Mail, Menu } from "lucide-react";
import Image from "next/image";

interface TopbarProps {
    onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
    const { role } = useRole();
    const { data: session, status } = useSession();

    // Mock current date for UI polish
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <header className="h-20 flex items-center justify-between px-8 bg-transparent md:bg-bg-card/50 md:backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-4 flex-1">
                <button
                    className="md:hidden text-text-muted hover:text-text-main focus:outline-none"
                    onClick={onMenuClick}
                    aria-label="Open sidebar"
                >
                    <Menu size={24} aria-hidden="true" />
                </button>

                {/* Global Search */}
                <div className="relative w-full max-w-lg hidden md:block group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-primary transition-colors" size={20} aria-hidden="true" />
                    <input
                        type="search"
                        placeholder="Search invoices, customers..."
                        aria-label="Global search"
                        className="w-full pl-12 pr-12 py-3 bg-bg-app border-none rounded-2xl text-sm text-text-main placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                {role !== "VendorWorker" && (
                    <div className="flex items-center gap-4">
                        <Link href="/email-logs" aria-label="View email logs">
                            <button className="group relative p-2 text-text-muted hover:text-text-main hover:bg-bg-surface rounded-xl transition-all">
                                <Mail size={22} aria-hidden="true" className="stroke-[1.5px]" />
                            </button>
                        </Link>
                        <Link href="/notifications" aria-label="View notifications">
                            <button className="group relative p-2 text-text-muted hover:text-text-main hover:bg-bg-surface rounded-xl transition-all">
                                <Bell size={22} aria-hidden="true" className="stroke-[1.5px]" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-status-error rounded-full border-2 border-bg-card"></span>
                            </button>
                        </Link>
                    </div>
                )}

                <div className="h-8 w-px bg-border-subtle hidden md:block"></div>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-2 cursor-pointer group min-w-[150px]">
                    {status === "loading" ? (
                        <>
                            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                            <div className="hidden md:flex flex-col gap-1.5 w-full">
                                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                                <div className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div
                                className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-primary/20 transition-all flex items-center justify-center text-white font-bold select-none shrink-0"
                                aria-label={`${session?.user?.name || 'User'}'s profile avatar`}
                                role="img"
                            >
                                {session?.user?.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || "User profile picture"}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span>{session?.user?.name?.charAt(0) || role.charAt(0)}</span>
                                )}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-bold text-text-main leading-tight group-hover:text-primary transition-colors">
                                    {session?.user?.name || "Member"}
                                </p>
                                <p className="text-xs text-text-muted font-medium truncate max-w-[150px]">
                                    {session?.user?.email || role}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
