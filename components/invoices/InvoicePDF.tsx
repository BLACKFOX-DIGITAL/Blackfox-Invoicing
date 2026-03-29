
"use client";

import { Document, Page, Text, View, StyleSheet, Image, Font, Svg, Path } from "@react-pdf/renderer";
import { formatDate, formatDateLong, formatDateDots } from "@/lib/format";
import { COUNTRIES } from "@/lib/constants/countries";

// Safe font registration
try {
    Font.register({
        family: "Lora",
        fonts: [
            { src: "/fonts/Lora-Regular.ttf", fontWeight: 'normal' },
            { src: "/fonts/Lora-Bold.ttf", fontWeight: 'bold' },
            { src: "/fonts/Lora-Italic.ttf", fontStyle: 'italic' }
        ]
    });
} catch (e) {
    console.warn("Font registration failed, using standard fonts:", e);
}

const styles = StyleSheet.create({
    page: {
        fontFamily: "Lora",
        fontSize: 10,
        color: "#000",
        lineHeight: 1.3,
        position: 'relative',
        paddingTop: 44,
        paddingLeft: 44,
        paddingRight: 44,
        paddingBottom: 60, // Reduced by another 10 to push the row items right up to the footer margin
        borderWidth: 6,
        borderColor: "#ef4444",
        borderStyle: "solid",
    },
    footerFixed: {
        position: 'absolute',
        top: 795, // Pushed right to the absolute limit matching user's request (total ~839 inside an 841 page)
        left: 0,
        right: 0,
        textAlign: 'center',
    },
    pageNumberText: {
        fontSize: 10,
        color: '#9ca3af',
    },
    container: {
        flex: 1,
        flexDirection: "column",
    },
    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24, // Tighter
    },
    logoSection: {
        width: "50%",
    },
    logoImage: {
        width: 195, // Scaled down by ~15% from 230 per request
        marginBottom: 8,
    },
    logoTextContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    logoIcon: {
        fontSize: 24, // Scaled down
        color: "#ef4444",
        marginRight: 8,
    },
    logoTitle: {
        fontSize: 27, // Scaled down
        fontFamily: "Lora",
        letterSpacing: 1,
    },
    logoSubtitle: {
        fontSize: 8.5, // Scaled down
        fontFamily: "Lora",
        letterSpacing: 4,
        color: "#6b7280",
        textTransform: "uppercase",
        marginLeft: 3,
    },
    companyDetails: {
        textAlign: "right",
        fontSize: 9,
        lineHeight: 1.6,
    },
    companyName: {
        fontSize: 12.5,
        fontFamily: "Lora",
        marginBottom: 20,
    },

    // Title Section
    titleSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 18,
        width: "100%",
    },
    lineGroup: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        gap: 3,
    },
    redLineHorizontal: {
        height: 1.5,
        backgroundColor: "#ef4444",
        width: "100%",
    },
    titleBoxOuter: {
        width: 114,
        height: 35,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 12,
    },
    titleSvg: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    titleText: {
        fontSize: 26,
        fontFamily: "Lora",
        color: "#ef4444",
        textAlign: "center",
        position: "relative",
        top: -4, // Move text higher to balance visual centering
        lineHeight: 1,
    },

    // Info Grid
    infoGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 14, // Reduced by 10 to shrink the gap specifically only on the very first page
        marginTop: 12,
    },
    billTo: {
        width: "50%",
        paddingRight: 24,
        flexDirection: "column",
    },
    billToLabel: {
        fontSize: 9,
        fontFamily: "Lora",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    clientName: {
        fontSize: 13,
        fontFamily: "Lora",
        marginBottom: 4,
    },
    clientDetails: {
        fontSize: 9.5,
        color: "#000",
        lineHeight: 1.3,
        marginBottom: 1,
    },

    // Invoice Meta
    invoiceMeta: {
        width: "50%",
        flexDirection: "column",
        alignItems: "flex-end",
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: 4,
        width: "100%",
    },
    metaLabel: {
        fontSize: 10.5,
        fontFamily: "Lora",
        color: "#000",
        textAlign: "right",
        paddingRight: 8,
        width: 130, // forced width
    },
    metaValue: {
        fontSize: 10,
        color: "#000",
        textAlign: "left",
        width: 100, // forced width
    },
    amountDueBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: "#f3f4f6", // rounded bg box
        paddingVertical: 5,
        paddingLeft: 6,
        paddingRight: 0, // Removes boundary shift
        marginTop: 6,
        borderRadius: 2,
        width: "100%",
        maxWidth: 240, // tightly aligns with rows
    },
    amountDueLabelText: {
        fontSize: 11,
        fontFamily: 'Lora',
        color: '#000',
        width: 130, // Matches exactly with metaLabel width
        textAlign: "right",
        paddingRight: 8,
    },
    amountDueValueText: {
        fontSize: 11,
        fontFamily: 'Lora',
        color: '#000',
        textAlign: "left",
        width: 100, // align with metaValue
    },

    // Table
    table: {
        width: "100%",
        marginBottom: 8,
    },
    tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomStyle: "dotted",
        borderBottomColor: "#9ca3af",
        paddingBottom: 6,
        marginBottom: 6,
        marginTop: 22, // Placed explicitly mapped breathing room above the Table Header on all pages
    },
    th: {
        fontSize: 10.5,
        fontFamily: "Lora",
        color: "#111827",
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 10,
    },
    colItem: { width: "60%", textAlign: "left" },
    colQty: { width: "10%", textAlign: "center" },
    colPrice: { width: "15%", textAlign: "right" },
    colAmount: { width: "15%", textAlign: "right" },

    itemName: {
        fontSize: 10.5,
        fontFamily: "Lora",
        color: "#111827",
    },
    itemDesc: {
        fontSize: 9,
        color: "#6b7280",
        marginTop: 1.5,
    },
    td: {
        fontSize: 10,
        color: "#111827",
    },

    // Totals
    totalsSection: {
        flexDirection: "row",
        justifyContent: "flex-end",
        borderTopWidth: 1,
        borderTopStyle: "solid",
        borderTopColor: "#d1d5db",
        paddingTop: 12,
        marginBottom: 8,
    },
    totalsContainer: {
        width: "50%",
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginBottom: 6,
    },
    totalLabel: {
        fontSize: 10.5,
        fontFamily: "Lora",
        color: "#374151",
        paddingRight: 24,
        textAlign: "right",
        flex: 1,
    },
    totalValue: {
        fontSize: 10.5,
        textAlign: "right",
        width: 100, // Fixed width
        color: "#111827",
    },

    // Footer
    footerContent: {
        marginTop: 8, // Let it flow naturally close to the totals
    },
    footerSection: {
        marginBottom: 16,
    },
    footerTitle: {
        fontSize: 10,
        fontFamily: "Lora",
        color: "#1f2937",
        marginBottom: 6,
    },
    footerText: {
        fontSize: 9.5,
        color: "#4b5563",
        lineHeight: 1.4,
    },
    paymentMethod: {
        fontSize: 9.5,
        color: "#4b5563",
        lineHeight: 1.4,
        marginBottom: 6,
    },
});

