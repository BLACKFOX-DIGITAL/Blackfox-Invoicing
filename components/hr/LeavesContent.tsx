"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import LeaveModal from "@/components/hr/LeaveModal";
import { Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getLeaveRequests, createLeaveRequest, updateLeaveRequestStatus, LeaveRequestWithEmployee } from "@/app/actions/hr";
import { useToast } from "@/components/ui/ToastProvider";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRole } from "@/lib/roleContext";

export default function LeavesContent() {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [balance, setBalance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();
    const { role } = useRole();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isManager = role === "Owner" || role === "Manager" || role === "VendorManager";

    useEffect(() => {
        fetchRequests();
        if (isManager) {
            fetchEmployees();
        } else {
            fetchBalance();
        }
    }, [role, selectedMonth, selectedYear]);

    const fetchRequests = async () => {
        setLoading(true);
        const result = await getLeaveRequests(selectedMonth, selectedYear);
        if (result.success && result.data) {
            setRequests(result.data as any);
        } else {
            toast.error("Failed to load leave requests");
        }
        setLoading(false);
    };

    const fetchEmployees = async () => {
        const { getEmployees } = await import("@/app/actions/hr");
        const result = await getEmployees();
        if (result.success && result.data) {
            setEmployees(result.data);
        }
    };

    const fetchBalance = async () => {
        const { getLeaveBalance } = await import("@/app/actions/hr");
        const result = await getLeaveBalance();
        if (result.success) {
            setBalance(result.data);
        }
    };

    const handleAction = async (id: number, status: string) => {
        if (!confirm(`Are you sure you want to ${status.toLowerCase()} this leave request?`)) return;

        const result = await updateLeaveRequestStatus(id, status);
        if (result.success) {
            toast.success(`Leave request ${status.toLowerCase()}`);
            fetchRequests();
        } else {
            toast.error(result.error || `Failed to ${status.toLowerCase()} leave request`);
        }
    };

    const handleCreateRequest = async (data: any) => {
        setIsSubmitting(true);
        const result = await createLeaveRequest(data);

        if (result.success) {
            setIsModalOpen(false);
            fetchRequests();
            toast.success("Leave request submitted successfully");
        } else {
            toast.error(result.error || "Failed to submit request");
        }
        setIsSubmitting(false);
    };

    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "desc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", field);
        params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    const sortedRequests = [...requests].sort((a, b) => {
        let valA: any = a[sortField as keyof LeaveRequestWithEmployee];
        let valB: any = b[sortField as keyof LeaveRequestWithEmployee];

        if (sortField === "employeeName") {
            valA = `${a.employee.firstName} ${a.employee.lastName}`.toLowerCase();
            valB = `${b.employee.firstName} ${b.employee.lastName}`.toLowerCase();
        } else if (sortField === "createdAt" || sortField === "startDate" || sortField === "endDate") {
            valA = new Date(valA || 0).getTime();
            valB = new Date(valB || 0).getTime();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "Approved": return "success";
            case "Rejected": return "error";
            default: return "warning";
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('en', { month: 'long' }) }));
    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10 mt-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Leave Management</h1>
                    <p className="text-text-muted text-sm mt-1">Submit and track time-off requests</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/50">
                        <Plus size={14} className="text-text-muted rotate-45" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium text-text-main focus:outline-none"
                        >
                            <option value={0}>All Months</option>
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium text-text-main focus:outline-none border-l border-border pl-2"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} /> {isManager ? "Input Leave" : "Request Leave"}
                    </Button>
                </div>
            </div>

            {!isManager && balance && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 bg-primary/5 border-primary/20">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Entitlement</p>
                        <p className="text-2xl font-black text-text-main mt-1">{balance.entitlement} Days</p>
                    </Card>
                    <Card className="p-4 bg-status-success/5 border-status-success/20">
                        <p className="text-xs font-bold text-status-success uppercase tracking-wider">Paid Leaves Used</p>
                        <p className="text-2xl font-black text-text-main mt-1">{balance.usedDays} Days</p>
                    </Card>
                    <Card className="p-4 bg-status-warning/5 border-status-warning/20">
                        <p className="text-xs font-bold text-status-warning uppercase tracking-wider">Remaining Balance</p>
                        <p className="text-2xl font-black text-text-main mt-1">{balance.remaining} Days</p>
                    </Card>
                </div>
            )}

            <Card className="overflow-hidden bg-card border-border shadow-sm">
                <Table
                    headers={[
                        isManager ? <SortableHeader label="Employee Name" sortKey="employeeName" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} /> : null,
                        <SortableHeader label="Category" sortKey="isPaid" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                        <SortableHeader label="Leave Type" sortKey="type" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                        <SortableHeader label="Start Date" sortKey="startDate" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                        <SortableHeader label="End Date" sortKey="endDate" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                        <SortableHeader label="Reason" sortKey="reason" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                        <SortableHeader label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                        isManager ? <div className="text-right">Actions</div> : null
                    ].filter(Boolean)}
                    data={sortedRequests}
                    renderRow={(req: LeaveRequestWithEmployee) => (
                        <tr key={req.id} className="border-b border-border hover:bg-background/50 transition-colors">
                            {isManager && (
                                <td className="px-6 py-4 font-semibold text-text-main text-sm">
                                    {req.employee.firstName} {req.employee.lastName}
                                </td>
                            )}
                            <td className="px-6 py-4">
                                <Badge variant={req.isPaid ? "success" : "secondary"}>
                                    {req.isPaid ? "Paid" : "Unpaid"}
                                </Badge>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-medium text-text-main text-sm">{req.type}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-text-muted">
                                {new Date(req.startDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-text-muted">
                                {new Date(req.endDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-text-main max-w-[200px] truncate" title={req.reason}>
                                {req.reason}
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
                            </td>
                            {isManager && (
                                <td className="px-6 py-4 text-right">
                                    {req.status === "Pending" ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                className="p-1.5 text-text-muted hover:text-status-success hover:bg-status-success/10 rounded-md transition-colors"
                                                onClick={() => handleAction(req.id, "Approved")}
                                                title="Approve"
                                            >
                                                <CheckCircle2 size={18} />
                                            </button>
                                            <button
                                                className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded-md transition-colors"
                                                onClick={() => handleAction(req.id, "Rejected")}
                                                title="Reject"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-text-muted italic">Processed</span>
                                    )}
                                </td>
                            )}
                        </tr>
                    )}
                />
            </Card>

            {isModalOpen && (
                <LeaveModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleCreateRequest}
                    isSubmitting={isSubmitting}
                    employees={isManager ? employees : undefined}
                />
            )}
        </div>
    );
}
