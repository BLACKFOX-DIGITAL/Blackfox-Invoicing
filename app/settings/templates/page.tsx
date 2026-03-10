"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { Plus, Edit2, Trash2, X, Save, Loader2, Info } from "lucide-react";
import { clsx } from "clsx";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from "@/app/actions/templates";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";
import { buildInvoiceEmailHtml } from "@/lib/emailUtils";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        subject: "",
        content: "",
        heading: "",
        footer: "",
    });

    const [settings, setSettings] = useState<any>(null);

    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getTemplates();
            if (result.success) {
                setTemplates(result.data);
            } else {
                setError(result.error);
            }

            const { getSettings } = await import("@/app/actions/settings");
            const settingsResult = await getSettings();
            if (settingsResult.success) {
                setSettings(settingsResult.data);
            }
        } catch (err) {
            setError("Unexpected error loading templates");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (template?: any) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                subject: template.subject,
                content: template.content,
                heading: template.heading || "",
                footer: template.footer || "",
            });
        } else {
            setEditingTemplate(null);
            setFormData({ name: "", subject: "", content: "", heading: "", footer: "" });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.subject || !formData.content) {
            toast.error("Please fill in all fields");
            return;
        }

        setSaving(true);
        let result;
        if (editingTemplate) {
            result = await updateTemplate(editingTemplate.id, {
                subject: formData.subject,
                content: formData.content,
                heading: formData.heading,
                footer: formData.footer
            });
        } else {
            result = await createTemplate({
                name: formData.name,
                subject: formData.subject,
                content: formData.content,
                heading: formData.heading,
                footer: formData.footer
            });
        }
        setSaving(false);

        if (result.success) {
            toast.success("Template saved successfully");
            setIsModalOpen(false);
            fetchData();
        } else {
            toast.error("Failed to save template: " + result.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this template?")) {
            const result = await deleteTemplate(id);
            if (result.success) {
                toast.success("Template deleted");
                fetchData();
            } else {
                toast.error("Failed to delete: " + result.error);
            }
        }
    };

    const insertVariable = (variable: string) => {
        setFormData(prev => ({ ...prev, content: prev.content + ` ${variable}` }));
    };

    const generatePreview = (text: string) => {
        if (!text) return "";
        return text
            .replace(/{client_name}/g, "Concern")
            .replace(/{customerName}/g, "Concern")
            .replace(/{id}/g, "INV-2026001")
            .replace(/{amount}/g, "$1,250.00")
            .replace(/{paid_amount}/g, "$1,250.00")
            .replace(/{remaining_balance}/g, "$0.00")
            .replace(/{company}/g, settings?.companyName || "Your Company")
            .replace(/{due_date}/g, "March 15, 2026")
            .replace(/\n/g, "<br />");
    };

    const generatePreviewHtml = (text: string, footerHtml: string) => {
        const messageHtml = generatePreview(text);
        if (!messageHtml) return "";

        const isStatement = formData.name.toLowerCase().includes("statement");
        const isReceipt = formData.name.toLowerCase().includes("receipt");
        const isOverdue = formData.name.toLowerCase().includes("overdue");

        return buildInvoiceEmailHtml({
            companyName: settings?.companyName || "Your Company",
            logoUrl: settings?.logoUrl || "",
            invoiceId: "INV-2026001",
            amount: "$1,250.00",
            dueDate: "March 15, 2026",
            messageHtml: messageHtml,
            type: isReceipt ? 'receipt' : (isStatement ? 'statement' : (isOverdue ? 'overdue' : 'invoice')),
            invoiceLink: "#",
            websiteUrl: settings?.website || "",
            headingHtml: generatePreview(formData.heading),
            footerHtml: generatePreview(footerHtml)
        });
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-text-muted"><Loader2 className="animate-spin mr-2" /> Loading templates...</div>;
    }

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-text-main">Email Templates</h1>
                <Button onClick={() => openModal()} className="flex items-center gap-2">
                    <Plus size={16} /> New Template
                </Button>
            </div>

            <Card>
                {error && (
                    <div className="p-4 mb-4 bg-status-error/10 text-status-error rounded-md flex items-center gap-2">
                        <Info size={16} />
                        {error}
                    </div>
                )}
                <Table
                    headers={["Template Name", "Subject Pattern", "Last Updated", "Actions"]}
                    data={templates}
                    renderRow={(row, i) => (
                        <tr key={i} className="hover:bg-bg-app/50 transition-colors border-b border-border-subtle last:border-0">
                            <td className="px-6 py-4 font-medium text-text-main">{row.name}</td>
                            <td className="px-6 py-4 text-text-muted text-sm truncate max-w-xs">{row.subject}</td>
                            <td className="px-6 py-4 text-text-muted text-sm">{formatDate(row.updatedAt)}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openModal(row)}
                                        className="p-1.5 hover:bg-bg-surface rounded-md text-text-muted hover:text-primary transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    {!row.isDefault && (
                                        <button
                                            onClick={() => handleDelete(row.id)}
                                            className="p-1.5 hover:bg-bg-surface rounded-md text-text-muted hover:text-status-error transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                />
            </Card>

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-app rounded-lg shadow-xl w-full max-w-5xl border border-border-subtle flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-border-subtle">
                            <h2 className="text-xl font-bold text-text-main">
                                {editingTemplate ? "Edit Template" : "New Template"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-0 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
                            {/* Editor Column */}
                            <div className="p-6 flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1">Template Name</label>
                                    <input
                                        className="w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Late Payment Warning"
                                        disabled={!!editingTemplate?.isDefault}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1">Subject Line</label>
                                    <input
                                        className="w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        placeholder="Invoice #{invoiceNumber}..."
                                        disabled={saving}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1">Top Heading</label>
                                    <input
                                        className="w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary"
                                        value={formData.heading}
                                        onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                                        placeholder="Invoice for <strong>{amount}</strong>..."
                                        disabled={saving}
                                    />
                                </div>
                                <div className="flex-1 flex flex-col min-h-[150px]">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-text-main">Email Body</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["{client_name}", "{id}", "{amount}", "{company}", "{due_date}", "{paid_amount}", "{remaining_balance}"].map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => {
                                                        const el = document.getElementById("email-body-input") as HTMLTextAreaElement;
                                                        if (el) {
                                                            const start = el.selectionStart;
                                                            const end = el.selectionEnd;
                                                            const text = formData.content;
                                                            const before = text.substring(0, start);
                                                            const after = text.substring(end, text.length);
                                                            setFormData({ ...formData, content: (before + v + after) });
                                                        } else {
                                                            setFormData(p => ({ ...p, content: p.content + ` ${v}` }));
                                                        }
                                                    }}
                                                    className="text-[10px] bg-bg-surface border border-border-subtle px-1.5 py-0.5 rounded hover:border-primary text-text-muted hover:text-primary transition-colors font-mono"
                                                    type="button"
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        id="email-body-input"
                                        className="w-full h-[150px] bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm resize-none"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Hi {client_name}..."
                                        disabled={saving}
                                    />
                                </div>

                                <div className="flex flex-col h-[120px]">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-text-main">Custom Footer <span className="text-text-muted font-normal text-xs">(Optional)</span></label>
                                    </div>
                                    <textarea
                                        className="w-full flex-1 bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm resize-none"
                                        value={formData.footer}
                                        onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                                        placeholder="Bank details, Remittance info..."
                                        disabled={saving}
                                    />
                                </div>
                                <div className="text-xs text-text-muted flex items-start gap-1">
                                    <Info size={14} className="mt-0.5 flex-none" />
                                    <span>Variables are replaced dynamically. Click a variable to insert into the Body. Use the live preview on the right.</span>
                                </div>
                            </div>

                            {/* Preview Column */}
                            <div className="p-6 bg-bg-surface/50 flex flex-col h-full overflow-hidden">
                                <h3 className="block text-sm font-bold text-text-main mb-4 uppercase tracking-wider">Live Preview</h3>
                                <div className="bg-bg-card border border-border-subtle rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
                                    <div className="bg-bg-app border-b border-border-subtle px-6 py-4">
                                        <div className="text-xs text-text-muted mb-2 flex items-center gap-3">
                                            <span className="font-bold w-14 text-right uppercase tracking-tighter opacity-70">To:</span>
                                            <span className="text-text-main font-medium">client@example.com</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="text-xs text-text-muted font-bold w-14 text-right uppercase tracking-tighter opacity-70 mt-1">Subject:</span>
                                            <span className="text-sm font-bold text-text-main flex-1">{generatePreview(formData.subject) || <span className="italic text-text-muted font-normal">No subject...</span>}</span>
                                        </div>
                                    </div>
                                    <div className="p-0 flex-1 overflow-y-auto w-full text-sm text-text-main leading-relaxed relative border-t border-border-subtle" >
                                        {formData.content ? (
                                            <iframe
                                                className="w-full h-full border-none"
                                                srcDoc={generatePreviewHtml(formData.content, formData.footer)}
                                                sandbox="allow-same-origin"
                                            />
                                        ) : (
                                            <div className="p-5 italic text-text-muted opacity-50">No content...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border-subtle flex justify-end gap-3 bg-bg-surface">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
                            <Button onClick={handleSave} className="flex items-center gap-2" disabled={saving}>
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {saving ? "Saving..." : "Save Template"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
