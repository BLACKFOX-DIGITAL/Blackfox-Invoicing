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
    const [role, setRole] = useState<UserRole>(ROLES.OWNER);
    const [company, setCompany] = useState<string>("blackfox");

    // Sync with session role when authenticated
    useEffect(() => {
        if (status === "authenticated") {
            const sessionRole = session?.user?.role;
            const sessionCompany = (session?.user as any)?.company;
            if (sessionRole) {
                setRole(sessionRole);
                // Clear any mock role to prevent valid session from being overridden by stale local state
                localStorage.removeItem("mockRole");
            }
            if (sessionCompany) {
                setCompany(sessionCompany);
            }
        } else if (status === "unauthenticated") {
            // Fallback to local storage for guest/dev mode only if NOT authenticated
            const savedRole = localStorage.getItem("mockRole");
            if (savedRole) {
                setRole(savedRole);
            }
        }
    }, [session, status]);

    const changeRole = (newRole: UserRole) => {
        setRole(newRole);
        localStorage.setItem("mockRole", newRole);
    };

    return (
        <RoleContext.Provider value={{ role, company, changeRole, ROLES }}>
            {children}
        </RoleContext.Provider>
    );
}

export function RoleProvider({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
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
