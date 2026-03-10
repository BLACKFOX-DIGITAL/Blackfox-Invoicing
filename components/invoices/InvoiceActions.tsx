"use client";

import { useForm, useWatch } from "react-hook-form";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { X, Mail, CreditCard, AlertCircle } from "lucide-react";
import { formatDateLong, formatCurrency, getCurrencySymbol } from "@/lib/format";
import { buildInvoiceEmailHtml } from "@/lib/emailUtils";

interface Invoice {
    id: string;
    amount?: string | number;
    total?: string | number;
    balanceDue?: number;
    customerId?: string;
    dueDate?: string | Date;
}

interface Contact {
    name: string;
    email: string;
    role?: string;
    sendInvoices?: boolean;
}

interface SendModalProps {
    invoice: Invoice;
    customer?: any;
    settings?: any;
    onClose: () => void;
    onSend: (data: any) => void;
}

interface PayModalProps {
    invoice: Invoice;
    customer?: any;
    settings?: any;
    onClose: () => void;
    onPay: (data: any) => void;
}

const overlayClass = "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm";
const modalClass = "bg-bg-card rounded-2xl shadow-xl w-full border border-border-subtle animate-in fade-in zoom-in-95 duration-200";
const headerClass = "flex justify-between items-center p-4 border-b border-border-subtle";
const titleClass = "text-lg font-bold text-text-main";
const formClass = "p-4 flex flex-col gap-4";
const groupClass = "flex flex-col gap-1.5";
const labelClass = "text-sm font-medium text-text-muted";
const inputClass = "bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary";
const checkboxClass = "w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary bg-bg-surface";