interface InvoiceItem {
    serviceName: string;
    quantity: number;
    rate: number;
    total: number;
    date?: string;
    description?: string;
}

interface Payment {
    date: string;
    method: string;
    amount: number;
}

interface InvoicePDFProps {
    invoice: {
        id: string;
        invoiceNumber?: string;
        clientName: string;
        clientCompany?: string;
        clientAddress?: string;
        clientTaxId?: string;
        clientEmail?: string;
        clientPhone?: string;
        date: string;
        dueDate?: string;
        total: number;
        subtotal?: number;
        discount?: number;
        discountType?: string;
        discountValue?: number;
        items: InvoiceItem[];
        totalPaid?: number;
        balanceDue?: number;
    };
    payments?: Payment[];
    customer?: {
        name: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        taxId?: string;
        contactName?: string;
        contactPerson?: string;
        contactEmail?: string;
        paymentMethodId?: number;
        paymentMethod?: {
            name: string;
            details: string;
        };
        currency?: string;
    };
    settings?: {
        companyName: string;
        email: string;
        phone?: string;
        address: string;
        website?: string;
        tinId?: string;
        currency?: string;
        logoUrl?: string;
        paymentMethods?: {
            id: number;
            type: string;
            name: string;
            details: string;
        }[];
    };
}

