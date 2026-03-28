"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession, SessionProvider } from "next-auth/react";

export type UserRole = "Owner" | "Manager" | "Worker" | "VendorManager" | "VendorWorker" | string;

export const ROLES = {
    OWNER: "Owner",
    MANAGER: "Manager",
    WORKER: "Worker",
    VENDOR_MANAGER: "VendorManager",
    VENDOR_WORKER: "VendorWorker",
} as const;

interface RoleContextType {
    role: UserRole;
    company: string;
    changeRole: (newRole: UserRole) => void;
    ROLES: typeof ROLES;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

function RoleManager({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [mockRole, setMockRole] = useState<UserRole>("");

    // Read local cache on mount/unauth, clear it when real auth begins
    useEffect(() => {
        if (status === "authenticated") {
            localStorage.removeItem("mockRole");
        } else if (status === "unauthenticated") {
            const savedRole = localStorage.getItem("mockRole");
            if (savedRole) {
                setMockRole(savedRole as UserRole);
            }
        }
    }, [status]);

    const changeRole = (newRole: UserRole) => {
        setMockRole(newRole);
        localStorage.setItem("mockRole", newRole);
    };

    // Derive the exact role immediately during render to eliminate asynchronous flashes.
    let role: UserRole = "";
    let company: string = "";

    if (status === "authenticated" && session?.user) {
        role = (session.user.role as string) || "";
        company = ((session.user as any).company as string) || "";
    } else if (status === "unauthenticated" && mockRole) {
        role = mockRole;
    }

    return (
        <RoleContext.Provider value={{ role, company, changeRole, ROLES }}>
            {children}
        </RoleContext.Provider>
    );
}

export function RoleProvider({ children, session }: { children: ReactNode; session?: any }) {
    return (
        <SessionProvider session={session}>
            <RoleManager>{children}</RoleManager>
        </SessionProvider>
    );
}

export function useRole() {
    const context = useContext(RoleContext);
    if (context === undefined) {
        throw new Error("useRole must be used within a RoleProvider");
    }
    return context;
}
