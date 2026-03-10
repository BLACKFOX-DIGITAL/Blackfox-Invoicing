"use client";

import { getCurrencySymbol, formatDateLong, formatDateDots } from "@/lib/format";
import Image from "next/image";
import { COUNTRIES } from "@/lib/constants/countries";
import dynamic from "next/dynamic";
import { Download, CreditCard, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";

// Dynamic import for PDF download without SSR
const InvoiceDownloadButton = dynamic(
    () => import("@/components/invoices/InvoiceDownloadButton"),
    { ssr: false, loading: () => <Button variant="secondary" disabled>Loading PDF...</Button> }
);

interface PublicInvoiceDetailContentProps {
    invoice: any;
    items: any[];
    customer?: any;
    settings?: any;
}

export default function PublicInvoiceDetailContent({
    invoice,
    items,
    customer,
    settings
}: PublicInvoiceDetailContentProps) {

    // Default Company Info from Settings
    const companyName = settings?.companyName || "Your Company";
    const companyAddress = settings?.address || "House 545/A, Road 11, Adabor\nDhaka 1207, Bangladesh";
    const companyEmail = settings?.email || "billing@blackfoxdigital.com.bd";
    const logoUrl = settings?.logoUrl || "";

    const formatCurrency = (val: any) => {
        const globalCurrency = settings?.currency || "USD";
        const currency = customer?.currency || globalCurrency;
        const symbol = getCurrencySymbol(currency);

        let amount = val;
        if (typeof val === 'string') {
            amount = parseFloat(val.replace(/[^0-9.-]/g, ''));
        }
        if (typeof amount !== 'number' || isNaN(amount)) {
            amount = 0;
        }

        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 print:hidden mb-4">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Invoice #{invoice.id}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">From {companyName}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <InvoiceDownloadButton
                        invoice={{
                            ...invoice,
                            // Ensure data maps properly to PDF generator
                            clientCompany: invoice.clientCompany,
                            clientAddress: invoice.clientAddress,
                            clientTaxId: invoice.clientTaxId,
                            clientEmail: invoice.clientEmail,
                            clientPhone: invoice.clientPhone,
                            items: items.map(item => ({
                                serviceName: item.serviceName || item.service || "Service",
                                quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
                                rate: typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate,
                                total: typeof item.total === 'string' ? parseFloat(item.total) : item.total,
                                date: item.date,
                                description: item.description
                            }))
                        }}
                        payments={invoice.payments || []}
                        customer={customer}
                        settings={settings}
                        className="flex items-center gap-2"
                    >
                        <div className="flex items-center gap-2">
                            <Download size={16} /> Download PDF
                        </div>
                    </InvoiceDownloadButton>
                </div>
            </div>

            {invoice.status === "Paid" && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-center justify-center gap-2 print:hidden font-medium">
                    <CheckCircle className="text-green-600" size={20} />
                    This invoice has been fully paid. Thank you!
                </div>
            )}

            {/* BLACKFOX Invoice Document Design (Copied from main app) */}
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
                        <div className="mb-1">{companyEmail}</div>
                        <div className="text-gray-600 mb-1">{settings?.website}</div>
                        {settings?.tinId && <div className="text-gray-600">TIN: {settings.tinId}</div>}
                    </div>
                </div>

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
                <div className="flex justify-between mb-12 mt-8">
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
                    <div className="w-[45%] flex flex-col items-end">
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
                                <div className="text-sm font-bold text-black w-[120px] text-left">{formatCurrency(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.total)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-2">
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
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end border-t border-gray-300 pt-4 mb-12">
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
                </div>

                {/* Footer Section */}
                <div className="mt-auto">
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
                </div>

            </div>
        </div>
    );
}
