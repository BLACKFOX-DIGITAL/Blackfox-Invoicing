"use client";

import { PDFViewer } from "@react-pdf/renderer";
import StatementPDF from "./StatementPDF";

interface StatementPDFPreviewProps {
    customerName: string;
    customerAddress?: string;
    items: any[];
    totalAmount: number;
    currency: string;
    companyDetails?: any;
}

export default function StatementPDFPreview({
    customerName,
    customerAddress,
    items,
    totalAmount,
    currency,
    companyDetails
}: StatementPDFPreviewProps) {
    return (
        <PDFViewer width="100%" height="100%" className="w-full h-full border-none">
            <StatementPDF
                customerName={customerName}
                customerAddress={customerAddress}
                items={items}
                totalAmount={totalAmount}
                currency={currency}
                companyDetails={companyDetails}
            />
        </PDFViewer>
    );
}
