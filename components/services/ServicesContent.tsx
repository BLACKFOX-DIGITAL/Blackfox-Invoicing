"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import ServiceTable from "@/components/services/ServiceTable";
import ServiceForm from "@/components/services/ServiceForm";
import { Plus, Wrench, TrendingUp, Star, Search, Filter } from "lucide-react";
import Input from "@/components/ui/Input";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { createService, updateService, deleteService } from "@/app/actions/services";
import { useToast } from "@/components/ui/ToastProvider";
import { sortCustomers } from "@/lib/format";
import { usePathname, useSearchParams } from "next/navigation";

interface ServicesContentProps {
    initialServices: any[];
    customers: any[];
    monthlyImageCount: number;
    lastMonthImageCount: number;
    yearlyImageCount: number;
    settings?: any;
    onAddService?: (data: any) => Promise<void>;
}

export default function ServicesContent({
    initialServices,
    customers,
    monthlyImageCount,
    lastMonthImageCount,
    yearlyImageCount,
    settings
}: ServicesContentProps) {
    const [services, setServices] = useState(initialServices);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCustomer, setFilterCustomer] = useState("All");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);
    const [serviceToDelete, setServiceToDelete] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const toast = useToast();

    // Update local state when server data changes (e.g. after create/update/delete)
    useEffect(() => {
        setServices(initialServices);
    }, [initialServices]);

    const filteredServices = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (service.customerId && service.customerId.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCustomer = filterCustomer === "All" ||
            service.customerId === filterCustomer;

        return matchesSearch && matchesCustomer;
    });

    const sortField = searchParams.get("sortField") || "name";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "asc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", field);
        params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    filteredServices.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "customerId") {
            valA = a.customerId || "";
            valB = b.customerId || "";
        } else if (sortField === "rate") {
            valA = Number(a.rate);
            valB = Number(b.rate);
        } else if (typeof valA === "string") {
            valA = valA.toLowerCase();
            valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const handleCreate = () => {
        setEditingService(null);
        setIsModalOpen(true);
    };

    const handleEdit = (service: any) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleDelete = (service: any) => {
        setServiceToDelete(service);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!serviceToDelete) return;

        const result = await deleteService(serviceToDelete.id);

        if (result.success) {
            setServices(services.filter(s => s.id.toString() !== serviceToDelete.id.toString()));
        } else {
            toast.error(result.error || "Failed to delete service");
        }

        setIsDeleteModalOpen(false);
        setServiceToDelete(null);

        startTransition(() => {
            router.refresh();
        });
    };

    const handleSave = async (data: any) => {
        if (editingService) {
            // Update existing service
            const result = await updateService(editingService.id, {
                name: data.name,
                description: data.description,
                rate: parseFloat(data.rate),
                customerId: data.customerId || null,
                customerName: data.customerName || null
            });

            if (result.success) {
                setServices(services.map(s => s.id === editingService.id ? { ...data, id: s.id, rate: parseFloat(data.rate) } : s));
            } else {
                toast.error(result.error || "Failed to update service");
            }
        } else {
            // Create new service
            const result = await createService({
                name: data.name,
                description: data.description,
                rate: parseFloat(data.rate),
                customerId: data.customerId || null,
                customerName: data.customerName || null
            });

            if (result.success) {
                const newService = { ...data, id: result.data.id, rate: parseFloat(data.rate), status: "Active" };
                setServices([...services, newService]);
            } else {
                toast.error(result.error || "Failed to create service");
            }
        }

        setIsModalOpen(false);
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-8">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Services</h1>
                    <p className="text-text-muted mt-2">Manage service offerings and standard rates.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-64">
                        <Input
                            placeholder="Search services..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            startIcon={<Search size={18} className="text-text-muted" />}
                        />
                    </div>
                    <Button onClick={handleCreate} className="flex items-center gap-2 rounded-full px-6" disabled={isPending}>
                        <Plus size={16} /> New Service
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Images Processed (This Year)</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Star size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {yearlyImageCount.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-medium text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">Annual Volume</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Images Processed (Last Month)</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <Wrench size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {lastMonthImageCount.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-medium text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">Past Month Volume</span>
                    </div>
                </Card>

                <Card className="h-full hover:shadow-md transition-shadow p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Images Processed (Month)</h3>
                        <div className="w-6 h-6 rounded-full border border-border-subtle flex items-center justify-center text-text-muted">
                            <TrendingUp size={12} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-text-main mb-1">
                            {monthlyImageCount.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-medium text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">Current Month Volume</span>
                    </div>
                </Card>
            </div>

            {/* Filters Toolbar */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-4 bg-bg-surface border border-border-subtle rounded-lg">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-text-muted">
                        <Filter size={16} />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <select
                        className="bg-bg-app border border-border-subtle rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary text-text-main w-48"
                        value={filterCustomer}
                        onChange={(e) => setFilterCustomer(e.target.value)}
                    >
                        <option value="All">All Customers</option>

                        {sortCustomers(customers).map(c => (
                            <option key={c.id} value={c.id}>{c.id}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-text-muted font-medium whitespace-nowrap">
                    Showing {filteredServices.length} services
                </div>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-black/5">
                <ServiceTable
                    services={filteredServices}
                    customers={customers}
                    settings={settings}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onEdit={handleEdit}
                    onDelete={(id) => {
                        const service = services.find(s => s.id === id);
                        if (service) handleDelete(service);
                    }}
                />
            </Card>

            {isModalOpen && (
                <ServiceForm
                    service={editingService}
                    customers={customers}
                    settings={settings}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemName={serviceToDelete?.name || "Service"}
            />
        </div>
    );
}
