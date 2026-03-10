"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import { Plus, Search, Filter, RefreshCcw, FileText, Layers, Clock } from "lucide-react";
import WorkLogTable from "./WorkLogTable";
import BatchLogForm from "./BatchLogForm";
import WorkLogForm from "./WorkLogForm";
// import InvoiceGeneratorModal from "./InvoiceGeneratorModal"; // File missing and unused
import { DeleteWorkLogModal } from "./WorkLogActions";
import ImportWorkLogsModal from "./ImportWorkLogsModal";
import { createInvoiceFromWorkLogs } from "@/app/actions/invoices";
import { deleteWorkLog, deleteWorkLogsBatch, updateWorkLog, createWorkLog, createWorkLogsBatch } from "@/app/actions/work-logs";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import { sortCustomers } from "@/lib/format";

interface WorkLogsContentProps {
    initialLogs: any[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
    };
    customers: any[];
    services: any[];
    settings?: any;
    userRole?: string;
}

export default function WorkLogsContent({ initialLogs, pagination, customers, services, settings, userRole }: WorkLogsContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Local state for UI
    const [activeModal, setActiveModal] = useState<"batch" | "edit" | "delete" | "import" | null>(null);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    // Filter states synced with URL
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [statusTab, setStatusTab] = useState(searchParams.get("tab") || "Unbilled");
    const [filterCustomer, setFilterCustomer] = useState(searchParams.get("customerId") || "");
    const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
    const [dateTo, setDateTo] = useState(searchParams.get("to") || "");

    // Sync from URL if it changes externally
    useEffect(() => {
        setSearchTerm(searchParams.get("search") || "");
        setStatusTab(searchParams.get("tab") || "Unbilled");
        setFilterCustomer(searchParams.get("customerId") || "");
        setDateFrom(searchParams.get("from") || "");
        setDateTo(searchParams.get("to") || "");
    }, [searchParams]);

    // Update URL helper
    const updateFilters = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === "") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        if (newParams.page === undefined) {
            params.set("page", "1");
        }

        startTransition(() => {
            router.push(`/work-logs?${params.toString()}`);
        });
    };

    // Debounce search update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (searchParams.get("search") || "")) {
                updateFilters({ search: searchTerm });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleTabChange = (tab: string) => {
        setStatusTab(tab);
        updateFilters({ tab, page: "1" });
    };

    const handlePageChange = (page: number) => {
        updateFilters({ page: page.toString() });
    };

    const handleEdit = (log: any) => {
        if (log.status === "Billed") {
            toast.error("Cannot edit billed logs.");
            return;
        }
        setSelectedLog(log);
        setActiveModal("edit");
    };

    const handleDelete = (id: string | string[]) => {
        if (Array.isArray(id)) {
            // Bulk delete
            setSelectedLog({ isBulk: true, ids: id });
            setActiveModal("delete");
        } else {
            const log = initialLogs.find(l => l.id.toString() === id.toString());
            if (log) {
                if (log.status === "Billed") {
                    toast.error("Cannot delete billed logs.");
                    return;
                }
                setSelectedLog(log);
                setActiveModal("delete");
            }
        }
    };

    const onDeleteConfirm = async () => {
        if (!selectedLog) return;

        startTransition(async () => {
            if (selectedLog.isBulk) {
                const numericIds = selectedLog.ids.map((id: string) => parseInt(id, 10));
                const result = await deleteWorkLogsBatch(numericIds);
                if (result.success) {
                    toast.success(`Successfully deleted ${result.data.count} work logs.`);
                    setActiveModal(null);
                    setSelectedLog(null);
                    router.refresh();
                } else {
                    toast.error(result.error || "Failed to delete work logs");
                }
            } else {
                const result = await deleteWorkLog(selectedLog.id);
                if (result.success) {
                    toast.success("Work log deleted successfully");
                    setActiveModal(null);
                    setSelectedLog(null);
                    router.refresh();
                } else {
                    toast.error(result.error || "Failed to delete work log");
                }
            }
        });
    };

    const onEditSubmit = async (data: any) => {
        startTransition(async () => {
            const result = await updateWorkLog(selectedLog.id, {
                ...data,
                quantity: parseFloat(data.quantity),
                rate: parseFloat(data.rate)
            });

            if (result.success) {
                toast.success("Work log updated successfully");
                setActiveModal(null);
                setSelectedLog(null);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update work log");
            }
        });
    };

    const handleBatchSubmit = async (data: any) => {
        const logsData = data.logs || [];

        startTransition(async () => {
            const batchPayload = logsData.map((logEntry: any) => {
                const service = services.find(s => s.id === logEntry.serviceId);
                const rate = service ? parseFloat(service.rate.toString()) : 0;

                return {
                    date: logEntry.date,
                    customerId: logEntry.customerId,
                    serviceId: logEntry.serviceId,
                    description: logEntry.description || "",
                    quantity: parseFloat(logEntry.quantity) || 1,
                    rate: rate
                };
            });

            const result = await createWorkLogsBatch(batchPayload);

            if (result.success) {
                toast.success(`Successfully created ${result.data.count} work logs.`);
                setActiveModal(null);
                // router.refresh(); // Handle by revalidatePath
            } else {
                toast.error(result.error || "Failed to create work logs.");
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-text-main tracking-tight">Work Logs</h1>
                <p className="text-text-muted mt-2">Track and manage all work entries.</p>
            </div>

            {/* Header / Tabs / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-surface p-4 rounded-lg border border-border-subtle shadow-sm">
                <div className="flex items-center gap-2 bg-bg-app p-1 rounded-lg">
                    {(["Unbilled", "Billed", "Archived"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${statusTab === tab
                                ? "bg-bg-surface text-primary shadow-sm"
                                : "text-text-muted hover:text-text-main hover:bg-bg-surface/50"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {userRole === "Owner" && (
                        <Button variant="outline" onClick={() => setActiveModal("import")} className="flex items-center gap-2">
                            <FileText size={18} /> Import Logs
                        </Button>
                    )}
                    <Button onClick={() => setActiveModal("batch")} className="flex items-center gap-2">
                        <Plus size={18} /> Log Work
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                        <Input
                            placeholder="Search logs..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <Select
                            value={filterCustomer}
                            onChange={(e) => {
                                setFilterCustomer(e.target.value);
                                updateFilters({ customerId: e.target.value, page: "1" });
                            }}
                            className="w-full sm:w-[200px]"
                        >
                            <option value="">All Customers</option>
                            {sortCustomers(customers).map(c => (
                                <option key={c.id} value={c.id}>{c.id}</option>
                            ))}
                        </Select>

                        <div className="flex items-center gap-2 bg-bg-surface px-3 rounded-md border border-border-default">
                            <span className="text-xs text-text-muted whitespace-nowrap">Date:</span>
                            <input
                                type="date"
                                className="bg-transparent text-sm py-2 outline-none text-text-main w-[110px]"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    updateFilters({ from: e.target.value, page: "1" });
                                }}
                            />
                            <span className="text-text-muted">-</span>
                            <input
                                type="date"
                                className="bg-transparent text-sm py-2 outline-none text-text-main w-[110px]"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    updateFilters({ to: e.target.value, page: "1" });
                                }}
                            />
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchTerm("");
                                setFilterCustomer("");
                                setDateFrom("");
                                setDateTo("");
                                setStatusTab("Unbilled");
                                updateFilters({ search: "", customerId: "", from: "", to: "", tab: "Unbilled", page: "1" });
                            }}
                            title="Reset Filters"
                        >
                            <RefreshCcw size={18} />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Content */}
            <div className={`transition-opacity duration-200 ${isPending ? "opacity-70 pointer-events-none" : "opacity-100"}`}>
                <WorkLogTable
                    logs={initialLogs}
                    customers={customers}
                    services={services}
                    settings={settings}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                hasNextPage={pagination.currentPage < pagination.totalPages}
                hasPrevPage={pagination.currentPage > 1}
            />

            {/* Modals */}
            {activeModal === "batch" && (
                <BatchLogForm
                    onClose={() => setActiveModal(null)}
                    onSubmit={handleBatchSubmit}
                    customers={customers}
                    services={services}
                />
            )}

            {activeModal === "import" && (
                <ImportWorkLogsModal
                    onClose={() => setActiveModal(null)}
                    customers={customers}
                    services={services}
                />
            )}

            {activeModal === "edit" && selectedLog && (
                <WorkLogForm
                    defaultValues={{
                        ...selectedLog,
                        date: typeof selectedLog.date === 'string'
                            ? selectedLog.date
                            : selectedLog.date instanceof Date
                                ? selectedLog.date.toISOString().split('T')[0]
                                : new Date().toISOString().split('T')[0]
                    }}
                    customers={customers}
                    services={services}
                    onClose={() => {
                        setActiveModal(null);
                        setSelectedLog(null);
                    }}
                    onSubmit={onEditSubmit}
                />
            )}

            {activeModal === "delete" && selectedLog && (
                <DeleteWorkLogModal
                    logId={selectedLog.isBulk ? selectedLog.ids.length : selectedLog.id}
                    isBulk={selectedLog.isBulk}
                    onClose={() => {
                        setActiveModal(null);
                        setSelectedLog(null);
                    }}
                    onConfirm={onDeleteConfirm}
                />
            )}
        </div>
    );
}
