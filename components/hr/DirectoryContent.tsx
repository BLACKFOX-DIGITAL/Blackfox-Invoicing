"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import EmployeeModal from "@/components/hr/EmployeeModal";
import ArchiveEmployeeModal from "@/components/hr/ArchiveEmployeeModal";
import { Plus, Trash2, Edit2, Loader2, Mail, Phone, Archive, ArchiveRestore, Calendar, LogOut } from "lucide-react";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, restoreEmployee, EmployeeWithRelations } from "@/app/actions/hr";
import { useToast } from "@/components/ui/ToastProvider";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRole } from "@/lib/roleContext";

type Tab = "Active" | "Archived";

export default function DirectoryContent() {
    const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("Active");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithRelations | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<EmployeeWithRelations | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();
    const { role } = useRole();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isManager = role === "Owner" || role === "Manager" || role === "VendorManager";

    useEffect(() => {
        fetchEmployees();
    }, [tab]);

    const fetchEmployees = async () => {
        setLoading(true);
        const result = await getEmployees(tab);
        if (result.success && result.data) {
            setEmployees(result.data as any);
        } else {
            toast.error("Failed to load employees");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to permanently remove ${name}? This cannot be undone.`)) {
            const result = await deleteEmployee(id);
            if (result.success) {
                fetchEmployees();
                toast.success("Employee permanently removed");
            } else {
                toast.error(result.error || "Failed to delete employee");
            }
        }
    };

    const handleRestore = async (id: string, name: string) => {
        const result = await restoreEmployee(id);
        if (result.success) {
            fetchEmployees();
            toast.success(`${name} has been restored to Active.`);
        } else {
            toast.error(result.error || "Failed to restore employee");
        }
    };

    const handleSaveEmployee = async (data: any) => {
        setIsSubmitting(true);
        let result: any;

        if (selectedEmployee) {
            result = await updateEmployee(selectedEmployee.id, data);
        } else {
            result = await createEmployee(data);
        }

        if (result.success) {
            setIsModalOpen(false);
            fetchEmployees();
            toast.success(selectedEmployee ? "Employee updated" : "Employee added");
        } else {
            toast.error(result.error || "Failed to save employee");
        }
        setIsSubmitting(false);
    };

    const sortField = searchParams.get("sortField") || "firstName";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "asc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", field);
        params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    const sortedEmployees = [...employees].sort((a, b) => {
        let valA: any = a[sortField as keyof EmployeeWithRelations];
        let valB: any = b[sortField as keyof EmployeeWithRelations];

        if (sortField === "joinDate") {
            valA = a.joinDate ? new Date(a.joinDate).getTime() : 0;
            valB = b.joinDate ? new Date(b.joinDate).getTime() : 0;
        } else if (typeof valA === "string") {
            valA = valA.toLowerCase();
            valB = (valB as string)?.toLowerCase() || "";
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    if (loading && employees.length === 0) {
        return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10 mt-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Employee Directory</h1>
                    <p className="text-text-muted text-sm mt-1">Manage team members and job details</p>
                </div>
                {isManager && tab === "Active" && (
                    <Button
                        onClick={() => { setSelectedEmployee(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} /> Add Employee
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-bg-app p-1 rounded-xl border border-border-subtle/50 w-fit">
                {(["Active", "Archived"] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            tab === t
                                ? "bg-bg-sidebar text-text-main shadow-sm border border-border-subtle/30"
                                : "text-text-muted hover:text-text-main"
                        }`}
                    >
                        {t === "Active" ? <Plus size={14} /> : <Archive size={14} />}
                        {t}
                    </button>
                ))}
            </div>

            <Card className="overflow-hidden bg-card border-border shadow-sm">
                {tab === "Active" ? (
                    <Table
                        headers={[
                            <SortableHeader label="Employee Name" sortKey="firstName" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Designation" sortKey="designation" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Join Date" sortKey="joinDate" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Gross Salary" sortKey="grossSalary" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            isManager ? <div className="text-right">Actions</div> : null
                        ].filter(Boolean)}
                        data={sortedEmployees}
                        renderRow={(employee: EmployeeWithRelations) => (
                            <tr key={employee.id} className="border-b border-border hover:bg-background/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                            {(employee.firstName?.charAt(0) || "")}{(employee.lastName?.charAt(0) || "")}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-text-main text-sm">{employee.firstName} {employee.lastName}</div>
                                            <div className="text-xs text-text-muted flex items-center gap-3 mt-1">
                                                {employee.email && <span className="flex items-center gap-1"><Mail size={12} /> {employee.email}</span>}
                                                {employee.phone && <span className="flex items-center gap-1"><Phone size={12} /> {employee.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-text-main">{employee.designation || "-"}</div>
                                    <div className="text-xs text-text-muted mt-0.5">{employee.department || "-"}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-text-main">
                                    {employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-text-main">
                                    {isManager ? `৳${(employee.grossSalary || 0).toLocaleString()}` : "Hidden"}
                                </td>
                                {isManager && (
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                                                onClick={() => { setSelectedEmployee(employee); setIsModalOpen(true); }}
                                                title="Edit Employee"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="p-1.5 text-text-muted hover:text-status-warning hover:bg-status-warning/5 rounded-md transition-colors"
                                                onClick={() => setArchiveTarget(employee)}
                                                title="Archive Employee"
                                            >
                                                <Archive size={16} />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        )}
                    />
                ) : (
                    /* Archived tab */
                    sortedEmployees.length === 0 ? (
                        <div className="p-12 text-center text-text-muted">
                            <Archive size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No archived employees</p>
                        </div>
                    ) : (
                        <Table
                            headers={[
                                "Employee",
                                "Designation",
                                "Exit Reason",
                                "Exit Date",
                                isManager ? <div className="text-right">Actions</div> : null
                            ].filter(Boolean)}
                            data={sortedEmployees}
                            renderRow={(employee: any) => (
                                <tr key={employee.id} className="border-b border-border hover:bg-background/50 transition-colors opacity-80">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-text-muted/10 text-text-muted flex items-center justify-center font-bold text-sm shrink-0">
                                                {(employee.firstName?.charAt(0) || "")}{(employee.lastName?.charAt(0) || "")}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-text-main text-sm">{employee.firstName} {employee.lastName}</div>
                                                {employee.exitNotes && (
                                                    <div className="text-xs text-text-muted mt-0.5 max-w-xs truncate">{employee.exitNotes}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-text-main">{employee.designation || "-"}</div>
                                        <div className="text-xs text-text-muted">{employee.department || "-"}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            employee.exitReason === "Resigned" ? "bg-blue-500/10 text-blue-400" :
                                            employee.exitReason === "Terminated" ? "bg-status-error/10 text-status-error" :
                                            employee.exitReason === "Retired" ? "bg-status-success/10 text-status-success" :
                                            "bg-text-muted/10 text-text-muted"
                                        }`}>
                                            <LogOut size={11} />
                                            {employee.exitReason || "—"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-muted">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={13} />
                                            {employee.exitDate ? new Date(employee.exitDate).toLocaleDateString() : "—"}
                                        </span>
                                    </td>
                                    {isManager && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="p-1.5 text-text-muted hover:text-status-success hover:bg-status-success/5 rounded-md transition-colors"
                                                    onClick={() => handleRestore(employee.id, `${employee.firstName} ${employee.lastName || ""}`)}
                                                    title="Restore to Active"
                                                >
                                                    <ArchiveRestore size={16} />
                                                </button>
                                                <button
                                                    className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/5 rounded-md transition-colors"
                                                    onClick={() => handleDelete(employee.id, `${employee.firstName} ${employee.lastName || ""}`)}
                                                    title="Permanently Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )}
                        />
                    )
                )}
            </Card>

            {isModalOpen && (
                <EmployeeModal
                    employee={selectedEmployee}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveEmployee}
                    isSubmitting={isSubmitting}
                />
            )}

            {archiveTarget && (
                <ArchiveEmployeeModal
                    employee={archiveTarget}
                    onClose={() => setArchiveTarget(null)}
                    onArchived={fetchEmployees}
                />
            )}
        </div>
    );
}
