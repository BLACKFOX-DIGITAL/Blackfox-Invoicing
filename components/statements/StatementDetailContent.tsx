"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { ArrowLeft, Send, Download } from "lucide-react";

import { formatCurrency, formatDateLong, formatDate, formatDateDots } from "@/lib/format";
import Image from "next/image";
import { COUNTRIES } from "@/lib/constants/countries";

import { useToast } from "@/components/ui/ToastProvider";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { logStatementActivity } from "@/app/actions/statements";

import { SendStatementModal } from "@/components/invoices/InvoiceActions";

const StatementDownloadButton = dynamic(
    () => import("@/components/statements/StatementDownloadButton"),
    { ssr: false, loading: () => <Button variant="secondary" disabled>Loading...</Button> }
);

interface StatementDetailContentProps {
    customer: any;
    items: any[];
    settings?: any;
    totalAmount: number;
    currency: string;
    startDate?: string;
    endDate?: string;
    type?: "outstanding" | "activity";
}

export default function StatementDetailContent({
    customer,
    items,
    settings,
    totalAmount,
    currency,
    startDate,
    endDate,
    type = "outstanding"
}: StatementDetailContentProps) {
    const [isClient, setIsClient] = useState(false);
    const [activeModal, setActiveModal] = useState<"email" | null>(null);
    const toast = useToast();
    const router = useRouter();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const companyName = settings?.companyName || "Blackfox Digital";
    const companyAddress = settings?.address || "House 545/A, Road 11, Adabor\nDhaka 1207, Bangladesh";
    const companyPhone = settings?.phone || "";
    const companyEmail = settings?.email || "billing@blackfoxdigital.com.bd";
    const logoUrl = settings?.logoUrl || "";

    const companyDetails = settings ? {
        name: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        tinId: settings.tinId,
        logoUrl: settings.logoUrl
    } : undefined;

    const handleLogActivity = async (status: "Sent" | "Downloaded") => {
        if (!customer) return;

        await logStatementActivity({
            customerId: customer.id,
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || new Date().toISOString(),
            itemCount: items.length,
            totalAmount: totalAmount,
            status
        });
    };

    const handleSendEmail = async (data: any) => {
        const { sendEmail } = await import("@/app/actions/sendEmail");

        try {
            const { buildInvoiceEmailHtml } = await import("@/lib/emailUtils");
            const result = await sendEmail({
                to: data.to,
                subject: data.subject,
                htmlBody: buildInvoiceEmailHtml({
                    companyName: settings?.companyName || "Your Company",
                    logoUrl: settings?.logoUrl || "",
                    amount: formatCurrency(totalAmount, currency),
                    messageHtml: data.message.replace(/\n/g, "<br/>"),
                    type: 'statement',
                    websiteUrl: settings?.website || "",
                    headingHtml: data.heading,
                    footerHtml: data.footer ? data.footer.replace(/\n/g, "<br/>") : ""
                }),
                senderName: "Billing"
            });

            if (result.success) {
                toast.success(result.data.message);
                handleLogActivity("Sent");
            } else {
                toast.error("Error sending email: " + result.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to send email.");
        }
        setActiveModal(null);
    };

    if (!isClient) return <div className="p-10 text-center">Loading statement...</div>;

    // Calculate overdue vs not yet due
    const today = new Date();
    let overdueAmount = 0;
    let notYetDueAmount = 0;

    items.forEach(inv => {
        const balance = inv.balanceDue ?? inv.total;
        if (inv.status === "Paid") return;

        const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
        if (dueDate && dueDate < today) {
            overdueAmount += balance;
        } else {
            notYetDueAmount += balance;
        }
    });

    const formatMoney = (amount: number) => {
        const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '';
        return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
            {/* Header Actions */}
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-text-muted hover:text-text-main flex items-center gap-2">
                        <ArrowLeft size={18} /> Back
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-text-main">
                            Statement for {customer?.name || "Unknown Customer"}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatementDownloadButton
                        customerName={customer?.name || ""}
                        customerAddress={customer?.address || ""}
                        customer={customer}
                        items={items}
                        totalAmount={totalAmount}
                        currency={currency}
                        companyDetails={companyDetails}
                        type={type}
                        onDownload={() => handleLogActivity("Downloaded")}
                    />
                    <Button onClick={() => setActiveModal("email")} className="flex items-center gap-2">
                        <MailIcon size={16} /> Email Statement
                    </Button>
                </div>
            </div>

            {/* BLACKFOX Statement Document Design */}
            <div className="bg-white text-black shadow-lg border-[6px] border-[#ef4444] p-8 md:p-12 min-h-[900px] flex flex-col invoice-container relative mx-auto w-full max-w-[850px] print:shadow-none print:border-0 print:p-0">

                {/* Header: Logo & Address */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                        <div>
                            {logoUrl ? (
                                <div className="relative w-48 h-[4.5rem]">
                                    <Image
                                        src={logoUrl}
                                        alt="Logo"
                                        fill
                                        className="object-contain object-left"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-red-500 text-2xl">▲</span>
                                    <div className="flex flex-col">
                                        <h1 className="text-2xl font-bold text-gray-900 tracking-wider">
                                            {companyName.split(' ')[0]?.toUpperCase() || "BLACKFOX"}
                                        </h1>
                                        <span className="text-[7.5px] tracking-[0.4em] text-gray-500 uppercase ml-0.5">
                                            {companyName.split(' ').slice(1).join(' ') || "DIGITAL"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="text-[12.5px] text-gray-800 leading-[1.4] pt-2">
                            <div className="font-bold text-[16px] mb-1.5 text-black">{companyName}</div>
                            <div className="whitespace-pre-line text-black mb-0.5">{companyAddress}</div>
                            {settings?.phone && <div className="text-gray-700 mb-0.5">{settings.phone}</div>}
                            <div className="text-gray-700 mb-0.5">{settings?.email}</div>
                            <div className="text-gray-600 mb-0.5">{settings?.website}</div>
                            {settings?.tinId && <div className="text-gray-600">TIN: {settings.tinId}</div>}
                        </div>
                    </div>
                    <div className="text-right pt-2">
                        <h2 className="text-[26px] font-bold text-black mb-1 m-0">Statement of Account</h2>
                        <div className="text-[14px] text-gray-600">
                            {type === 'activity' ? "Account activity" : "Outstanding invoices"}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="flex justify-between mb-8 mt-2">
                    {/* Bill To */}
                    <div className="w-1/2 pr-8">
                        <h3 className="text-[12px] font-bold text-gray-500 uppercase mb-3 tracking-wider">Bill To</h3>
                        <div className="text-[13px] min-h-[90px]">
                            <strong className="block text-[17px] mb-1.5">{customer?.name || "Unknown"}</strong>
                            <div className="text-black leading-tight space-y-0.5">
                                {customer?.contactName && <div className="font-medium">{customer.contactName}</div>}
                                {customer?.address && <div>{customer.address}</div>}
                                {(customer?.city || customer?.state) && (
                                    <div>{[customer.city, customer.state].filter(Boolean).join(" ")}</div>
                                )}
                                {(customer?.zip || customer?.country) && (
                                    <div>{[customer.zip, customer.country ? (COUNTRIES.find(c => c.code === customer.country)?.name || customer.country) : undefined].filter(Boolean).join(" ")}</div>
                                )}
                            </div>

                            <div className="mt-1 text-[10.5px] text-black leading-tight space-y-0.5">
                                {customer?.taxId && <div>{customer.taxId}</div>}
                                {customer?.phone && <div>{customer.phone}</div>}
                                {(customer?.contactEmail || customer?.email) && <div>{customer.contactEmail || customer.email}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Statement Details */}
                    <div className="w-[45%] flex flex-col items-end">
                        <div className="w-full space-y-1">
                            <div className="flex justify-end items-center w-full">
                                <div className="text-[14px] font-bold text-black text-right pr-3">Statement Date:</div>
                                <div className="text-[13.5px] text-black w-[100px] text-left">{formatDateLong(new Date())}</div>
                            </div>
                            <div className="flex justify-end items-center w-full">
                                <div className="text-[14px] font-bold text-black text-right pr-3">Overdue:</div>
                                <div className="text-[13.5px] text-black w-[100px] text-left">{formatMoney(overdueAmount)}</div>
                            </div>
                            <div className="flex justify-end items-center w-full">
                                <div className="text-[14px] font-bold text-black text-right pr-3">Not Yet Due:</div>
                                <div className="text-[13.5px] text-black w-[100px] text-left">{formatMoney(notYetDueAmount)}</div>
                            </div>
                            <div className="flex justify-end items-center w-fit ml-auto bg-[#f3f4f6] py-1 pl-3 pr-2 rounded-full mt-3">
                                <div className="text-[14.5px] font-bold text-black text-right pr-3">Outstanding Balance ({currency}):</div>
                                <div className="text-[14.5px] font-bold text-black w-[100px] text-left">{formatMoney(totalAmount)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mt-8">
                    <table className="w-full mb-2">
                        <thead>
                            <tr className="border-b border-gray-400 border-dotted font-serif">
                                <th className="text-left py-2 text-[14px] font-bold text-gray-900 w-[20%]">Invoice #</th>
                                <th className="text-center py-2 text-[14px] font-bold text-gray-900 w-[18%]">Invoice date</th>
                                <th className="text-center py-2 text-[14px] font-bold text-gray-900 w-[18%]">Due date</th>
                                <th className="text-right py-2 text-[14px] font-bold text-gray-900 w-[14%]">Total</th>
                                <th className="text-right py-2 text-[14px] font-bold text-gray-900 w-[14%]">Paid</th>
                                <th className="text-right py-2 text-[14px] font-bold text-gray-900 w-[16%]">Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-400">No outstanding invoices</td>
                                </tr>
                            ) : (
                                items.map((inv, i) => {
                                    const balance = inv.balanceDue ?? inv.total;
                                    const paid = inv.totalPaid ?? (inv.status === "Paid" ? inv.total : 0);
                                    const isOverdue = inv.dueDate && new Date(inv.dueDate) < today && balance > 0;

                                    const dateStr = inv.date ? formatDateDots(inv.date) : "";
                                    const dueStr = inv.dueDate ? formatDateDots(inv.dueDate) : "";

                                    return (
                                        <tr key={i} className="last:border-0 hover:bg-gray-50 transition-colors font-serif">
                                            <td className="py-2 pr-2 align-top">
                                                <div className="font-bold text-[14px] text-gray-900">
                                                    {inv.invoiceNumber?.replace(/Invoice\s+/i, "") || inv.id}
                                                </div>
                                            </td>
                                            <td className="py-2 text-center text-[13.5px] text-gray-900 align-top">{dateStr}</td>
                                            <td className="py-2 text-center text-[13.5px] text-gray-900 align-top">
                                                <div>{dueStr}</div>
                                                {isOverdue && (
                                                    <div className="text-[10px] text-[#ef4444] font-bold mt-0.5 tracking-wide uppercase">Overdue</div>
                                                )}
                                            </td>
                                            <td className="py-2 text-right text-[13.5px] text-gray-900 align-top">{formatMoney(inv.total)}</td>
                                            <td className="py-2 text-right text-[13.5px] text-gray-900 align-top">{formatMoney(paid)}</td>
                                            <td className="py-2 text-right text-[13.5px] text-gray-900 align-top font-bold">{formatMoney(balance)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Totals - Highlighted */}
                    <div className="flex justify-end border-t border-gray-300 pt-4 mb-12">
                        <div className="bg-[#f3f4f6] pl-4 pr-3 py-2 rounded-full flex items-center gap-3">
                            <span className="font-bold text-gray-900 text-[14.5px]">Outstanding Balance ({currency}):</span>
                            <span className="font-bold text-gray-900 text-[14.5px] w-[100px] text-left">{formatMoney(totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {activeModal === 'email' && (
                    <SendStatementModal
                        customerName={customer?.name}
                        totalAmount={formatCurrency(totalAmount, currency)}
                        customer={customer}
                        onClose={() => setActiveModal(null)}
                        onSend={handleSendEmail}
                    />
                )}
            </div>
        </div>
    );
}

function MailIcon({ size }: { size: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    );
}
