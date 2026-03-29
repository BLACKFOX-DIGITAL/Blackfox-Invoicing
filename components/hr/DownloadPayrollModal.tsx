"use client";

import { useState, useEffect } from "react";
import { X, FileText, Download, Loader2, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { saveAs } from "file-saver";
// import * as XLSX from "xlsx";
// import { pdf } from "@react-pdf/renderer";
import BankTransferLetter from "./BankTransferLetter";
import { useToast } from "@/components/ui/ToastProvider";
import { getSettings } from "@/app/actions/settings";
import { fetchLogoBase64 } from "@/lib/pdfUtils";

interface DownloadPayrollModalProps {
    records: any[];
    month: number;
    year: number;
    company: string;
    onClose: () => void;
}

export default function DownloadPayrollModal({ records, month, year, company, onClose }: DownloadPayrollModalProps) {
    const [bankName, setBankName] = useState("United Commercial Bank");
    const [branchName, setBranchName] = useState("Shamoly Branch");
    const [companyAccNo, setCompanyAccNo] = useState("2112112000001827");
    const [sourceAccName, setSourceAccName] = useState("");
    const [debitBranch, setDebitBranch] = useState("Arpara Branch");

    // Company contact details
    const [companyAddress, setCompanyAddress] = useState("");
    const [companyPhone, setCompanyPhone] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");
    const [companyEmail, setCompanyEmail] = useState("");
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [companyDisplayName, setCompanyDisplayName] = useState("");

    const [isDownloading, setIsDownloading] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const toast = useToast();

    const monthName = new Date(0, month - 1).toLocaleString('en', { month: 'long' });

    useEffect(() => {
        async function loadSettings() {
            const settingsResult = await getSettings();
            if (settingsResult.success && settingsResult.data) {
                const s = settingsResult.data;
                setCompanyAddress(s.address || "");
                setCompanyPhone(s.phone || "");
                setCompanyWebsite(s.website || "");
                setCompanyEmail(s.email || "");
                setCompanyDisplayName(s.companyName || "");
                setSourceAccName(s.companyName || "");

                if (s.logoUrl) {
                    const base64 = await fetchLogoBase64(s.logoUrl);
                    setLogoBase64(base64);
                }
            }
            setLoadingSettings(false);
        }
        loadSettings();
    }, []);

    const handleDownloadExcel = async () => {
        try {
            const XLSX = await import("xlsx");
            const bankRecords = records.filter(r => r.employee.paymentMethod !== "Cash");
            if (bankRecords.length === 0) {
                toast.error("No bank transfer records available.");
                return;
            }

            const data = bankRecords.map((r, i) => ({
                "Sl": i + 1,
                "Employee Name": `${r.employee.firstName} ${r.employee.lastName}`,
                "Bank Account Number": r.employee.bankAccountNo || "N/A",
                "Amount": r.netSalary
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Payroll");

            // Add summary row
            const total = bankRecords.reduce((sum, r) => sum + r.netSalary, 0);
            XLSX.utils.sheet_add_aoa(ws, [["", "Total Amount", "", total]], { origin: -1 });

            const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `Payroll_${monthName}_${year}.xlsx`);
            toast.success("Excel downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate Excel");
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const { pdf } = await import("@react-pdf/renderer");
            const bankRecords = records.filter(r => r.employee.paymentMethod !== "Cash");
            if (bankRecords.length === 0) {
                toast.error("No bank transfer records available to generate PDF.");
                setIsDownloading(false);
                return;
            }

            const blob = await pdf(
                <BankTransferLetter
                    companyName={companyDisplayName}
                    bankName={bankName}
                    branchName={branchName}
                    companyAccNo={companyAccNo}
                    sourceAccName={sourceAccName}
                    debitBranch={debitBranch}
                    month={monthName}
                    year={year}
                    records={bankRecords}
                    logoUrl={logoBase64}
                    companyAddress={companyAddress}
                    companyPhone={companyPhone}
                    companyWebsite={companyWebsite}
                    companyEmail={companyEmail}
                />
            ).toBlob();
            saveAs(blob, `Bank_Letter_${monthName}_${year}.pdf`);
            toast.success("PDF downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-border-subtle flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Download size={20} className="text-primary" /> Download Payroll & Transfer Letter
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">
                    <section>
                        <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                            <Info size={16} className="text-primary" /> Bank Transfer Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Bank Name</label>
                                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. UCBL" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Recipient Branch</label>
                                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Shamoly Branch" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Source Account No</label>
                                <Input value={companyAccNo} onChange={(e) => setCompanyAccNo(e.target.value)} placeholder="211xxxxxx" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Source Account Name (In "We, ...")</label>
                                <Input value={sourceAccName} onChange={(e) => setSourceAccName(e.target.value)} placeholder="e.g. Frame IT Solutions" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Debit Branch (In body text)</label>
                                <Input value={debitBranch} onChange={(e) => setDebitBranch(e.target.value)} placeholder="e.g. Arpara Branch" />
                            </div>
                        </div>
                    </section> section

                    <section className="bg-background/40 p-4 rounded-xl border border-border">
                        <h3 className="text-sm font-bold text-text-main mb-4">Letter Footer & Header Info</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Company Address (Footer)</label>
                                <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="123 Street..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Phone (Footer)</label>
                                <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+880..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Website (Footer)</label>
                                <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="www.example.com" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase">Email (Footer)</label>
                                <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@example.com" />
                            </div>
                        </div>
                        {logoBase64 ? (
                            <p className="text-[10px] text-status-success mt-2 font-medium">✓ Logo detected and will be included in header.</p>
                        ) : (
                            <p className="text-[10px] text-status-warning mt-2 font-medium">! No logo detected in settings. Header will be blank.</p>
                        )}
                    </section>

                    <div className="grid grid-cols-2 gap-6 pt-4">
                        <Button
                            variant="secondary"
                            className="flex flex-col items-center justify-center py-8 gap-3 border-2 border-dashed border-border hover:border-primary/50 transition-all hover:bg-background/50"
                            onClick={handleDownloadExcel}
                        >
                            <FileText size={32} className="text-green-600" />
                            <div className="text-center">
                                <span className="block font-bold text-text-main uppercase tracking-wide">Excel Template</span>
                                <span className="text-[10px] text-text-muted font-bold">FOR BANK UPLOAD</span>
                            </div>
                        </Button>

                        <Button
                            variant="secondary"
                            className="flex flex-col items-center justify-center py-8 gap-3 border-2 border-dashed border-border hover:border-primary/50 transition-all hover:bg-background/50"
                            onClick={handleDownloadPDF}
                            disabled={isDownloading || loadingSettings}
                        >
                            {isDownloading ? <Loader2 size={32} className="animate-spin text-red-600" /> : <Download size={32} className="text-red-600" />}
                            <div className="text-center">
                                <span className="block font-bold text-text-main uppercase tracking-wide">PDF Letter</span>
                                <span className="text-[10px] text-text-muted font-bold">WITH LOGO & FOOTER</span>
                            </div>
                        </Button>
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-background/50 rounded-b-2xl flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Discard</Button>
                </div>
            </div>
        </div>
    );
}