export default function InvoicePDF({ invoice, payments = [], customer, settings }: InvoicePDFProps) {
    const currency = customer?.currency || settings?.currency || "USD";
    const totalPaid = invoice.totalPaid ?? payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = invoice.balanceDue ?? (invoice.total - totalPaid);

    const formatCurrency = (amount: number) => {
        const symbolMap: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': '$', 'AUD': '$' };
        const symbol = symbolMap[currency] || '';
        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Prepare address strings. Prioritize invoice snapshot over current customer data.
    const clientAddressLines = invoice.clientAddress
        ? invoice.clientAddress.split('\n')
        : [
            customer?.address,
            [customer?.city, customer?.state].filter(Boolean).join(" "),
            [customer?.zip, customer?.country ? (COUNTRIES.find(c => c.code === customer.country)?.name || customer.country) : undefined].filter(Boolean).join(" ")
        ].filter(Boolean);

    const displayName = invoice.clientCompany || invoice.clientName || customer?.name;
    const displayTaxId = invoice.clientTaxId || customer?.taxId;

    return (
        <Document title={`Invoice-${invoice.id}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.container}>

                    {/* Header */}
                    <View style={styles.header} fixed>
                        <View style={styles.logoSection}>
                            {settings?.logoUrl ? (
                                <Image src={settings.logoUrl} style={styles.logoImage} />
                            ) : (
                                <View style={styles.logoTextContainer}>
                                    <Text style={styles.logoIcon}>▲</Text>
                                    <View>
                                        <Text style={styles.logoTitle}>{(settings?.companyName?.split(' ')[0] || "BLACKFOX").toUpperCase()}</Text>
                                        <Text style={styles.logoSubtitle}>{(settings?.companyName?.split(' ').slice(1).join(' ') || "Digital").toUpperCase()}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.companyDetails}>
                                <Text style={styles.companyName}>{settings?.companyName || "Blackfox Digital"}{"\n"}</Text>
                                {settings?.address || "House 545/A, Road 11, Adabor\nDhaka 1207, Bangladesh"}{"\n"}
                                {settings?.phone ? `${settings.phone}\n` : ""}
                                {settings?.email || "billing@blackfoxdigital.com.bd"}{"\n"}
                                {settings?.website || "www.blackfoxdigital.com.bd"}{"\n"}
                                {settings?.tinId ? `TIN: ${settings.tinId}` : ""}
                            </Text>
                        </View>
                    </View>

                    {/* Title Section */}
                    <View style={styles.titleSection} fixed>
                        <View style={styles.lineGroup}>
                            <View style={styles.redLineHorizontal} />
                            <View style={styles.redLineHorizontal} />
                        </View>
                        <View style={styles.titleBoxOuter}>
                            <Svg viewBox="0 0 168 52" width={114} height={35} style={styles.titleSvg}>
                                <Path d="M 14 2 L 154 2 A 12 12 0 0 0 166 14 L 166 38 A 12 12 0 0 0 154 50 L 14 50 A 12 12 0 0 0 2 38 L 2 14 A 12 12 0 0 0 14 2 Z" stroke="#ef4444" strokeWidth={2.2} fill="#ffffff" />
                                <Path d="M 16.7 5 L 151.3 5 A 15 15 0 0 0 163 16.7 L 163 35.3 A 15 15 0 0 0 151.3 47 L 16.7 47 A 15 15 0 0 0 5 35.3 L 5 16.7 A 15 15 0 0 0 16.7 5 Z" stroke="#ef4444" strokeWidth={2.2} fill="none" />
                            </Svg>
                            <Text style={styles.titleText}>Invoice</Text>
                        </View>
                        <View style={styles.lineGroup}>
                            <View style={styles.redLineHorizontal} />
                            <View style={styles.redLineHorizontal} />
                        </View>
                    </View>

                    {/* Info Grid */}
                    <View style={styles.infoGrid}>
                        <View style={styles.billTo}>
                            <Text style={styles.billToLabel}>BILL TO</Text>
                            <Text style={styles.clientName}>{displayName}</Text>
                            {customer?.contactName && !invoice.clientCompany && <Text style={styles.clientDetails}>{customer.contactName}</Text>}

                            <View style={{ flexDirection: 'column' }}>
                                {clientAddressLines.map((line, i) => (
                                    <Text key={i} style={styles.clientDetails}>{line}</Text>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'column', marginTop: 6 }}>
                                {displayTaxId && <Text style={styles.clientDetails}>{displayTaxId}</Text>}
                                {(invoice.clientPhone || (customer?.phone && !invoice.clientCompany)) && <Text style={styles.clientDetails}>{invoice.clientPhone || customer?.phone}</Text>}
                                {(invoice.clientEmail || ((customer?.contactEmail || customer?.email) && !invoice.clientCompany)) && <Text style={styles.clientDetails}>{invoice.clientEmail || customer?.contactEmail || customer?.email}</Text>}
                            </View>
                        </View>

                        <View style={styles.invoiceMeta}>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaLabel}>Invoice Number:</Text>
                                <Text style={styles.metaValue}>{invoice.invoiceNumber || invoice.id}</Text>
                            </View>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaLabel}>Invoice Date:</Text>
                                <Text style={styles.metaValue}>{formatDateLong(invoice.date)}</Text>
                            </View>
                            {invoice.dueDate && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Payment Due:</Text>
                                    <Text style={styles.metaValue}>{formatDateLong(invoice.dueDate)}</Text>
                                </View>
                            )}
                            <View style={styles.amountDueBox}>
                                <Text style={styles.amountDueLabelText}>Amount Due ({currency}):</Text>
                                <Text style={styles.amountDueValueText}>{formatCurrency(balanceDue)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Items Table */}
                    <View style={styles.table}>
                        <View style={styles.tableHeader} fixed>
                            <Text style={[styles.th, styles.colItem]}>Items</Text>
                            <Text style={[styles.th, styles.colQty]}>Quantity</Text>
                            <Text style={[styles.th, styles.colPrice]}>Price</Text>
                            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
                        </View>
                        {invoice.items.length === 0 ? (
                            <Text style={{ textAlign: "center", fontStyle: "italic", padding: 20, color: "#999" }}>No line items</Text>
                        ) : (
                            invoice.items.map((item, idx) => {
                                const dateStr = formatDateDots(item.date);
                                const descriptionParts = [
                                    dateStr ? `Dated - ${dateStr}` : null,
                                    item.description
                                ].filter(Boolean);

                                return (
                                    <View key={idx} style={styles.tableRow} wrap={false}>
                                        <View style={styles.colItem}>
                                            <Text style={styles.itemName}>{item.serviceName || "Service"}</Text>
                                            {descriptionParts.length > 0 && (
                                                <Text style={styles.itemDesc}>{descriptionParts.join(" | ")}</Text>
                                            )}
                                        </View>
                                        <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
                                        <Text style={[styles.td, styles.colPrice]}>{formatCurrency(item.rate)}</Text>
                                        <Text style={[styles.td, styles.colAmount]}>{formatCurrency(item.total)}</Text>
                                    </View>
                                );
                            })
                        )}
                        {/* Spacer to push content if needed */}
                    </View>

                    {/* Totals Section */}
                    <View style={styles.totalsSection}>
                        <View style={styles.totalsContainer}>
                            {Number(invoice.discount) > 0 && (
                                <>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Subtotal:</Text>
                                        <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal || 0)}</Text>
                                    </View>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Discount ({invoice.discountType === 'percentage' ? `${Number(invoice.discountValue)}%` : 'Fixed'}):</Text>
                                        <Text style={styles.totalValue}>-{formatCurrency(invoice.discount || 0)}</Text>
                                    </View>
                                    {/* Divider */}
                                    <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 4 }} />
                                </>
                            )}
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total:</Text>
                                <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
                            </View>

                            {payments && payments.length > 0 && payments.map((payment: any, idx: number) => (
                                <View key={`payment-${idx}`} style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Payment on {formatDateLong(payment.date)}:</Text>
                                    <Text style={styles.totalValue}>{formatCurrency(payment.amount)}</Text>
                                </View>
                            ))}

                            <View style={{ height: 1, backgroundColor: "#e5e7eb", marginTop: 8, marginBottom: 8 }} />

                            <View style={styles.totalRow}>
                                <Text style={[styles.totalLabel, { color: "#111827", fontSize: 11 }]}>Amount Due ({currency}):</Text>
                                <Text style={[styles.totalValue, { fontFamily: "Lora", fontWeight: "bold", fontSize: 11 }]}>{formatCurrency(balanceDue)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footerContent}>
                        <View style={styles.footerSection}>
                            <Text style={styles.footerTitle}>Notes / Terms</Text>
                            <Text style={styles.footerText}>
                                •• Thank you for your business. Please pay all dues as soon as possible. We at {settings?.companyName || "Blackfox Digital"} will always be there to provide you with the best possible service. If you have any query, please feel free to inform us.
                            </Text>
                        </View>

                        <View style={styles.footerSection}>
                            <Text style={[styles.footerText, { marginBottom: 4 }]}>Please make your payment in the following account:</Text>

                            {customer?.paymentMethod ? (
                                <Text style={styles.paymentMethod}>{customer.paymentMethod.details}</Text>
                            ) : settings?.paymentMethods && settings.paymentMethods.length > 0 ? (
                                settings.paymentMethods.map((pm, i) => (
                                    <Text key={i} style={styles.paymentMethod}>{pm.details}</Text>
                                ))
                            ) : (
                                <Text style={[styles.footerText, { fontStyle: "italic", color: "#9ca3af" }]}>No payment details available.</Text>
                            )}

                            <Text style={[styles.footerText, { marginTop: 12 }]}>
                                If you face any other problems making payments, please let us know. We will be happy to help with alternative options. Thank you.
                            </Text>
                        </View>
                    </View>

                </View>

                {/* Fixed bottom footer safely rendered last with absolute top-down math */}
                <View style={styles.footerFixed} fixed>
                    <Text style={styles.pageNumberText} render={({ pageNumber, totalPages }) => (
                        `Page ${pageNumber} of ${totalPages} for Invoice #${invoice.invoiceNumber || invoice.id}`
                    )} />
                </View>
            </Page>
        </Document>
    );
}
