"use client";

import { useState } from "react";
import ServicesTab from "./ServicesTab";
import WorkLogsTab from "./WorkLogsTab";
import InvoicesTab from "./InvoicesTab";
import StatementsTab from "./StatementsTab";
import PaymentsTab from "./PaymentsTab";
import EmailLogsTab from "./EmailLogsTab";
import { clsx } from "clsx";

const TABS = [
    { id: "services", label: "Services" },
    { id: "logs", label: "Work Logs" },
    { id: "invoices", label: "Invoices" },
    { id: "statements", label: "Statements" },
    { id: "payments", label: "Payments" },
    { id: "emails", label: "Email Logs" },
    { id: "notes", label: "Notes" },
];

interface CustomerTabsProps {
    customer: any;
    invoices?: any[];
    workLogs?: any[];
    services?: any[];
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function CustomerTabs({
    customer,
    invoices = [],
    workLogs = [],
    services = [],
    activeTab,
    onTabChange
}: CustomerTabsProps) {

    return (
        <div className="flex flex-col">
            <div className="flex border-b border-border-subtle overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={clsx(
                            "px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-text-muted hover:text-text-main hover:border-border-subtle"
                        )}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="py-6">
                {activeTab === "services" && <ServicesTab services={services} />}
                {activeTab === "logs" && <WorkLogsTab workLogs={workLogs} services={services} />}
                {activeTab === "invoices" && <InvoicesTab invoices={invoices} />}
                {activeTab === "statements" && <StatementsTab invoices={invoices} />}
                {activeTab === "payments" && <PaymentsTab invoices={invoices} />}
                {activeTab === "emails" && <EmailLogsTab />}
                {activeTab === "notes" && (
                    <div className="p-8 text-center text-text-muted bg-bg-surface rounded-lg border border-border-subtle border-dashed">
                        Notes / Activity Log Coming Soon
                    </div>
                )}
            </div>
        </div>
    );
}
