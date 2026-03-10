"use client";

import { formatDate } from "@/lib/format";

import CustomerHeader from "./CustomerHeader";
import QuickActions from "./QuickActions";
import MiniDashboard from "./MiniDashboard";
import CustomerTabs from "./CustomerTabs";
import { useState } from "react";
import BatchLogForm from "@/components/work-logs/BatchLogForm";
import ServiceForm from "@/components/services/ServiceForm";

import StatementModal from "./StatementModal";
import { createService } from "@/app/actions/services";
import { createInvoice } from "@/app/actions/invoices";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

interface CustomerDetailContentProps {
    customer: any;
    id: string;
    invoices: any[];
    workLogs: any[];
    services: any[];
}

export default function CustomerDetailContent({
    customer,
    id,
    invoices,
    workLogs,
    services
}: CustomerDetailContentProps) {
    // Calculate some customer stats from actual data
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const pendingAmount = invoices.filter(inv => inv.status !== "Paid").reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate additional stats for MiniDashboard
    const totalServices = services.length;
    const totalUnits = workLogs.reduce((sum, log) => sum + (log.quantity || 0), 0);
    const lastWorkLog = workLogs.length > 0 ? workLogs[0].date : null;

    // Find oldest overdue invoice
    const today = new Date();
    const overdueInvoice = invoices
        .filter(inv => inv.status !== "Paid" && inv.dueDate && new Date(inv.dueDate) < today)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    const customerWithStats = {
        ...customer,
        totalRevenue,
        pendingAmount,
        invoiceCount: invoices.length,
        workLogCount: workLogs.length,
        stats: {
            totalServices,
            totalImages: totalUnits,
            totalUnits,
            balance: pendingAmount.toFixed(2),
            lastWorkLog: lastWorkLog ? formatDate(lastWorkLog) : "No recent work",
            lastActivity: lastWorkLog ? `Last log: ${formatDate(lastWorkLog)}` : "No activity",
            daysInactive: lastWorkLog ? Math.floor((Date.now() - new Date(lastWorkLog).getTime()) / (1000 * 60 * 60 * 24)) : 0,
            overdueInvoice: overdueInvoice ? {
                id: overdueInvoice.id,
                amount: overdueInvoice.total
            } : null
        }
    };

    const router = useRouter();
    const toast = useToast();

    // Quick Actions State
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("services");

    const handleQuickAction = (action: string) => {
        if (action === "log_work") setActiveModal("log_work");
        if (action === "add_service") setActiveModal("add_service");
        if (action === "generate_invoice") router.push("/invoices/generate");
        if (action === "send_statement") setActiveModal("send_statement");
        if (action === "send_email") {
            if (customer.email) {
                window.location.href = `mailto:${customer.email}`;
            } else {
                toast.error("Customer has no email address.");
            }
        }
    };

    const handleSaveService = async (data: any) => {
        try {
            const result = await createService({
                name: data.name,
                description: data.description || "",
                rate: Number(data.rate),
                customerId: data.customerId || null,
                customerName: data.customerName || null
            });

            if (result.success) {
                setActiveModal(null);
            } else {
                toast.error("Failed to create service: " + result.error);
            }
        } catch (error) {
            console.error("Error creating service:", error);
            toast.error("An unexpected error occurred.");
        }
    };

    const handleSaveWorkLog = async (data: any) => {
        setActiveModal(null);
    };

    const handleCreateInvoice = async (data: any) => {
        try {
            const result = await createInvoice({
                customerId: customer.id,
                clientName: customer.name,
                date: data.invoiceDate,
                dueDate: data.dueDate,
                subtotal: data.subtotal,
                tax: 0,
                discount: 0,
                discountType: "fixed",
                discountValue: 0,
                total: data.total,
                workLogIds: data.logIds.map((id: string) => parseInt(id)),
                id: data.customId, // Pass custom ID
                // Assuming items are already processed or we might need to process them here if InvoiceGenerator provides raw IDs
                // Wait, InvoiceGenerator's onCreate provides: { customerId, logIds, subtotal, total, dueDate, invoiceDate }
                // We need to construct items for createInvoice.
                // Re-using logic from InvoicesContent:
                items: workLogs
                    .filter(log => data.logIds.includes(log.id.toString()))
                    .map(log => ({
                        serviceName: log.service?.name || log.serviceName || "Service",
                        quantity: log.quantity,
                        rate: typeof log.rate === 'string' ? parseFloat(log.rate) : log.rate,
                        total: typeof log.total === 'string' ? parseFloat(log.total) : log.total,
                        date: formatDate(log.date),
                        description: log.description
                    }))
            });

            if (!result.success) {
                toast.error("Failed to create invoice: " + result.error);
                return;
            }

            if (result.data?.id) {
                // Refresh to show new invoices
                router.refresh();
                setActiveModal(null);
                router.push(`/invoices/${result.data.id}`);
            }
        } catch (error) {
            console.error("Error creating invoice:", error);
            toast.error("An unexpected error occurred.");
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
            {/* 1. Sticky Header */}
            <CustomerHeader customer={customerWithStats} id={id} />

            <div className="flex flex-col gap-8">
                {/* 2. Quick Actions */}
                <QuickActions onAction={handleQuickAction} />

                {/* 3 & 4. Mini Dashboard (KPIs + Alerts) */}
                <MiniDashboard
                    customer={customerWithStats}
                    onViewLog={() => setActiveTab("logs")}
                />

                {/* 5. Tabs */}
                <CustomerTabs
                    customer={customerWithStats}
                    invoices={invoices}
                    workLogs={workLogs}
                    services={services}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>

            {/* Modals */}
            {activeModal === "log_work" && (
                <BatchLogForm
                    onClose={() => setActiveModal(null)}
                    onSubmit={handleSaveWorkLog}
                    customers={[customer]}
                    services={services}
                />
            )}

            {activeModal === "add_service" && (
                <ServiceForm
                    onClose={() => setActiveModal(null)}
                    onSave={handleSaveService}
                    customers={[customer]}
                />
            )}



            {activeModal === "send_statement" && (
                <StatementModal
                    onClose={() => setActiveModal(null)}
                    customerName={customer.name}
                />
            )}
        </div>
    );
}
