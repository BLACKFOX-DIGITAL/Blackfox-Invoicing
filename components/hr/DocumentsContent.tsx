"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import DocumentModal from "@/components/hr/DocumentModal";
import { Plus, Loader2, FileText, Trash2, ExternalLink } from "lucide-react";
import { getHRDocuments, createHRDocument, deleteHRDocument, getEmployees, HRDocumentWithEmployee } from "@/app/actions/hr";
import { useToast } from "@/components/ui/ToastProvider";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRole } from "@/lib/roleContext";

export default function DocumentsContent() {
    const [documents, setDocuments] = useState<HRDocumentWithEmployee[]>([]);
    const [employees, setEmployees] = useState<{ id: string, firstName: string, lastName: string }[]>([]);
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
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [docsRes, empsRes] = await Promise.all([
            getHRDocuments(),
            isManager ? getEmployees() : Promise.resolve({ success: true, data: [] })
        ]);

        if (docsRes.success && docsRes.data) {
            setDocuments(docsRes.data as any);
        } else {
            toast.error("Failed to load documents");
        }

        if (empsRes.success && empsRes.data) {
            setEmployees(empsRes.data as any);
        }

        setLoading(false);
    };

    const handleDelete = async (id: number, title: string) => {
        if (!confirm(`Are you sure you want to delete ${title}? This action cannot be undone.`)) return;

        const result = await deleteHRDocument(id);
        if (result.success) {
            fetchData();
            toast.success("Document deleted");
        } else {
            toast.error(result.error || "Failed to delete document");
        }
    };

    const handleCreateDocument = async (data: any) => {
        setIsSubmitting(true);
        const result = await createHRDocument(data);

        if (result.success) {
            setIsModalOpen(false);
            fetchData();
            toast.success("Document added successfully");
        } else {
            toast.error(result.error || "Failed to add document");
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

    const sortedDocs = [...documents].sort((a, b) => {
        let valA: any = a[sortField as keyof HRDocumentWithEmployee];
        let valB: any = b[sortField as keyof HRDocumentWithEmployee];

        if (sortField === "employeeName") {
            valA = `${a.employee.firstName} ${a.employee.lastName}`.toLowerCase();
            valB = `${b.employee.firstName} ${b.employee.lastName}`.toLowerCase();
        } else if (sortField === "createdAt") {
            valA = new Date(valA || 0).getTime();
            valB = new Date(valB || 0).getTime();
        } else if (typeof valA === "string") {
            valA = valA.toLowerCase();
            valB = (valB as string)?.toLowerCase() || "";
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const getTypeVariant = (type: string) => {
        switch (type) {
            case "Contract": return "primary";
            case "Policy": return "success";
            case "Request Form": return "warning";
            default: return "neutral";
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10 mt-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Forms & Documents</h1>
                    <p className="text-text-muted text-sm mt-1">Repository for contracts, policies, and employee forms</p>
                </div>
                {isManager && (
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} /> Add Document
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden bg-card border-border shadow-sm">
                {loading && documents.length === 0 ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : documents.length === 0 ? (
                    <div className="p-16 text-center text-text-muted">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-text-main">No documents found.</p>
                        {isManager && <p className="text-sm mt-1">Click "Add Document" to upload a new file.</p>}
                    </div>
                ) : (
                    <Table
                        headers={[
                            <SortableHeader label="Document Title" sortKey="title" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            isManager ? <SortableHeader label="Employee Name" sortKey="employeeName" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} /> : null,
                            <SortableHeader label="Type" sortKey="type" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <SortableHeader label="Date Added" sortKey="createdAt" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} />,
                            <div className="text-right">Link</div>,
                            isManager ? <div className="text-right">Actions</div> : null
                        ].filter(Boolean)}
                        data={sortedDocs}
                        renderRow={(doc: HRDocumentWithEmployee) => (
                            <tr key={doc.id} className="border-b border-border hover:bg-background/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-text-main text-sm">{doc.title}</div>
                                </td>
                                {isManager && (
                                    <td className="px-6 py-4 text-sm text-text-muted">
                                        {doc.employee.firstName} {doc.employee.lastName}
                                    </td>
                                )}
                                <td className="px-6 py-4">
                                    <Badge variant={getTypeVariant(doc.type) as any}>{doc.type}</Badge>
                                </td>
                                <td className="px-6 py-4 text-sm text-text-muted">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                                        title="View Document"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </td>
                                {isManager && (
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded-md transition-colors"
                                            onClick={() => handleDelete(doc.id, doc.title)}
                                            title="Delete Document"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        )}
                    />
                )}
            </Card>

            {isModalOpen && (
                <DocumentModal
                    employees={employees}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleCreateDocument}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}
