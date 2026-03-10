"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ArrowLeft, Send, CreditCard, History, Download, Link as LinkIcon } from "lucide-react";
import { getCurrencySymbol, formatDate, formatDateLong, formatDateDots } from "@/lib/format";
import { SendInvoiceModal, RecordPaymentModal } from "@/components/invoices/InvoiceActions";
import { updateInvoiceStatus } from "@/app/actions/invoices";
import { getInvoicePayments } from "@/app/actions/payments";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/ToastProvider";
import Image from "next/image";
import { COUNTRIES } from "@/lib/constants/countries";


import { pdf } from "@react-pdf/renderer";
import InvoicePDF from "./InvoicePDF";
import { fetchLogoBase64 } from "@/lib/pdfUtils";

import { Edit2, Plus } from "lucide-react";
import EditInvoiceModal from "./EditInvoiceModal";

import { createInvoice } from "@/app/actions/invoices";
import { buildInvoiceEmailHtml } from "@/lib/emailUtils";

// Dynamic import to avoid SSR issues with react-pdf
const InvoiceDownloadButton = dynamic(
    () => import("@/components/invoices/InvoiceDownloadButton"),
    { ssr: false, loading: () => <Button variant="secondary" disabled>Loading...</Button> }
);

interface Payment {
    id: number;
    amount: number;
    fee: number;
    net: number;
    method: string;
    date: string;
    notes?: string;
}

interface InvoiceDetailContentProps {
    invoice: any;
    items: any[];
    customer?: any;
    customers?: any[];
    workLogs?: any[];
    services?: any[];
    settings?: any;
}

