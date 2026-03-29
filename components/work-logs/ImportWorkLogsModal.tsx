"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
// import * as xlsx from "xlsx";
import toast from "react-hot-toast";
import { Upload, X, AlertCircle, FileText } from "lucide-react";
import { createWorkLogsBatch } from "@/app/actions/work-logs";
import { useRouter } from "next/navigation";

interface ImportWorkLogsModalProps {
    onClose: () => void;
    customers: any[];
    services: any[];
}

export default function ImportWorkLogsModal({ onClose, customers, services }: ImportWorkLogsModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState("");

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setErrors([]);
        setParsedData([]);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const xlsx = await import("xlsx");
                const data = event.target?.result;
                const workbook = xlsx.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                if (json.length < 2) {
                    setErrors(["The file seems empty or missing data rows."]);
                    return;
                }

                // First row is headers
                const headers: string[] = json[0].map(h => String(h).toLowerCase().trim());

                // Map columns
                const dateIdx = headers.findIndex(h => h.includes('date'));
                const customerIdx = headers.findIndex(h => h.includes('customer') || h.includes('customer id') || h.includes('id'));
                const serviceIdx = headers.findIndex(h => h.includes('service'));
                const quantityIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
                const descIdx = headers.findIndex(h => h.includes('desc'));

                if (dateIdx === -1 || customerIdx === -1 || serviceIdx === -1 || quantityIdx === -1) {
                    setErrors(["Missing required columns. Please use columns: Date, Customer ID, Service, Quantity, Description."]);
                    return;
                }

                const newErrors: string[] = [];
                const parsedLogsToImport: any[] = [];

                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    if (!row || row.length === 0 || !row.some(c => !!c)) continue; // skip empty rows

                    const dateVal = row[dateIdx];
                    const customerVal = String(row[customerIdx] || "").trim();
                    const serviceVal = String(row[serviceIdx] || "").trim();
                    const qtyVal = row[quantityIdx];
                    const descVal = row[descIdx] ? String(row[descIdx]) : "";

                    let parsedDate = "";
                    if (typeof dateVal === 'number') {
                        // Excel serial date format
                        const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                        parsedDate = dateObj.toISOString();
                    } else if (dateVal) {
                        try {
                            parsedDate = new Date(dateVal).toISOString();
                        } catch (e) {
                            // fallback
                        }
                    }

                    if (!parsedDate || isNaN(new Date(parsedDate).getTime())) {
                        newErrors.push(`Row ${i + 1}: Invalid date format.`);
                        continue;
                    }

                    if (!customerVal) {
                        newErrors.push(`Row ${i + 1}: Missing Customer ID.`);
                        continue;
                    }

                    // Find service
                    const service = services.find(s =>
                        (s.name.toLowerCase() === serviceVal.toLowerCase() || s.id === serviceVal) &&
                        (!s.customerId || String(s.customerId) === String(customerVal))
                    );
                    if (!serviceVal) {
                        newErrors.push(`Row ${i + 1}: Missing Service.`);
                        continue;
                    }

                    const quantity = parseFloat(String(qtyVal));
                    if (isNaN(quantity) || quantity <= 0) {
                        newErrors.push(`Row ${i + 1}: Invalid quantity '${qtyVal}'.`);
                        continue;
                    }

                    parsedLogsToImport.push({
                        date: parsedDate,
                        customerId: customerVal,
                        serviceId: service ? service.id : undefined,
                        serviceName: service ? service.name : serviceVal,
                        quantity,
                        rate: service ? Number(service.rate) : 0, // Default to 0 if new 
                        description: descVal,
                        // helpful fields for preview
                        _customerName: `ID: ${customerVal}`,
                        _serviceName: service ? service.name : `${serviceVal} (New)`
                    });
                }

                if (newErrors.length > 0) {
                    setErrors(newErrors);
                } else if (parsedLogsToImport.length > 0) {
                    setParsedData(parsedLogsToImport);
                } else {
                    setErrors(["No valid data rows found."]);
                }

            } catch (error) {
                console.error(error);
                setErrors(["Error parsing the file. Make sure it's a valid Excel or CSV file."]);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;

        startTransition(async () => {
            // Remove meta keys
            const payload = parsedData.map(d => ({
                date: d.date,
                customerId: d.customerId,
                serviceId: d.serviceId,
                serviceName: d.serviceName,
                quantity: d.quantity,
                rate: d.rate,
                description: d.description
            }));

            const res = await createWorkLogsBatch(payload);
            if (res.success) {
                toast.success(`Successfully imported ${res.data.count} work logs.`);
                onClose();
                router.refresh();
            } else {
                toast.error(res.error || "Failed to import logs");
            }
        });
    };

    const downloadTemplate = async () => {
        const xlsx = await import("xlsx");
        const ws = xlsx.utils.aoa_to_sheet([
            ["Date", "Customer ID", "Service", "Quantity", "Description"],
            ["2024-05-12", "1001", "Web Development", "5", "Sample description"],
        ]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Template");
        xlsx.writeFile(wb, "invofox_worklogs_template.xlsx");
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-app rounded-xl border border-border-default shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-text-main">Bulk Import Work Logs</h2>
                        <p className="text-sm text-text-muted mt-1">Upload a CSV or Excel file to import multiple logs at once.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main rounded-md hover:bg-bg-surface transition-colors" disabled={isPending}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {!parsedData.length && (
                        <div className="space-y-6">
                            <div className="bg-bg-surface p-4 rounded-lg border border-border-subtle text-sm text-text-muted">
                                <p className="font-semibold text-text-main mb-2">Instructions:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Use an Excel (.xlsx) or CSV file.</li>
                                    <li>The first row must be the header containing exactly these columns (case-insensitive): <span className="font-mono text-primary bg-primary/10 px-1 rounded">Date</span>, <span className="font-mono text-primary bg-primary/10 px-1 rounded">Customer ID</span>, <span className="font-mono text-primary bg-primary/10 px-1 rounded">Service</span>, <span className="font-mono text-primary bg-primary/10 px-1 rounded">Quantity</span>, <span className="font-mono text-primary bg-primary/10 px-1 rounded">Description</span>.</li>
                                    <li>Work logs will be linked to the Customer ID. If the Customer ID doesn't exist yet, a placeholder will be created.</li>
                                    <li>If the <span className="font-mono text-primary bg-primary/10 px-1 rounded">Service</span> name doesn't exist, a new service will be automatically created under that customer.</li>
                                    <li>Date should be in a standard format (e.g. YYYY-MM-DD).</li>
                                </ul>
                                <button onClick={downloadTemplate} className="text-primary hover:text-primary-hover font-medium mt-3 inline-flex items-center gap-1">
                                    <FileText size={14} /> Download Example Template
                                </button>
                            </div>

                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-default rounded-lg cursor-pointer bg-bg-surface hover:bg-bg-surface/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-3 text-text-muted" />
                                    <p className="mb-2 text-sm text-text-main">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-text-muted">CSV or XLSX (Excel)</p>
                                </div>
                                <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                            </label>
                            {fileName && <p className="text-sm text-center text-text-muted mt-2">Selected: {fileName}</p>}
                        </div>
                    )}

                    {errors.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-sm">
                            <div className="flex items-center gap-2 font-semibold mb-2">
                                <AlertCircle size={16} /> Import Errors Found:
                            </div>
                            <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                                {errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                            <div className="mt-4 flex justify-end">
                                <Button variant="outline" onClick={() => { setErrors([]); setParsedData([]); setFileName(""); }}>
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}

                    {parsedData.length > 0 && errors.length === 0 && (
                        <div className="space-y-4 -mt-2">
                            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg text-sm flex items-center gap-2">
                                ✅ Ready to import {parsedData.length} records.
                            </div>

                            <div className="border border-border-default rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left text-text-main">
                                    <thead className="text-xs text-text-muted bg-bg-surface uppercase">
                                        <tr>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Customer</th>
                                            <th className="px-4 py-2">Service</th>
                                            <th className="px-4 py-2">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="border-t border-border-default">
                                                <td className="px-4 py-2 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 truncate max-w-[150px]">{row._customerName}</td>
                                                <td className="px-4 py-2 truncate max-w-[150px]">{row._serviceName}</td>
                                                <td className="px-4 py-2">{row.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 5 && (
                                    <div className="p-2 text-center text-xs text-text-muted border-t border-border-default">
                                        ... and {parsedData.length - 5} more rows
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border-default flex justify-end gap-3 bg-bg-surface mt-auto">
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    {parsedData.length > 0 && errors.length === 0 ? (
                        <Button onClick={handleImport} disabled={isPending}>
                            {isPending ? "Importing..." : `Import ${parsedData.length} Logs`}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