export function SendInvoiceModal({ invoice, customer, settings, onClose, onSend }: SendModalProps) {
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [manualEmail, setManualEmail] = useState("");
    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    const primaryEmail = customer?.email || ""; // Company Email
    const contactEmail = customer?.contactEmail || ""; // Primary Contact Email
    const additionalContacts: Contact[] = customer?.additionalContacts || [];

    useEffect(() => {
        const initialEmails: string[] = [];

        // 1. Company Email (if flagged or default)
        const sendCompany = customer?.companySendInvoices !== false;
        if (primaryEmail && sendCompany) {
            initialEmails.push(primaryEmail);
        }

        // 2. Primary Contact Email (if flagged)
        const sendContact = customer?.contactSendInvoices !== false;
        if (contactEmail && sendContact) {
            initialEmails.push(contactEmail);
        }

        // 3. Additional Contacts (if flagged)
        additionalContacts.forEach(contact => {
            if (contact.sendInvoices && contact.email) {
                initialEmails.push(contact.email);
            }
        });
        setSelectedEmails(initialEmails);
    }, [primaryEmail, contactEmail, additionalContacts]);

    const { register, handleSubmit, setValue, watch } = useForm({
        defaultValues: {
            to: primaryEmail, // Default TO address can be company email
            subject: "",
            heading: "",
            message: "",
            footer: "",
            attachPdf: false
        }
    });

    const watchedSubject = watch("subject");
    const watchedHeading = watch("heading");
    const watchedMessage = watch("message");
    const watchedFooter = watch("footer");

    const balanceDueFormatted = invoice.balanceDue !== undefined ? formatCurrency(invoice.balanceDue, customer?.currency || settings?.currency) : "$0.00";
    const totalPaidFormatted = (invoice as any).totalPaid !== undefined ? formatCurrency((invoice as any).totalPaid, customer?.currency || settings?.currency) : "$0.00";
    const totalAmountFormatted = invoice.total !== undefined ? formatCurrency(invoice.total, customer?.currency || settings?.currency) : "$0.00";

    // Helper to apply template content to form
    const applyTemplate = (template: any) => {
        if (!template) return;

        const replacements: Record<string, string> = {
            "{id}": invoice.id,
            "{company}": settings?.companyName || "Your Company",
            "{client_name}": customer?.contactFirstName || "Concern",
            "{amount}": balanceDueFormatted,
            "{invoiceNumber}": invoice.id,
            "{customerName}": customer?.contactFirstName || "Concern",
            "{total}": totalAmountFormatted,
            "{paid_amount}": totalPaidFormatted,
            "{remaining_balance}": balanceDueFormatted,
            "{companyName}": settings?.companyName || "Your Company",
            "{due_date}": invoice.dueDate ? formatDateLong(invoice.dueDate) : "Due on receipt",
            "{total_due}": balanceDueFormatted,
            "{statement_date}": formatDateLong(new Date()),
            "{customer_name}": customer?.contactFirstName || "Concern",
            "{customer_company}": customer?.name || "Concern",
            "{customer_email}": customer?.email || "",
            "{customer_phone}": customer?.phone || "",
            "{customer_address}": customer?.billingAddress?.line1 || "",
            "{customer_city}": customer?.billingAddress?.city || "",
            "{customer_state}": customer?.billingAddress?.state || "",
            "{customer_zip}": customer?.billingAddress?.postal_code || "",
            "{customer_country}": customer?.billingAddress?.country || "",
            "{company_name}": settings?.companyName || "Your Company",
            "{company_email}": settings?.companyEmail || "",
            "{company_phone}": settings?.companyPhone || "",
            "{company_address}": settings?.companyAddress?.line1 || "",
            "{company_city}": settings?.companyAddress?.city || "",
            "{company_state}": settings?.companyAddress?.state || "",
            "{company_zip}": settings?.companyAddress?.postal_code || "",
            "{company_country}": settings?.companyAddress?.country || "",
            "{currency_symbol}": getCurrencySymbol(customer?.currency || settings?.currency),
            "{invoice_link}": "#", // Placeholder, will be replaced by actual link
            "{payment_link}": "#", // Placeholder, will be replaced by actual link
            "{website_url}": settings?.website || ""
        };

        let subject = template.subject;
        let headingText = template.heading || `Invoice for <strong>{amount}</strong> due by <strong>{due_date}</strong>`;
        let content = template.content;
        let footerText = template.footer || "";

        Object.entries(replacements).forEach(([key, val]) => {
            subject = subject.replace(new RegExp(key, "g"), val);
            headingText = headingText.replace(new RegExp(key, "g"), val);
            content = content.replace(new RegExp(key, "g"), val);
            footerText = footerText.replace(new RegExp(key, "g"), val);
        });

        setValue("subject", subject);
        setValue("heading", headingText);
        setValue("message", content);
        setValue("footer", footerText);
    };

    useEffect(() => {
        async function loadTemplates() {
            setLoadingTemplate(true);
            try {
                const { getTemplates } = await import("@/app/actions/templates");
                const result = await getTemplates();
                if (result.success && result.data.length > 0) {
                    setTemplates(result.data);

                    // Default to "Invoice Email" or first available
                    const defaultTemplate = result.data.find((t: any) => t.name === "Invoice Email") || result.data[0];
                    setSelectedTemplateId(defaultTemplate.id);
                    applyTemplate(defaultTemplate);
                } else {
                    // Fallback if no templates found
                    setValue("subject", `Invoice #${invoice.id} from ${settings?.companyName || "Us"}`);
                    setValue("heading", `Invoice for <strong>${invoice.balanceDue !== undefined ? formatCurrency(invoice.balanceDue, customer?.currency || settings?.currency) : (invoice.total !== undefined ? formatCurrency(invoice.total, customer?.currency || settings?.currency) : "$0.00")}</strong> due by <strong>${invoice.dueDate ? formatDateLong(invoice.dueDate) : "Due on receipt"}</strong>`);
                    setValue("message", `Dear Client,\n\nPlease find attached invoice #${invoice.id} for ${invoice.balanceDue !== undefined ? formatCurrency(invoice.balanceDue, customer?.currency || settings?.currency) : (invoice.total !== undefined ? formatCurrency(invoice.total, customer?.currency || settings?.currency) : "$0.00")}.\n\nThank you,\n${settings?.companyName || ""} Team`);
                    setValue("footer", "");
                }
            } catch (e) {
                console.error("Failed to load templates", e);
                // Fallback on error
                setValue("subject", `Invoice #${invoice.id} from ${settings?.companyName || "Us"}`);
                setValue("heading", `Invoice for <strong>${invoice.balanceDue !== undefined ? formatCurrency(invoice.balanceDue, customer?.currency || settings?.currency) : (invoice.total !== undefined ? formatCurrency(invoice.total, customer?.currency || settings?.currency) : "$0.00")}</strong> due by <strong>${invoice.dueDate ? formatDateLong(invoice.dueDate) : "Due on receipt"}</strong>`);
                setValue("message", `Dear Client,\n\nPlease find attached invoice #${invoice.id} for ${invoice.balanceDue !== undefined ? formatCurrency(invoice.balanceDue, customer?.currency || settings?.currency) : (invoice.total !== undefined ? formatCurrency(invoice.total, customer?.currency || settings?.currency) : "$0.00")}.\n\nThank you,\n${settings?.companyName || ""} Team`);
                setValue("footer", "");
            }
            setLoadingTemplate(false);
        }
        loadTemplates();
    }, [invoice.id, invoice.total, invoice.amount, customer?.name, setValue]);

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = e.target.value;
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
            applyTemplate(template);
        }
    };

    const toggleEmail = (email: string) => {
        if (selectedEmails.includes(email)) {
            setSelectedEmails(selectedEmails.filter(e => e !== email));
        } else {
            setSelectedEmails([...selectedEmails, email]);
        }
    };

    const handleFormSubmit = (data: any) => {
        const finalRecipients = [...selectedEmails];
        if (manualEmail) {
            const extraEmails = manualEmail.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes("@"));
            finalRecipients.push(...extraEmails);
        }
        const currentTemplate = templates.find(t => t.id === selectedTemplateId);
        onSend({ ...data, to: finalRecipients.join(", "), templateName: currentTemplate?.name });
    };

    const amountFormattedPreview = invoice.balanceDue !== undefined ? formatCurrency(invoice.balanceDue, customer?.currency || settings?.currency) : (invoice.total !== undefined ? formatCurrency(invoice.total, customer?.currency || settings?.currency) : (invoice.amount !== undefined ? formatCurrency(invoice.amount, customer?.currency || settings?.currency) : "$0.00"));

    const currentPreviewTemplate = templates.find(t => t.id === selectedTemplateId);
    const previewType = currentPreviewTemplate?.name.toLowerCase().includes("overdue")
        ? "overdue"
        : currentPreviewTemplate?.name.toLowerCase().includes("receipt")
            ? "receipt"
            : currentPreviewTemplate?.name.toLowerCase().includes("statement")
                ? "statement"
                : "invoice";

    const frameDocPreview = buildInvoiceEmailHtml({
        companyName: settings?.companyName || "Your Company",
        logoUrl: settings?.logoUrl || "",
        invoiceId: String(invoice.id),
        amount: previewType === "receipt" ? totalPaidFormatted : amountFormattedPreview,
        dueDate: invoice.dueDate ? formatDateLong(invoice.dueDate) : "Due on receipt",
        messageHtml: watchedMessage?.replace(/\n/g, "<br/>") || "",
        invoiceLink: "#",
        websiteUrl: settings?.website || "",
        headingHtml: watchedHeading || "",
        footerHtml: watchedFooter?.replace(/\n/g, "<br/>") || "",
        type: previewType
    });

    return (
        <div className={overlayClass}>
            <div className={modalClass + " max-w-6xl w-[95vw]"}>
                <div className={headerClass}>
                    <h2 className={titleClass}>Send Invoice {invoice.id}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="p-0 flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] flex-1">

                        {/* Left Column: Controls */}
                        <div className="p-6 border-r border-border-subtle flex flex-col gap-6 bg-bg-card">
                            <div className={groupClass}>
                                <label className={labelClass}>Recipients</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-bg-surface rounded-md border border-border-subtle">
                                    {/* Company Email */}
                                    {primaryEmail && (
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="company-email"
                                                checked={selectedEmails.includes(primaryEmail)}
                                                onChange={() => toggleEmail(primaryEmail)}
                                                className={checkboxClass}
                                            />
                                            <label htmlFor="company-email" className="text-sm text-text-main cursor-pointer flex justify-between flex-1">
                                                <span>Company ({primaryEmail})</span>
                                                <span className="text-[10px] text-text-muted bg-bg-app px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Main</span>
                                            </label>
                                        </div>
                                    )}

                                    {/* Primary Contact Email */}
                                    {contactEmail && (
                                        <div className="flex items-center gap-3 border-t border-border-subtle/30 pt-2">
                                            <input
                                                type="checkbox"
                                                id="primary-contact-email"
                                                checked={selectedEmails.includes(contactEmail)}
                                                onChange={() => toggleEmail(contactEmail)}
                                                className={checkboxClass}
                                            />
                                            <label htmlFor="primary-contact-email" className="text-sm text-text-main cursor-pointer flex justify-between flex-1">
                                                <span>{customer?.contactFirstName || "Primary Contact"} ({contactEmail})</span>
                                                <span className="text-[10px] text-text-muted bg-bg-app px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Primary</span>
                                            </label>
                                        </div>
                                    )}

                                    {/* Additional Contacts */}
                                    {additionalContacts.map((contact, idx) => (
                                        <div key={idx} className="flex items-center gap-3 border-t border-border-subtle/30 pt-2">
                                            <input
                                                type="checkbox"
                                                id={`contact-${idx}`}
                                                checked={selectedEmails.includes(contact.email)}
                                                onChange={() => toggleEmail(contact.email)}
                                                className={checkboxClass}
                                            />
                                            <label htmlFor={`contact-${idx}`} className="text-sm text-text-main cursor-pointer flex justify-between flex-1">
                                                <span>{contact.name || "Contact"} ({contact.email})</span>
                                                {contact.role && (
                                                    <span className="text-[10px] text-text-muted bg-bg-app px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">{contact.role}</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-2">
                                    <input
                                        className={inputClass + " w-full"}
                                        placeholder="Add multiple emails separated by commas..."
                                        value={manualEmail}
                                        onChange={(e) => setManualEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={groupClass}>
                                <div className="flex justify-between items-center mb-1">
                                    <label className={labelClass}>Email Template</label>
                                    {loadingTemplate && <span className="text-xs text-text-muted animate-pulse">Loading...</span>}
                                </div>
                                <select
                                    className={inputClass + " w-full"}
                                    value={selectedTemplateId}
                                    onChange={handleTemplateChange}
                                    disabled={loadingTemplate}
                                >
                                    <option value="" disabled>Select a template...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="attach-pdf"
                                    className={checkboxClass}
                                    {...register("attachPdf")}
                                />
                                <label htmlFor="attach-pdf" className="text-sm text-text-main font-semibold cursor-pointer select-none">
                                    Attach Invoice PDF
                                </label>
                            </div>

                            <div className="flex-1 flex flex-col min-h-[150px]">
                                <label className="block text-sm font-medium text-text-main mb-1">Top Heading</label>
                                <input
                                    className="w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm mb-4"
                                    {...register("heading")}
                                    placeholder="Invoice for <strong>{amount}</strong>..."
                                />

                                <label className="block text-sm font-medium text-text-main mb-1">Email Body</label>
                                <textarea
                                    className="w-full h-[150px] bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm resize-none"
                                    {...register("message")}
                                    placeholder="Write your email body here..."
                                />
                            </div>

                            <div className="flex flex-col h-[80px]">
                                <label className="block text-sm font-medium text-text-main mb-1">Custom Footer <span className="text-text-muted font-normal text-xs">(Optional)</span></label>
                                <textarea
                                    className="w-full h-[80px] flex-1 bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm resize-none"
                                    {...register("footer")}
                                    placeholder="Bank details, Remittance info..."
                                />
                            </div>

                        </div>

                        {/* Right Column: Live Preview */}
                        <div className="bg-bg-app/50 p-6 flex flex-col gap-4 max-h-[700px] overflow-hidden">
                            <div className="flex justify-between items-center">
                                <label className={labelClass + " flex items-center gap-1.5"}>
                                    <div className="w-2 h-2 rounded-full bg-status-success" /> Live Email Preview
                                </label>
                            </div>

                            <div className="bg-white border border-border-subtle rounded-xl shadow-lg flex flex-col overflow-hidden h-full">
                                {/* Professional Preview Header */}
                                <div className="bg-bg-app/50 border-b border-border-subtle px-6 py-4">
                                    <div className="text-xs text-text-muted mb-2 flex items-center gap-3">
                                        <span className="font-bold w-14 text-right uppercase tracking-tighter opacity-70">To:</span>
                                        <span className="text-text-main font-medium">{selectedEmails.join(", ") || "No recipients selected"}</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-xs text-text-muted font-bold w-14 text-right uppercase tracking-tighter opacity-70 mt-1">Subject:</span>
                                        <input className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-text-main" {...register("subject")} />
                                    </div>
                                </div>

                                {/* Body Content Frame */}
                                <div className="p-0 flex flex-col items-center overflow-y-auto bg-white flex-1" style={{ minHeight: 0 }}>
                                    <iframe
                                        className="w-full h-full border-none"
                                        srcDoc={frameDocPreview}
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions: Aligned to Right */}
                    <div className="p-4 bg-bg-card border-t border-border-subtle flex justify-end gap-3 rounded-b-2xl">
                        <Button type="button" variant="ghost" className="px-6" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex items-center gap-2 px-10">
                            <Mail size={16} /> Send Email
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function RecordPaymentModal({ invoice, customer, settings, onClose, onPay }: PayModalProps) {
    // Standardize totalVal: handle both string (legacy) and number (new)
    const totalVal = typeof invoice.total === 'number'
        ? invoice.total
        : parseFloat(String(invoice.total || invoice.amount || "0").replace(/[^0-9.]/g, ''));

    const balanceDue = typeof invoice.balanceDue === 'number' ? invoice.balanceDue : null;
    const defaultAmount = balanceDue !== null ? balanceDue : totalVal;

    const { register, handleSubmit, setValue, watch } = useForm({
        defaultValues: {
            amount: defaultAmount.toFixed(2),
            fee: "",
            date: new Date().toISOString().split('T')[0],
            method: "",
            notes: "",
            sendReceipt: false
        }
    });

    const [paymentMethods, setPaymentMethods] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        async function fetchMethods() {
            const { getPaymentMethods } = await import("@/app/actions/settings");
            const result = await getPaymentMethods();
            if (result.success) {
                setPaymentMethods(result.data);
                if (result.data.length > 0) {
                    setValue("method", result.data[0].name);
                }
            }
        }
        fetchMethods();
    }, [setValue]);

    const setAmount = (val: number) => {
        setValue("amount", val.toFixed(2));
    };

    return (
        <div className={overlayClass}>
            <div className={modalClass + " max-w-md"}>
                <div className={headerClass}>
                    <h2 className={titleClass}>Record Payment for {invoice.id}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit(onPay)} className={formClass}>

                    <div className="bg-bg-surface rounded-md p-3 text-sm flex justify-between items-center border border-border-subtle">
                        <span className="text-text-muted">Balance Due:</span>
                        <span className="font-bold text-text-main">
                            {getCurrencySymbol(customer?.currency || settings?.currency || "USD")}{(balanceDue !== null ? balanceDue : totalVal).toFixed(2)}
                        </span>
                    </div>

                    <div className={groupClass}>
                        <label className={labelClass}>Payment Option</label>
                        <div className="flex gap-2 mb-1">
                            <button
                                type="button"
                                onClick={() => setAmount(balanceDue !== null ? balanceDue : totalVal)}
                                className="flex-1 text-xs py-1.5 px-2 bg-bg-app border border-border-subtle rounded hover:border-primary hover:text-primary transition-colors"
                            >
                                Full Balance
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmount((balanceDue !== null ? balanceDue : totalVal) * 0.5)}
                                className="flex-1 text-xs py-1.5 px-2 bg-bg-app border border-border-subtle rounded hover:border-primary hover:text-primary transition-colors"
                            >
                                50% Partial
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue("amount", "")}
                                className="flex-1 text-xs py-1.5 px-2 bg-bg-app border border-border-subtle rounded hover:border-primary hover:text-primary transition-colors"
                            >
                                Custom
                            </button>
                        </div>
                        <label className={labelClass}>Payment Amount ({getCurrencySymbol(customer?.currency || settings?.currency || "USD")})</label>
                        <input type="number" step="0.01" className={inputClass} {...register("amount")} />
                    </div>

                    <div className={groupClass}>
                        <label className={labelClass}>Transaction Fee ({getCurrencySymbol(customer?.currency || settings?.currency || "USD")}) <span className="text-text-muted font-normal">(Optional)</span></label>
                        <input type="number" step="0.01" placeholder="Auto-calculated if empty" className={inputClass} {...register("fee")} />
                    </div>

                    <div className={groupClass}>
                        <label className={labelClass}>Date</label>
                        <input type="date" className={inputClass} {...register("date")} />
                    </div>

                    <div className={groupClass}>
                        <label className={labelClass}>Method</label>
                        <select className={inputClass} {...register("method")}>
                            {paymentMethods.length > 0 ? (
                                paymentMethods.map((m) => (
                                    <option key={m.id} value={m.name}>{m.name}</option>
                                ))
                            ) : (
                                <option value="" disabled>No payment methods configured</option>
                            )}
                        </select>
                    </div>

                    <div className={groupClass}>
                        <label className={labelClass}>Notes</label>
                        <textarea className={inputClass} rows={2} {...register("notes")} placeholder="Optional notes..." />
                    </div>

                    <div className="flex justify-between items-center mt-4">
                        <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer" >
                            <input type="checkbox" className="rounded border-border-subtle bg-bg-surface text-primary w-4 h-4 cursor-pointer" {...register("sendReceipt")} />
                            Email payment receipt to client
                        </label>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" className="flex items-center gap-2">
                                <CreditCard size={16} /> Record Payment
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface SendStatementProps {
    customerName: string;
    totalAmount: string;
    customer?: any;
    onClose: () => void;
    onSend: (data: any) => void;
}

export function SendStatementModal({ customerName, totalAmount, customer, settings, onClose, onSend }: SendStatementProps & { settings?: any }) {
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [manualEmail, setManualEmail] = useState("");
    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    const primaryEmail = customer?.email || ""; // Company
    const contactEmail = customer?.contactEmail || ""; // Primary Contact
    const additionalContacts: Contact[] = customer?.additionalContacts || [];

    useEffect(() => {
        const initialEmails: string[] = [];
        const sendCompany = customer?.companySendInvoices !== false;
        if (primaryEmail && sendCompany) initialEmails.push(primaryEmail);
        const sendContact = customer?.contactSendInvoices !== false;
        if (contactEmail && sendContact) initialEmails.push(contactEmail);
        additionalContacts.forEach(contact => {
            if (contact.sendInvoices && contact.email) initialEmails.push(contact.email);
        });
        setSelectedEmails(initialEmails);
    }, [primaryEmail, contactEmail, additionalContacts]);

    const { register, handleSubmit, setValue, watch } = useForm({
        defaultValues: {
            to: primaryEmail,
            subject: "",
            heading: "",
            message: "",
            footer: ""
        }
    });

    const watchedSubject = watch("subject");
    const watchedHeading = watch("heading");
    const watchedMessage = watch("message");
    const watchedFooter = watch("footer");

    const applyTemplate = (template: any) => {
        if (!template) return;
        const replacements: Record<string, string> = {
            "{company}": settings?.companyName || "Your Company",
            "{customerName}": customer?.contactFirstName || "Concern",
            "{total}": totalAmount || "$0.00",
            "{amount}": totalAmount || "$0.00",
            "{remaining_balance}": totalAmount || "$0.00",
            "{total_due}": totalAmount || "$0.00",
            "{due_date}": formatDateLong(new Date()),
            "{statement_date}": formatDateLong(new Date()),
            "{companyName}": settings?.companyName || "Your Company",
            "{client_name}": customer?.contactFirstName || "Concern"
        };
        let subject = template.subject;
        let headingText = template.heading || `Account Statement for <strong>{companyName}</strong>`;
        let content = template.content;
        let footerText = template.footer || "";
        Object.entries(replacements).forEach(([key, val]) => {
            subject = subject.replace(new RegExp(key, "g"), val);
            headingText = headingText.replace(new RegExp(key, "g"), val);
            content = content.replace(new RegExp(key, "g"), val);
            footerText = footerText.replace(new RegExp(key, "g"), val);
        });
        setValue("subject", subject);
        setValue("heading", headingText);
        setValue("message", content);
        setValue("footer", footerText);
    };

    useEffect(() => {
        async function loadTemplates() {
            setLoadingTemplate(true);
            try {
                const { getTemplates } = await import("@/app/actions/templates");
                const result = await getTemplates();
                if (result.success && result.data.length > 0) {
                    setTemplates(result.data);
                    const defaultTemplate = result.data.find((t: any) => t.name === "Account Statement") || result.data[0];
                    setSelectedTemplateId(defaultTemplate.id);
                    applyTemplate(defaultTemplate);
                } else {
                    setValue("subject", `Statement for ${customerName} from ${settings?.companyName || "Us"}`);
                    setValue("heading", `Account Statement for <strong>${customerName}</strong>`);
                    setValue("message", `Dear ${customer?.contactFirstName || "Concern"},\n\nPlease find attached your account statement. Total outstanding: ${totalAmount}.\n\nThank you,\n${settings?.companyName || ""} Team`);
                }
            } catch (e) {
                console.error("Failed to load templates", e);
            }
            setLoadingTemplate(false);
        }
        loadTemplates();
    }, [customerName, totalAmount, settings?.companyName, setValue]);

    const handleFormSubmit = (data: any) => {
        const finalRecipients = [...selectedEmails];
        if (manualEmail) {
            const extraEmails = manualEmail.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes("@"));
            finalRecipients.push(...extraEmails);
        }
        onSend({ ...data, to: finalRecipients.join(", ") });
    };

    const toggleEmail = (email: string) => {
        if (selectedEmails.includes(email)) {
            setSelectedEmails(selectedEmails.filter(e => e !== email));
        } else {
            setSelectedEmails([...selectedEmails, email]);
        }
    };

    return (
        <div className={overlayClass}>
            <div className={modalClass + " max-w-6xl w-[95vw]"}>
                <div className={headerClass}>
                    <h2 className={titleClass}>Email Statement</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="p-0 flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] flex-1">

                        {/* Left Column: Controls */}
                        <div className="p-6 border-r border-border-subtle flex flex-col gap-6 bg-bg-card">
                            <div className={groupClass}>
                                <label className={labelClass}>Recipients</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-bg-surface rounded-md border border-border-subtle">
                                    {primaryEmail && (
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" id="stmt-company" checked={selectedEmails.includes(primaryEmail)} onChange={() => toggleEmail(primaryEmail)} className={checkboxClass} />
                                            <label htmlFor="stmt-company" className="text-sm text-text-main cursor-pointer flex justify-between flex-1">
                                                <span>Company ({primaryEmail})</span>
                                                <span className="text-[10px] text-text-muted bg-bg-app px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Main</span>
                                            </label>
                                        </div>
                                    )}
                                    {contactEmail && (
                                        <div className="flex items-center gap-3 border-t border-border-subtle/30 pt-2">
                                            <input type="checkbox" id="stmt-contact" checked={selectedEmails.includes(contactEmail)} onChange={() => toggleEmail(contactEmail)} className={checkboxClass} />
                                            <label htmlFor="stmt-contact" className="text-sm text-text-main cursor-pointer flex justify-between flex-1">
                                                <span>{customer?.contactFirstName || "Primary Contact"} ({contactEmail})</span>
                                                <span className="text-[10px] text-text-muted bg-bg-app px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Primary</span>
                                            </label>
                                        </div>
                                    )}
                                    {additionalContacts.map((contact, idx) => (
                                        <div key={idx} className="flex items-center gap-3 border-t border-border-subtle/30 pt-2">
                                            <input type="checkbox" id={`stmt-c-${idx}`} checked={selectedEmails.includes(contact.email)} onChange={() => toggleEmail(contact.email)} className={checkboxClass} />
                                            <label htmlFor={`stmt-c-${idx}`} className="text-sm text-text-main cursor-pointer flex justify-between flex-1">
                                                <span>{contact.name || "Contact"} ({contact.email})</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <input className={inputClass + " w-full"} placeholder="Add multiple emails separated by commas..." value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
                                </div>
                            </div>

                            <div className={groupClass}>
                                <label className={labelClass}>Email Template</label>
                                <select className={inputClass + " w-full"} value={selectedTemplateId} onChange={(e) => {
                                    const t = templates.find(temp => temp.id === e.target.value);
                                    setSelectedTemplateId(e.target.value);
                                    applyTemplate(t);
                                }}>
                                    <option value="" disabled>Select a template...</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="flex-1 flex flex-col min-h-[150px]">
                                <label className="block text-sm font-medium text-text-main mb-1">Top Heading</label>
                                <input
                                    className="w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm mb-4"
                                    {...register("heading")}
                                    placeholder="Account Statement for <strong>{customerName}</strong>..."
                                />

                                <label className="block text-sm font-medium text-text-main mb-1">Email Body</label>
                                <textarea
                                    className="w-full h-[150px] bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm resize-none"
                                    {...register("message")}
                                    placeholder="Write your email body here..."
                                />
                            </div>

                            <div className="flex flex-col h-[80px]">
                                <label className="block text-sm font-medium text-text-main mb-1">Custom Footer <span className="text-text-muted font-normal text-xs">(Optional)</span></label>
                                <textarea
                                    className="w-full h-[80px] flex-1 bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-primary font-mono text-sm resize-none"
                                    {...register("footer")}
                                    placeholder="Bank details, Remittance info..."
                                />
                            </div>
                        </div>

                        {/* Right Column: Live Preview */}
                        <div className="bg-bg-app/50 p-6 flex flex-col gap-4 max-h-[700px] overflow-hidden">
                            <div className="flex justify-between items-center">
                                <label className={labelClass + " flex items-center gap-1.5"}>
                                    <div className="w-2 h-2 rounded-full bg-status-success" /> Live Email Preview
                                </label>
                            </div>

                            <div className="bg-white border border-border-subtle rounded-xl shadow-lg flex flex-col overflow-hidden h-full">
                                {/* Professional Preview Header */}
                                <div className="bg-bg-app/50 border-b border-border-subtle px-6 py-4">
                                    <div className="text-xs text-text-muted mb-2 flex items-center gap-3">
                                        <span className="font-bold w-14 text-right uppercase tracking-tighter opacity-70">To:</span>
                                        <span className="text-text-main font-medium">{selectedEmails.join(", ") || "No recipients selected"}</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-xs text-text-muted font-bold w-14 text-right uppercase tracking-tighter opacity-70 mt-1">Subject:</span>
                                        <input className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-text-main" {...register("subject")} />
                                    </div>
                                </div>

                                {/* Body Content */}
                                <div className="p-0 flex flex-col items-center overflow-y-auto bg-white flex-1" style={{ minHeight: 0 }}>
                                    <iframe
                                        className="w-full h-full border-none"
                                        srcDoc={buildInvoiceEmailHtml({
                                            companyName: settings?.companyName || "Your Company",
                                            logoUrl: settings?.logoUrl || "",
                                            type: "statement",
                                            amount: totalAmount,
                                            messageHtml: watchedMessage?.replace(/\n/g, "<br/>") || "",
                                            websiteUrl: settings?.website || "",
                                            headingHtml: watchedHeading || "",
                                            footerHtml: watchedFooter?.replace(/\n/g, "<br/>") || ""
                                        })}
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-bg-card border-t border-border-subtle flex justify-end gap-3 rounded-b-2xl">
                        <Button type="button" variant="ghost" className="px-6" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex items-center gap-2 px-10">
                            <Mail size={16} /> Send Statement
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}



interface DeleteModalProps {
    invoiceId: string;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteConfirmationModal({ invoiceId, onClose, onConfirm }: DeleteModalProps) {
    return (
        <div className={overlayClass}>
            <div className={modalClass + " max-w-sm"}>
                <div className={headerClass}>
                    <h2 className={titleClass}>Delete Invoice?</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <div className="bg-status-error/10 p-4 rounded-lg flex items-start gap-3 mb-4">
                        <div className="text-status-error mt-0.5"><AlertCircle size={20} /></div>
                        <div className="text-sm text-text-main">
                            <p className="font-bold mb-1">This action cannot be undone.</p>
                            <p>Invoice <span className="font-mono font-bold">{invoiceId}</span> will be permanently deleted from the database.</p>
                        </div>
                    </div>
                    <p className="text-sm text-text-muted mb-6">Are you sure you want to proceed?</p>

                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={onConfirm}
                            className="bg-status-error hover:bg-status-error/90 text-white border-transparent"
                        >
                            Delete Invoice
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