export default function InvoiceDetailContent({
    invoice: initialInvoice,
    items,
    customer,
    customers = [],
    workLogs = [],
    services = [],
    settings
}: InvoiceDetailContentProps) {
    const [invoice, setInvoice] = useState(initialInvoice);
    const [activeModal, setActiveModal] = useState<"send" | "pay" | "edit" | "create" | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const router = useRouter();
    const toast = useToast();

    // Sync state with props when router refreshes
    useEffect(() => {
        setInvoice(initialInvoice);
    }, [initialInvoice]);

    const handleCreateInvoice = async (data: any) => {
        try {
            const result = await createInvoice({
                customerId: data.customerId,
                clientName: customers.find(c => c.id === data.customerId)?.name || "Unknown",
                date: data.invoiceDate,
                dueDate: data.dueDate,
                subtotal: data.subtotal,
                tax: 0,
                total: data.total,
                discount: data.discount || 0,
                discountType: data.discountType || "fixed",
                discountValue: data.discountValue || 0,
                workLogIds: data.logIds.map((id: string) => parseInt(id)),
                id: data.customId,
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

            if (result.success) {
                if (result.data?.id) {
                    router.refresh();
                    setActiveModal(null);
                    router.push(`/invoices/${result.data.id}`);
                }
            } else {
                toast.error("Failed to create invoice: " + result.error);
            }
        } catch (error) {
            console.error("Error creating invoice:", error);
            toast.error("An unexpected error occurred.");
        }
    };

    // Default Company Info from Settings
    const companyName = settings?.companyName || "Your Company";
    const companyAddress = settings?.address || "House 545/A, Road 11, Adabor\nDhaka 1207, Bangladesh";
    const companyEmail = settings?.email || "billing@blackfoxdigital.com.bd";
    const logoUrl = settings?.logoUrl || "";
    const companyPhone = settings?.phone || "";

    const companyDetails = settings ? {
        name: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        logoUrl: settings.logoUrl,
        currency: settings.currency,
    } : {
        name: settings?.companyName || "Your Company",
        address: "House 545/A, Road 11, Adabor\nDhaka 1207, Bangladesh",
        phone: "",
        email: "billing@blackfoxdigital.com.bd",
        website: "",
        logoUrl: "",
        currency: "USD",
    };

    // Fetch payments on mount and after recording a payment
    useEffect(() => {
        async function fetchPayments() {
            setLoadingPayments(true);
            const result = await getInvoicePayments(invoice.id);
            if (result.success) {
                setPayments(result.data.map((p: any) => ({
                    ...p,
                    amount: typeof p.amount === 'object' ? Number(p.amount) : p.amount,
                    fee: typeof p.fee === 'object' ? Number(p.fee) : p.fee,
                    net: typeof p.net === 'object' ? Number(p.net) : p.net,
                    date: formatDate(p.date)
                })));
            }
            setLoadingPayments(false);
        }
        fetchPayments();
    }, [invoice.id, invoice.totalPaid]);

    const handleSendSubmit = async (data: any) => {
        const { sendEmail } = await import("@/app/actions/sendEmail");

        try {
            const emailPayload: any = {
                to: data.to,
                subject: data.subject,
                htmlBody: buildInvoiceEmailHtml({
                    companyName: settings?.companyName || "Your Company",
                    logoUrl: settings?.logoUrl || "",
                    invoiceId: String(invoice.id),
                    amount: `${getCurrencySymbol(customer?.currency || settings?.currency)}${Number(invoice.balanceDue !== undefined ? invoice.balanceDue : (invoice.total || 0)).toFixed(2)}`,
                    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : "On Receipt",
                    messageHtml: data.message.replace(/\n/g, "<br/>"),
                    invoiceLink: `${window.location.origin}/public/invoice/${invoice.id}?token=${invoice.publicToken}`,
                    websiteUrl: settings?.website || "",
                    headingHtml: data.heading,
                    footerHtml: data.footer ? data.footer.replace(/\n/g, "<br/>") : "",
                    type: data.templateName?.toLowerCase().includes("overdue")
                        ? "overdue"
                        : data.templateName?.toLowerCase().includes("receipt")
                            ? "receipt"
                            : data.templateName?.toLowerCase().includes("statement")
                                ? "statement"
                                : "invoice"
                }),
                senderName: settings?.companyName || "Billing",
                invoiceId: invoice.id,
                customerId: invoice.customerId,
                attachments: [] // Initialize attachments
            };

            // Generate and attach PDF if requested
            if (data.attachPdf) {
                // Prepare PDF settings with base64 logo
                let pdfSettings = { ...settings };
                if (settings?.logoUrl) {
                    const base64Logo = await fetchLogoBase64(settings.logoUrl);
                    if (base64Logo) {
                        pdfSettings = { ...settings, logoUrl: base64Logo };
                    }
                }

                // Prepare Invoice Object for PDF (ensure numbers are numbers)
                const invoiceForPdf = {
                    ...invoice,
                    clientCompany: invoice.clientCompany,
                    clientAddress: invoice.clientAddress,
                    clientTaxId: invoice.clientTaxId,
                    items: items.map((item: any) => ({
                        serviceName: item.serviceName || item.service || "Service",
                        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
                        rate: typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate,
                        total: typeof item.total === 'string' ? parseFloat(item.total) : item.total,
                        date: item.date,
                        description: item.description
                    }))
                };

                // Generate PDF Blob
                const blob = await pdf(
                    <InvoicePDF
                        invoice={invoiceForPdf}
                        payments={payments}
                        customer={customer}
                        settings={pdfSettings}
                    />
                ).toBlob();

                // Convert Blob to Base64
                const base64Pdf = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result as string;
                        // Remove prefix if present (data:application/pdf;base64,)
                        resolve(res.split(',')[1] || res);
                    };
                    reader.readAsDataURL(blob);
                });

                const attCustomerId = customer?.id || "";
                const attCustomerName = invoice.clientName || customer?.name || "Customer";
                const attRawFilename = `${attCustomerId}-${invoice.id} ${attCustomerName}`;
                const attSanitizedFilename = attRawFilename.replace(/[/\\?%*:|"<>]/g, '-').trim();

                emailPayload.attachments.push({
                    filename: `${attSanitizedFilename}.pdf`,
                    content: base64Pdf,
                    mimeType: "application/pdf"
                });
            }

            const result = await sendEmail(emailPayload);

            if (result.success) {
                await updateInvoiceStatus(invoice.id, "Sent");
                setInvoice({ ...invoice, status: "Sent" });
                toast.success(result.data.message);
            } else {
                toast.error("Error: " + result.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to send email");
        }

        setActiveModal(null);
        router.refresh();
    };

    const handlePaySubmit = async (data: any) => {
        const { recordPayment } = await import("@/app/actions/payments");

        try {
            const result = await recordPayment({
                invoiceId: invoice.id,
                amount: data.amount, // Pass as string for precision
                fee: data.fee || undefined, // Pass as string or undefined
                method: data.method,
                date: data.date,
                notes: data.notes,
                sendReceipt: data.sendReceipt
            });

            if (result.success) {
                toast.success("Payment recorded successfully");
                setActiveModal(null);
                router.refresh();
            } else {
                toast.error("Error recording payment: " + result.error);
            }
        } catch (error) {
            console.error("Failed to record payment:", error);
            toast.error("Failed to record payment");
        }
    };

    const formatCurrency = (val: any) => {
        const globalCurrency = settings?.currency || "USD";
        const currency = customer?.currency || globalCurrency;
        const symbol = getCurrencySymbol(currency);

        // Handle value
        let amount = val;
        if (typeof val === 'string') {
            // Remove existing currency symbols if present to cleaner parse
            amount = parseFloat(val.replace(/[^0-9.-]/g, ''));
        }
        if (typeof amount !== 'number' || isNaN(amount)) {
            amount = 0;
        }

        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
            {/* Header Actions */}
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="text-text-muted hover:text-text-main flex items-center gap-2">
                        <ArrowLeft size={18} /> Back
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-text-main">Invoice {invoice.id}</h1>
                        <Badge variant={invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "error" : invoice.status === "Partially Paid" ? "warning" : invoice.status === "Sent" ? "info" : "default"}>{invoice.status}</Badge>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <InvoiceDownloadButton
                    invoice={{
                        ...invoice,
                        clientCompany: invoice.clientCompany,
                        clientAddress: invoice.clientAddress,
                        clientTaxId: invoice.clientTaxId,
                        items: items.map(item => ({
                            serviceName: item.serviceName || item.service || "Service",
                            quantity: item.quantity,
                            rate: typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate,
                            total: typeof item.total === 'string' ? parseFloat(item.total) : item.total,
                            date: item.date,
                            description: item.description
                        }))
                    }}
                    payments={payments}
                    customer={customer}
                    settings={settings}
                    className="flex items-center gap-2"
                >
                    <div className="flex items-center gap-2">
                        <Download size={16} />
                    </div>
                </InvoiceDownloadButton>
                <Button
                    variant="secondary"
                    onClick={() => {
                        const link = `${window.location.origin}/public/invoice/${invoice.id}?token=${invoice.publicToken}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Public link copied to clipboard!");
                    }}
                    className="flex items-center gap-2 border hover:bg-bg-surface"
                >
                    <LinkIcon size={16} /> Copy Link
                </Button>
                {invoice.status !== "Paid" && (
                    <Button onClick={() => setActiveModal("edit")} variant="secondary" className="flex items-center gap-2">
                        <Edit2 size={16} /> Edit
                    </Button>
                )}
                <Button onClick={() => setActiveModal("send")} className="flex items-center gap-2">
                    <Send size={16} /> Send
                </Button>
                {invoice.status !== "Paid" && (
                    <Button onClick={() => setActiveModal("pay")} className="flex items-center gap-2">
                        <CreditCard size={16} /> Record Payment
                    </Button>
                )}
                <Button href="/invoices/generate" className="flex items-center gap-2 ml-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus size={16} /> Generate Invoice
                </Button>
            </div>



            {/* BLACKFOX Invoice Document Design */}
            <div className="bg-white text-black shadow-lg border-[6px] border-[#ef4444] p-8 md:p-12 min-h-[900px] flex flex-col invoice-container relative mx-auto w-full max-w-[850px] print:shadow-none print:border-0 print:p-0">

                {/* Header: Logo & Address */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        {logoUrl ? (
                            <div className="relative w-64 h-24 mb-2">
                                <Image
                                    src={logoUrl}
                                    alt="Logo"
                                    fill
                                    className="object-contain object-left"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-red-500 text-3xl">▲</span>
                                <div className="flex flex-col">
                                    <h1 className="text-3xl font-bold text-gray-900 tracking-wider">
                                        {companyName.split(' ')[0]?.toUpperCase() || "BLACKFOX"}
                                    </h1>
                                    <span className="text-[10px] tracking-[0.4em] text-gray-500 uppercase ml-0.5">
                                        {companyName.split(' ').slice(1).join(' ') || "DIGITAL"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="text-right text-[12.5px] leading-[1.4] min-h-[120px]">
                        <div className="font-bold text-[16px] mb-1.5 text-black">{companyName}</div>
                        <div className="whitespace-pre-line text-black mb-1">{companyAddress}</div>
                        {settings?.phone && <div className="mb-1">{settings.phone}</div>}
                        <div className="mb-1">{settings?.email}</div>
                        <div className="text-gray-600 mb-1">{settings?.website}</div>
                        {settings?.tinId && <div className="text-gray-600">TIN: {settings.tinId}</div>}
                    </div>
                </div >

                {/* Decorative Invoice Title Box */}
                <div className="flex items-center justify-center my-6 relative w-full">
                    <div className="flex-grow flex flex-col gap-[3px] mr-4">
                        <div className="h-[1.5px] bg-[#ef4444] w-full"></div>
                        <div className="h-[1.5px] bg-[#ef4444] w-full"></div>
                    </div>
                    <div className="relative flex items-center justify-center w-[168px] h-[52px]">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 168 52" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 14 2 L 154 2 A 12 12 0 0 0 166 14 L 166 38 A 12 12 0 0 0 154 50 L 14 50 A 12 12 0 0 0 2 38 L 2 14 A 12 12 0 0 0 14 2 Z" stroke="#ef4444" strokeWidth="1.5" fill="#ffffff" />
                            <path d="M 16.7 5 L 151.3 5 A 15 15 0 0 0 163 16.7 L 163 35.3 A 15 15 0 0 0 151.3 47 L 16.7 47 A 15 15 0 0 0 5 35.3 L 5 16.7 A 15 15 0 0 0 16.7 5 Z" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                        </svg>
                        <h2 className="relative text-[34px] font-serif text-[#ef4444] font-medium leading-[1] m-0 p-0 flex items-center justify-center translate-y-[1px]">Invoice</h2>
                    </div>
                    <div className="flex-grow flex flex-col gap-[3px] ml-4">
                        <div className="h-[1.5px] bg-[#ef4444] w-full"></div>
                        <div className="h-[1.5px] bg-[#ef4444] w-full"></div>
                    </div>
                </div>

                {/* Info Grid */}
                < div className="flex justify-between mb-12 mt-8" >
                    {/* Bill To */}
                    <div className="w-1/2 pr-8">
                        <h3 className="text-[12px] font-bold text-gray-500 uppercase mb-2.5 tracking-wider">Bill To</h3>
                        <div className="text-[13px] min-h-[120px]">
                            <strong className="block text-[17px] mb-1.5">{invoice.clientCompany || invoice.clientName || customer?.name}</strong>
                            <div className="text-black text-sm leading-tight space-y-0.5">
                                {customer?.contactName && !invoice.clientCompany && <div className="font-medium">{customer.contactName}</div>}

                                {/* Prioritize snapshot address */}
                                {invoice.clientAddress ? (
                                    <div className="whitespace-pre-line">{invoice.clientAddress}</div>
                                ) : (
                                    <>
                                        {customer?.address && <div>{customer.address}</div>}
                                        {(customer?.city || customer?.state) && (
                                            <div>{[customer.city, customer.state].filter(Boolean).join(" ")}</div>
                                        )}
                                        {(customer?.zip || customer?.country) && (
                                            <div>{[customer.zip, customer.country ? (COUNTRIES.find(c => c.code === customer.country)?.name || customer.country) : undefined].filter(Boolean).join(" ")}</div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="mt-1 text-black leading-snug space-y-0.5">
                                {(invoice.clientTaxId || customer?.taxId) && <div>{invoice.clientTaxId || customer?.taxId}</div>}
                                {(invoice.clientPhone || (customer?.phone && !invoice.clientCompany)) && <div>{invoice.clientPhone || customer.phone}</div>}
                                {(invoice.clientEmail || ((customer?.contactEmail || customer?.email) && !invoice.clientCompany)) && <div>{invoice.clientEmail || customer.contactEmail || customer.email}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    < div className="w-[45%] flex flex-col items-end" >
                        <div className="w-full space-y-1">
                            <div className="flex justify-end items-center w-full">
                                <div className="text-sm font-bold text-black text-right pr-3">Invoice Number:</div>
                                <div className="text-sm text-black w-[120px] text-left">{invoice.invoiceNumber || invoice.id}</div>
                            </div>
                            <div className="flex justify-end items-center w-full">
                                <div className="text-sm font-bold text-black text-right pr-3">Invoice Date:</div>
                                <div className="text-sm text-black w-[120px] text-left">{formatDateLong(invoice.date)}</div>
                            </div>
                            {invoice.dueDate && (
                                <div className="flex justify-end items-center w-full">
                                    <div className="text-sm font-bold text-black text-right pr-3">Payment Due:</div>
                                    <div className="text-sm text-black w-[120px] text-left">{formatDateLong(invoice.dueDate)}</div>
                                </div>
                            )}
                            <div className="flex justify-end items-center w-fit ml-auto bg-gray-100 py-1 pl-2 pr-0 rounded-sm">
                                <div className="text-sm font-bold text-black text-right pr-3">Amount Due ({customer?.currency || settings?.currency || 'USD'}):</div>
                                <div className="text-sm font-bold text-black w-[120px] text-left">{formatCurrency(invoice.total)}</div>
                            </div>
                        </div>
                    </div >
                </div >

                {/* Items Table */}
                < table className="w-full mb-2" >
                    <thead>
                        <tr className="border-b border-gray-400 border-dotted">
                            <th className="text-left py-2 text-[14px] font-bold text-gray-900 w-[60%]">Items</th>
                            <th className="text-center py-2 text-[14px] font-bold text-gray-900 w-[10%]">Quantity</th>
                            <th className="text-right py-2 text-[14px] font-bold text-gray-900 w-[15%]">Price</th>
                            <th className="text-right py-2 text-[14px] font-bold text-gray-900 w-[15%]">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-400">No line items</td>
                            </tr>
                        ) : (
                            items.map((item, i) => {
                                const dateStr = formatDateDots(item.date);
                                return (
                                    <tr key={i} className="last:border-0 font-serif">
                                        <td className="py-2 pr-4">
                                            <div className="font-bold text-[14px] text-gray-900">{item.serviceName || item.service || "Service"}</div>
                                            <div className="text-[12px] text-gray-500 mt-1">
                                                {[
                                                    dateStr ? `Dated - ${dateStr}` : null,
                                                    item.description
                                                ].filter(Boolean).join(" | ")}
                                            </div>
                                        </td>
                                        <td className="py-2 text-center text-[13.5px] text-gray-900">{item.quantity}</td>
                                        <td className="py-2 text-right text-[13.5px] text-gray-900">{formatCurrency(item.rate)}</td>
                                        <td className="py-2 text-right text-[13.5px] text-gray-900">{formatCurrency(item.total)}</td>
                                    </tr>
                                )
                            })
                        )}
                        {/* Spacer Row if needed */}
                    </tbody>
                </table >

                {/* Totals */}
                < div className="flex justify-end border-t border-gray-300 pt-4 mb-12" >
                    <div className="w-1/2">
                        {Number(invoice.discount) > 0 && (
                            <>
                                <div className="flex justify-end items-center text-sm mb-2">
                                    <div className="font-bold text-gray-700 text-right pr-8">Subtotal:</div>
                                    <div className="text-gray-900 w-[120px] text-right">{formatCurrency(invoice.subtotal)}</div>
                                </div>
                                <div className="flex justify-end items-center text-sm mb-2 text-gray-700">
                                    <div className="font-bold text-right pr-8">Discount ({invoice.discountType === 'percentage' ? `${Number(invoice.discountValue)}%` : 'Fixed'}):</div>
                                    <div className="text-gray-900 w-[120px] text-right">-{formatCurrency(invoice.discount)}</div>
                                </div>
                                <div className="border-t border-gray-200 my-2"></div>
                            </>
                        )}
                        <div className="flex justify-end items-center text-[13.5px] mb-2">
                            <div className="font-bold text-gray-700 text-right pr-8">Total:</div>
                            <div className="text-gray-900 w-[120px] text-right">{formatCurrency(invoice.total)}</div>
                        </div>
                        {invoice.payments && invoice.payments.length > 0 && invoice.payments.map((payment: any) => (
                            <div key={`payment-${payment.id}`} className="flex justify-end items-center text-[13.5px] mb-2">
                                <div className="text-gray-700 text-right pr-8">Payment on {formatDateLong(payment.date)}:</div>
                                <div className="text-gray-900 w-[120px] text-right">{formatCurrency(payment.amount)}</div>
                            </div>
                        ))}
                        <div className="flex justify-end items-center text-[14.5px] border-t border-gray-200 pt-2 mt-2">
                            <div className="font-bold text-gray-900 text-right pr-8">Amount Due ({customer?.currency || settings?.currency || 'USD'}):</div>
                            <div className="font-bold text-gray-900 w-[120px] text-right">{formatCurrency(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.total)}</div>
                        </div>
                    </div>
                </div >

                {/* Footer Section */}
                < div className="mt-auto" >
                    <div className="mb-6">
                        <h4 className="text-[13.5px] font-bold text-gray-800 mb-2">Notes / Terms</h4>
                        <p className="text-[12.5px] text-gray-600 leading-relaxed font-serif">
                            •• Thank you for your business. Please pay all dues as soon as possible. We at {companyName} will always be there to provide you with the best possible service. If you have any query, please feel free to inform us.
                        </p>
                    </div>

                    <div>
                        <p className="text-[12.5px] text-gray-600 mb-2 font-serif">Please make your payment in the following account:</p>

                        {customer?.paymentMethod ? (
                            <div className="text-[12.5px] mb-4">
                                <div className="whitespace-pre-line text-gray-700 leading-relaxed font-serif">{customer.paymentMethod.details}</div>
                            </div>
                        ) : settings?.paymentMethods && settings.paymentMethods.length > 0 ? (
                            settings.paymentMethods.map((pm: any, i: number) => (
                                <div key={i} className="text-[12.5px] mb-4">
                                    <div className="whitespace-pre-line text-gray-700 leading-relaxed font-serif">{pm.details}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[12.5px] text-gray-500 italic">
                                No payment details available.
                            </div>
                        )}

                        <p className="text-[12.5px] text-gray-600 mt-4 leading-relaxed font-serif">
                            If you face any other problems making payments, please let us know. We will be happy to help with alternative options. Thank you.
                        </p>
                    </div>
                </div >

            </div >

            {/* Payment History Section (Outside the printed invoice) */}
            < div className="bg-bg-card rounded-lg border border-border-subtle p-6 mt-6 print:hidden" >
                <div className="flex items-center gap-2 mb-4">
                    <History size={20} className="text-text-muted" />
                    <h2 className="text-lg font-bold text-text-main">Payment History</h2>
                </div>

                {
                    loadingPayments ? (
                        <p className="text-text-muted text-sm">Loading payments...</p>
                    ) : payments.length === 0 ? (
                        <p className="text-text-muted text-sm">No payments recorded yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-subtle">
                                    <th className="text-left py-2 text-text-muted font-medium">Date</th>
                                    <th className="text-right py-2 text-text-muted font-medium">Amount Paid</th>
                                    <th className="text-right py-2 text-text-muted font-medium">Fee</th>
                                    <th className="text-right py-2 text-text-muted font-medium">Net Received</th>
                                    <th className="text-left py-2 text-text-muted font-medium">Method</th>
                                    <th className="text-left py-2 text-text-muted font-medium">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-border-subtle/50">
                                        <td className="py-3 text-text-main">{payment.date}</td>
                                        <td className="py-3 text-right text-green-500 font-mono font-medium">{formatCurrency(payment.amount)}</td>
                                        <td className="py-3 text-right text-text-muted font-mono">{formatCurrency(payment.fee)}</td>
                                        <td className="py-3 text-right text-text-main font-mono">{formatCurrency(payment.net)}</td>
                                        <td className="py-3 text-text-main">{payment.method}</td>
                                        <td className="py-3 text-text-muted truncate max-w-[150px]">{payment.notes || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                }
            </div >

            {/* Modals */}
            {
                activeModal === 'send' && (
                    <SendInvoiceModal
                        invoice={invoice}
                        customer={customer}
                        settings={settings}
                        onClose={() => setActiveModal(null)}
                        onSend={handleSendSubmit}
                    />
                )
            }

            {
                activeModal === 'pay' && (
                    <RecordPaymentModal
                        invoice={invoice}
                        customer={customer}
                        settings={settings}
                        onClose={() => setActiveModal(null)}
                        onPay={handlePaySubmit}
                    />
                )
            }

            {
                activeModal === 'edit' && (
                    <EditInvoiceModal
                        invoice={{
                            ...invoice,
                            items: items.map(item => ({
                                id: item.id,
                                serviceName: item.serviceName || item.service || "Service",
                                description: item.description,
                                quantity: item.quantity,
                                rate: item.rate,
                                total: item.total,
                                date: item.date
                            }))
                        }}
                        onClose={() => setActiveModal(null)}
                        onUpdate={() => {
                            setActiveModal(null);
                            router.refresh();
                        }}
                    />
                )
            }
        </div >
    );
}
