"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import PayrollModal from "@/components/hr/PayrollModal";
import SalaryStructureModal from "@/components/hr/SalaryStructureModal";
import IncrementModal from "@/components/hr/IncrementModal";
import DownloadPayrollModal from "@/components/hr/DownloadPayrollModal";
import FestivalBonusModal from "@/components/hr/FestivalBonusModal";
import { Play, DollarSign, Loader2, Edit2, Calendar, Settings, TrendingUp, ChevronDown, ChevronRight, Download, PartyPopper } from "lucide-react";
import { getPayrollRecords, generatePayroll, updatePayrollRecord, markPayrollAsPaid, PayrollRecordWithEmployee } from "@/app/actions/hr";
import { useToast } from "@/components/ui/ToastProvider";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRole } from "@/lib/roleContext";

export default function PayrollContent() {
    const [records, setRecords] = useState<PayrollRecordWithEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isPayingBulk, setIsPayingBulk] = useState(false);

    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PayrollRecordWithEmployee | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
    const [isIncrementModalOpen, setIsIncrementModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [isFestivalBonusModalOpen, setIsFestivalBonusModalOpen] = useState(false);
    const [incrementEmployee, setIncrementEmployee] = useState<{ id: string, name: string } | null>(null);

    const toast = useToast();
    const { role, company } = useRole();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isManager = role === "Owner" || role === "Manager" || role === "VendorManager";

    useEffect(() => {
        fetchRecords();
    }, [selectedMonth, selectedYear]);

    const fetchRecords = async () => {
        setLoading(true);
        const result = await getPayrollRecords(selectedMonth, selectedYear);
        if (result.success && result.data) {
            setRecords(result.data as any);
        } else {
            toast.error("Failed to load payroll records");
        }
        setLoading(false);
    };

    const handleGenerate = async () => {
        if (!confirm(`Are you sure you want to generate payroll for all employees for ${selectedMonth}/${selectedYear}? This will also apply any scheduled increments.`)) return;

        setIsGenerating(true);
        const result = await generatePayroll(selectedMonth, selectedYear);
        if (result.success) {
            toast.success(`Generated ${result.data} new payslips`);
            fetchRecords();
        } else {
            toast.error(result.error || "Failed to generate payroll");
        }
        setIsGenerating(false);
    };

    const handleSaveRecord = async (id: number, data: any) => {
        setIsSubmitting(true);
        const result = await updatePayrollRecord(id, data);

        if (result.success) {
            setIsModalOpen(false);
            fetchRecords();
            toast.success("Payslip updated");
        } else {
            toast.error(result.error || "Failed to update payslip");
        }
        setIsSubmitting(false);
    };

    const selectableRecords = records.filter(r => r.status !== "Paid");

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(selectableRecords.map(r => r.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkPay = async () => {
        if (selectedIds.size === 0) return;
        setIsPayingBulk(true);
        const result = await markPayrollAsPaid(Array.from(selectedIds));
        if (result.success) {
            toast.success(`Successfully marked ${result.data?.count || selectedIds.size} records as Paid`);
            setSelectedIds(new Set());
            fetchRecords();
        } else {
            toast.error(result.error || "Failed to update records");
        }
        setIsPayingBulk(false);
    };

    const sortField = searchParams.get("sortField") || "status";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "asc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", field);
        params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    const sortedRecords = [...records].sort((a, b) => {
        let valA: any = a[sortField as keyof PayrollRecordWithEmployee];
        let valB: any = b[sortField as keyof PayrollRecordWithEmployee];

        if (sortField === "employeeName") {
            valA = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.toLowerCase();
            valB = `${b.employee?.firstName || ""} ${b.employee?.lastName || ""}`.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('en', { month: 'long' }) }));
    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10 mt-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Payroll Processing</h1>
                    <p className="text-text-muted text-sm mt-1">Manage monthly salary runs, breakdowns and increments</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/50">
                        <Calendar size={16} className="text-text-muted" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium text-text-main focus:outline-none"
                        >
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

                    {isManager && (
                        <div className="flex gap-2 items-center">
                            {selectedIds.size > 0 && (
                                <Button
                                    onClick={handleBulkPay}
                                    disabled={isPayingBulk}
                                    className="flex items-center gap-2 bg-status-success hover:bg-status-success/90 text-white"
                                >
                                    {isPayingBulk ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                                    Mark {selectedIds.size} Paid
                                </Button>
                            )}
                            {records.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsFestivalBonusModalOpen(true)}
                                    className="flex items-center gap-2 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/5"
                                    title="Apply festival bonus (= Basic Salary) to employees"
                                >
                                    <PartyPopper size={16} /> Festival Bonus
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                onClick={() => setIsDownloadModalOpen(true)}
                                className="flex items-center gap-2"
                                title="Download Bank PDF/Excel"
                                disabled={records.length === 0}
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Download</span>
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setIsStructureModalOpen(true)}
                                className="flex items-center gap-2"
                                title="Define salary division ratios"
                            >
                                <Settings size={16} />
                                <span className="hidden sm:inline">Structure</span>
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || loading}
                                className="flex items-center gap-2 shadow-inner"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Generate Payroll
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Card className="overflow-hidden bg-card border-border shadow-sm">
                {loading && records.length === 0 ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : records.length === 0 ? (
                    <div className="p-16 text-center text-text-muted">
                        <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-text-main">No payroll records found.</p>
                        {isManager && <p className="text-sm mt-1">Click "Generate Payroll" to create payslips for all active employees.</p>}
                    </div>
                ) : (() => {
                    const totalGross = sortedRecords.reduce((sum, r) => sum + (Number(r.grossSalary) || 0), 0);
                    const totalAdditions = sortedRecords.reduce((sum, r) => sum + (Number(r.additions) || 0), 0);
                    const totalDeductions = sortedRecords.reduce((sum, r) => sum + (Number(r.deductions) || 0), 0);
                    const totalNet = sortedRecords.reduce((sum, r) => sum + (Number(r.netSalary) || 0), 0);

                    return (
                    <Table
                        headers={[
                            <div key="select-all" className="flex items-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-border-default bg-bg-surface text-primary focus:ring-primary focus:ring-offset-bg-card transition-colors cursor-pointer"
                                    checked={selectableRecords.length > 0 && selectedIds.size === selectableRecords.length}
                                    onChange={handleSelectAll}
                                    disabled={selectableRecords.length === 0}
                                />
                            </div>,
                            <SortableHeader label="Employee" sortKey="employeeName" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Gross Pay" sortKey="grossSalary" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Additions" sortKey="additions" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Deductions" sortKey="deductions" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Net Salary" sortKey="netSalary" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            isManager ? <div className="text-right">Actions</div> : null
                        ].filter(item => item !== null)}
                        data={sortedRecords}
                        renderRow={(record: PayrollRecordWithEmployee) => (
                            <React.Fragment key={record.id}>
                                <tr className="border-b border-border hover:bg-background/50 transition-colors group">
                                    <td className="px-6 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-border-default bg-bg-surface text-primary focus:ring-primary focus:ring-offset-bg-card transition-colors cursor-pointer"
                                            checked={selectedIds.has(record.id)}
                                            onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                                            disabled={record.status === "Paid"}
                                            title={record.status === "Paid" ? "Already paid" : "Select record"}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-text-main text-sm">{record.employee?.firstName || ""} {record.employee?.lastName || ""}</div>
                                        {record.employee?.designation && (
                                            <div className="text-xs text-text-muted mt-0.5">{record.employee.designation}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-main font-medium">৳{(record.grossSalary || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-status-success font-medium">+৳{(record.additions || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-status-error font-medium">-৳{(record.deductions || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-primary">৳{(record.netSalary || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={record.status === "Paid" ? "success" : "warning"}>
                                            {record.status}
                                        </Badge>
                                    </td>
                                    {isManager && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                                                    onClick={() => { setIncrementEmployee({ id: record.employeeId, name: `${record.employee.firstName} ${record.employee.lastName}` }); setIsIncrementModalOpen(true); }}
                                                    title="Schedule Increment"
                                                >
                                                    <TrendingUp size={16} />
                                                </button>
                                                <button
                                                    className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                                                    onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }}
                                                    title="Edit Payslip extras"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            </React.Fragment>
                        )}
                        footer={
                            <tr>
                                <td colSpan={2} className="px-6 py-4 text-right font-bold text-text-main">
                                    Total
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-text-main">
                                    ৳{totalGross.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-status-success">
                                    +৳{totalAdditions.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-status-error">
                                    -৳{totalDeductions.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-primary">
                                    ৳{totalNet.toLocaleString()}
                                </td>
                                <td colSpan={isManager ? 2 : 1}></td>
                            </tr>
                        }
                    />
                )})()}
            </Card>

            {isModalOpen && selectedRecord && (
                <PayrollModal
                    record={selectedRecord}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveRecord}
                    isSubmitting={isSubmitting}
                />
            )}

            {isStructureModalOpen && (
                <SalaryStructureModal
                    onClose={() => setIsStructureModalOpen(false)}
                />
            )}

            {isIncrementModalOpen && incrementEmployee && (
                <IncrementModal
                    employeeId={incrementEmployee.id}
                    employeeName={incrementEmployee.name}
                    onClose={() => setIsIncrementModalOpen(false)}
                />
            )}

            {isDownloadModalOpen && (
                <DownloadPayrollModal
                    records={records}
                    month={selectedMonth}
                    year={selectedYear}
                    company={company}
                    onClose={() => setIsDownloadModalOpen(false)}
                />
            )}

            {isFestivalBonusModalOpen && (
                <FestivalBonusModal
                    records={records as any}
                    month={selectedMonth}
                    year={selectedYear}
                    onClose={() => setIsFestivalBonusModalOpen(false)}
                    onApplied={fetchRecords}
                />
            )}
        </div>
    );
}
