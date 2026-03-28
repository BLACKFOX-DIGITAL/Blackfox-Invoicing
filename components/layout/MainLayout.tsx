"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { RoleProvider } from "@/lib/roleContext";
import { usePathname } from "next/navigation";

interface LayoutContentProps {
    children: React.ReactNode;
    companyName?: string;
}

function LayoutContent({ children, companyName }: LayoutContentProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";
    const isPublicRoute = pathname.startsWith("/public/");
    const isStandalonePage = isLoginPage || isPublicRoute;

    if (isStandalonePage) {
        return (
            <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center">
                <main className="w-full h-full">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-bg-app">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                companyName={companyName}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function MainLayout({ children, companyName, session }: { children: React.ReactNode; companyName?: string; session?: any }) {
    return (
        <RoleProvider session={session}>
            <LayoutContent companyName={companyName}>{children}</LayoutContent>
        </RoleProvider>
    );
}
