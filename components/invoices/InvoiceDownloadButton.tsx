"use client";

import { useState } from "react";
// Remove top-level import to avoid Turbopack issues
// import { pdf } from "@react-pdf/renderer";
import InvoicePDF from "./InvoicePDF";
import { fetchLogoBase64 } from "@/lib/pdfUtils";
import { Loader2, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

interface InvoiceDownloadButtonProps {
    invoice: {
        id: string;
        clientName: string;
        clientCompany?: string;
        date: string;
        dueDate?: string;
        status: string;
        subtotal: number;
        tax: number;
        total: number;
        items: {
            serviceName: string;
            quantity: number;
            rate: number;
            total: number;
            date?: string;
            description?: string;
        }[];
        totalPaid?: number;
        balanceDue?: number;
    };
    payments?: {
        date: string;
        method: string;
        amount: number;
        notes?: string;
    }[];
    customer?: any;
    settings?: any;
    variant?: "primary" | "secondary" | "ghost";
    className?: string;
    children?: React.ReactNode;
}

export default function InvoiceDownloadButton({
    invoice,
    payments = [],
    customer,
    settings,
    variant = "secondary",
    className,
    children
}: InvoiceDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const toast = useToast();

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isGenerating) return;

        setIsGenerating(true);
        try {
            // Lazy load the PDF generator to avoid bundling issues
            const { pdf } = await import("@react-pdf/renderer");

            // Prepare settings with base64 logo ON DEMAND
            let pdfSettings = { ...settings };
            if (settings?.logoUrl) {
                try {
                    const base64Logo = await fetchLogoBase64(settings.logoUrl);
                    if (base64Logo) {
                        pdfSettings.logoUrl = base64Logo;
                    } else {
                        pdfSettings.logoUrl = undefined;
                    }
                } catch (err) {
                    console.error("Failed to prepare logo for PDF:", err);
                    pdfSettings.logoUrl = undefined;
                }
            }

            // Generate PDF Blob
            const doc = <InvoicePDF
                invoice={invoice}
                payments={payments}
                customer={customer}
                settings={pdfSettings}
            />;

            const blob = await pdf(doc).toBlob();

            // Sanitize filename - "Customer ID - Invoice Number Company Name"
            const customerId = customer?.id || "";
            const invoiceNumber = invoice.id;
            // Prioritize the clientCompany from the specific billing profile selected on the invoice
            const companyNameStr = invoice.clientCompany || invoice.clientName || customer?.name || "Customer";

            const rawFilename = `${customerId} - ${invoiceNumber} ${companyNameStr}`;
            const sanitizedFilename = rawFilename.replace(/[/\\?%*:|"<>]/g, '-').trim();
            const filename = `${sanitizedFilename}.pdf`;

            // Create a File object with the explicit name
            const file = new File([blob], filename, { type: 'application/pdf' });

            // Try using the modern File System Access API first (Chrome 86+)
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'PDF Document',
                            accept: { 'application/pdf': ['.pdf'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    return; // Success, exit early
                } catch (err: any) {
                    // User cancelled - just exit, don't trigger fallback
                    if (err.name === 'AbortError') {
                        return; // User cancelled, exit gracefully
                    }
                    // For other errors, log and continue to fallback
                    console.warn('showSaveFilePicker failed, using fallback:', err);
                }
            }

            // Fallback: Use anchor tag with blob URL
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);

            // Force the click
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 500);
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            onClick={handleDownload}
            disabled={isGenerating}
            variant={variant}
            className={`flex items-center gap-2 ${className || ''}`}
        >
            {isGenerating ? (
                <>
                    <Loader2 size={16} className="animate-spin" />
                    {!children && "Generating..."}
                </>
            ) : (
                children || (
                    <>
                        <Download size={16} />
                        Download PDF
                    </>
                )
            )}
        </Button>
    );
}
