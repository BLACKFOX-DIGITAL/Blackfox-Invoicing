"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Edit, Trash2, Search, Filter, Users, UserCheck, Briefcase, Clock, AlertCircle } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { deleteCustomer, SerializedCustomerData } from "@/app/actions/customers";
import { useToast } from "@/components/ui/ToastProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SortableHeader from "@/components/ui/SortableHeader";

interface CustomersContentProps {
    initialCustomersData: SerializedCustomerData;
}

export default function CustomersContent({ initialCustomersData }: CustomersContentProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [customers, setCustomers] = useState(initialCustomersData.customers);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const toast = useToast();

    // Sync with URL
    useEffect(() => {
        setCustomers(initialCustomersData.customers);
    }, [initialCustomersData]);

    const activeFilterStatus = searchParams.get("status") || "";

    useEffect(() => {
        const urlSearch = searchParams.get("search") || "";
        setSearchTerm(urlSearch);
    }, [searchParams]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const current = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                current.set("search", searchTerm);
            } else {
                current.delete("search");
            }
            current.set("page", "1");
            router.push(`${pathname}?${current.toString()}`);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, pathname, router]);

    const handleFilterChange = (key: string, value: string | null) => {
        const current = new URLSearchParams(searchParams.toString());
        if (value) {
            current.set(key, value);
        } else {
            current.delete(key);
        }
        if (key !== "page" && key !== "sortField" && key !== "sortOrder") {
            current.set("page", "1");
        }
        router.push(`${pathname}?${current.toString()}`);
    };

    const sortField = searchParams.get("sortField") || "id";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "desc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';

        const current = new URLSearchParams(searchParams.toString());
        current.set("sortField", field);
        current.set("sortOrder", newOrder);
        router.push(`${pathname}?${current.toString()}`);
    };

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({
        isOpen: false,
        id: null,
        name: ""
    });

    const handleDeleteClick = (id: string, name: string) => {
        setDeleteModal({ isOpen: true, id, name });
    };

    const handleConfirmDelete = async () => {
        if (deleteModal.id) {
            const result = await deleteCustomer(deleteModal.id);

            if (result.success) {
                setCustomers(customers.filter(c => c.id !== deleteModal.id));
                setDeleteModal({ isOpen: false, id: null, name: "" });
            } else {
                toast.error(result.error || "Failed to delete customer");
                setDeleteModal({ isOpen: false, id: null, name: "" });
            }

            startTransition(() => {
                router.refresh();
            });
        }
    };

    const dormantCount = initialCustomersData.customers.filter(c => {
        const lastLogDate = c.lastWorkLogDate ? new Date(c.lastWorkLogDate) : null;
        return lastLogDate && (new Date().getTime() - lastLogDate.getTime() > 45 * 24 * 60 * 60 * 1000);
    }).length;

    let filteredCustomers = customers;

    if (activeFilterStatus) {
        filteredCustomers = filteredCustomers.filter(c => {
            if (activeFilterStatus === "Active") return c.status === "Active";
            if (activeFilterStatus === "Inactive") return c.status === "Inactive";
            if (activeFilterStatus === "Dormant") {
                const lastLogDate = c.lastWorkLogDate ? new Date(c.lastWorkLogDate) : null;
                return lastLogDate && (new Date().getTime() - lastLogDate.getTime() > 45 * 24 * 60 * 60 * 1000);
            }
            return true;
        });
    }

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filteredCustomers = filteredCustomers.filter(c =>
            c.name.toLowerCase().includes(lowerTerm) ||
            c.id.toLowerCase().includes(lowerTerm) ||
            (c.email && c.email.toLowerCase().includes(lowerTerm))
        );
    }

    // Client-side Sort
    filteredCustomers.sort((a, b) => {
        let valA: any;
        let valB: any;

        switch (sortField) {
            case 'id':
                valA = a.id;
                valB = b.id;
                break;
            case 'name':
                valA = (a.name || "").toLowerCase();
                valB = (b.name || "").toLowerCase();
                break;
            case 'status':
                valA = a.status;
                valB = b.status;
                break;
            case 'paymentStatus':
                valA = a.paymentStatus;
                valB = b.paymentStatus;
                break;
            default:
                valA = a.id;
                valB = b.id;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const displayedCustomers = filteredCustomers;

    return (
        <div className="max-w-[1400px] mx-auto space-y-8">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Customers</h1>
                    <p className="text-text-muted mt-2">Manage your client relationships.</p>
                </div>
                <Button href="/customers/new" className="rounded-full px-6">+ Add Customer</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Customers</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Users size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">{customers.length}</div>
                        <span className="text-[10px] font-medium text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">In database</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Customers</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <UserCheck size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {customers.filter(c => c.status === "Active").length}
                        </div>
                        <span className="text-[10px] font-medium text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">
                            {customers.length > 0 ? Math.round((customers.filter(c => c.status === "Active").length / customers.length) * 100) : 0}% Rate
                        </span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Projects</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Briefcase size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {customers.reduce((acc, curr) => acc + (typeof curr.projects === 'number' ? curr.projects : parseInt(curr.projects) || 0), 0)}
                        </div>
                        <span className="text-[10px] font-medium text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">Across all clients</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Dormant Customers</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Clock size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {dormantCount}
                        </div>
                        <span className="text-[10px] font-medium text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded">No work &gt; 45 Days</span>
                    </div>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 px-2">
                <div className="flex-1">
                    <Input
                        startIcon={<Search size={18} />}
                        placeholder="Search by name, ID, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-bg-card"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-text-muted" />
                    <Select
                        className="bg-bg-card w-40"
                        value={activeFilterStatus}
                        onChange={(e) => handleFilterChange("status", e.target.value || null)}
                    >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Dormant">Dormant (&gt; 45 days)</option>
                    </Select>
                </div>
                {searchTerm || activeFilterStatus ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSearchTerm(""); handleFilterChange("status", null); }}
                        className="text-text-muted hover:text-text-main"
                    >
                        Clear Filters
                    </Button>
                ) : null}
            </div>

            {displayedCustomers.length === 0 ? (
                <EmptyState
                    title="No Customers Found"
                    description={searchTerm || activeFilterStatus ? "No customers match your search or filter criteria. Try clearing filters or searching for something else." : "You haven't added any customers yet. Add your first customer to start invoicing!"}
                    icon={Users}
                    action={!(searchTerm || activeFilterStatus) ? {
                        label: "Add Your First Customer",
                        onClick: () => router.push("/customers/new")
                    } : undefined}
                    className="my-12"
                />
            ) : (
                <Card className="border-0 shadow-sm ring-1 ring-black/5">
                    <Table
                        headers={[
                            <SortableHeader key="sh_id" label="Customer ID" sortKey="id" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_name" label="Name" sortKey="name" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_stat" label="Status" sortKey="status" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <SortableHeader key="sh_pstat" label="Payment Status" sortKey="paymentStatus" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                            <div key="sh_act" className="text-right w-full font-bold font-sans text-white">Actions</div>
                        ]}
                        alignments={["left", "left", "left", "left", "right"]}
                        data={displayedCustomers}
                        renderRow={(row, i) => {
                            const hasOverdue = row.hasOverdue;

                            return (
                                <tr key={row.id} className="group hover:bg-bg-app/50 transition-colors border-b border-border-subtle/30 last:border-0 text-sm">
                                    <td className="text-text-main px-6 py-4 font-mono font-medium text-xs">{row.id}</td>
                                    <td className="font-semibold text-text-main py-4 px-6">
                                        <Link href={`/customers/${row.id}`} className="hover:text-primary transition-colors">{row.name}</Link>
                                        <div className="text-xs text-text-muted font-normal mt-0.5">{row.email}</div>
                                    </td>
                                    <td className="px-6">
                                        <Badge variant={row.status === "Active" ? "success" : "secondary"}>
                                            {row.status}
                                        </Badge>
                                        {(() => {
                                            const lastLogDate = row.lastWorkLogDate ? new Date(row.lastWorkLogDate) : null;
                                            const isDormant = lastLogDate && (new Date().getTime() - lastLogDate.getTime() > 45 * 24 * 60 * 60 * 1000);
                                            if (isDormant) {
                                                return (
                                                    <div className="mt-1 flex items-center gap-1 text-[10px] text-status-warning font-medium">
                                                        <Clock size={10} />
                                                        <span>Dormant</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </td>
                                    <td className="px-6">
                                        <Badge variant={
                                            (row as any).paymentStatus === "Overdue" ? "error" :
                                                (row as any).paymentStatus === "Outstanding" ? "warning" :
                                                    "success"
                                        }>
                                            {(row as any).paymentStatus || (row.hasOverdue ? "Overdue" : "All Clear")}
                                        </Badge>
                                    </td>
                                    <td className="px-6 last:pr-8 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Link href={`/customers/${row.id}/edit`} className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 border border-transparent rounded-lg transition-all" title="Edit Customer">
                                                <Edit size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteClick(row.id, row.name)}
                                                className="p-2 text-text-muted hover:text-status-error hover:bg-status-error/5 border border-transparent rounded-lg transition-all"
                                                title="Delete Customer"
                                                disabled={isPending}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }}
                    />

                    {/* Pagination */}
                    {initialCustomersData.totalPages > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 border-t border-border-subtle bg-bg-surface/30">
                            <div className="text-sm text-text-muted font-medium">
                                Showing <span className="text-text-main">{displayedCustomers.length}</span> of <span className="text-text-main">{initialCustomersData.totalCount}</span> customers
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFilterChange("page", (initialCustomersData.currentPage - 1).toString())}
                                    disabled={initialCustomersData.currentPage <= 1}
                                    className="p-2 border border-border-subtle hover:bg-bg-app rounded-lg"
                                >
                                    <ChevronLeft size={18} />
                                </Button>
                                <div className="flex items-center px-3 text-sm font-bold text-text-main bg-bg-app rounded-lg border border-border-subtle">
                                    {initialCustomersData.currentPage}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFilterChange("page", (initialCustomersData.currentPage + 1).toString())}
                                    disabled={initialCustomersData.currentPage >= initialCustomersData.totalPages}
                                    className="p-2 border border-border-subtle hover:bg-bg-app rounded-lg"
                                >
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
                onConfirm={handleConfirmDelete}
                itemName={deleteModal.name}
            />
        </div>
    );
}
