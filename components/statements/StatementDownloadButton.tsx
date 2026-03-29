"use client";

import { useState } from "react";
// import { pdf } from "@react-pdf/renderer";
import StatementPDF from "./StatementPDF";
import Button from "@/components/ui/Button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

interface StatementDownloadButtonProps {
    customerName: string;
    customerAddress?: string;
    customer?: any;
    items: any[];
    totalAmount: number;
    currency: string;
    companyDetails?: any;
    type?: "outstanding" | "activity";
    onDownload?: () => void;
    variant?: "primary" | "secondary" | "ghost";
    className?: string;
}

export default function StatementDownloadButton({
    customerName,
    customerAddress,
    customer,
    items,
    totalAmount,
    currency,
    companyDetails,
    type = "outstanding",
    onDownload,
    variant = "secondary",
    className
}: StatementDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const toast = useToast();

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const { pdf } = await import("@react-pdf/renderer");
            const { fetchLogoBase64 } = await import("@/lib/pdfUtils");

            // Prepare company details with base64 logo if present
            let processedDetails = { ...companyDetails };
            if (companyDetails?.logoUrl) {
                const base64Logo = await fetchLogoBase64(companyDetails.logoUrl);
                if (base64Logo) {
                    processedDetails.logoUrl = base64Logo;
                }
            }

            const doc = <StatementPDF
                customerName={customerName}
                customerAddress={customerAddress}
                customer={customer}
                items={items}
                totalAmount={totalAmount}
                currency={currency}
                companyDetails={processedDetails}
                type={type}
            />;

            const blob = await pdf(doc).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Statement-${customerName.replace(/\s+/g, '-')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            if (onDownload) onDownload();
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            variant={variant}
            onClick={handleDownload}
            disabled={isGenerating}
            className={`flex items-center gap-2 ${className || ''}`}
        >
            {isGenerating ? (
                <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Download size={16} />
                    Download PDF
                </>
            )}
        </Button>
    );
}
