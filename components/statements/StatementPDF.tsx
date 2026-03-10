"use client";

import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Image } from "@react-pdf/renderer";
import { formatCurrency, formatDateDots, formatDateLong } from "@/lib/format";

Font.register({
    family: "Lora",
    fonts: [
        { src: "/fonts/Lora-Regular.ttf", fontWeight: 'normal' },
        { src: "/fonts/Lora-Bold.ttf", fontWeight: 'bold' },
        { src: "/fonts/Lora-Italic.ttf", fontStyle: 'italic' }
    ]
});

const styles = StyleSheet.create({
    page: {
        fontFamily: "Lora",
        fontSize: 10,
        color: "#000",
        padding: 40,
        borderWidth: 6,
        borderColor: "#ef4444",
        borderStyle: "solid",
        backgroundColor: "#ffffff",
    },
    brandSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24,
    },
    brandLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    logoWrapper: {
        marginBottom: 0,
    },
    companyDetails: {
        textAlign: "left",
        fontSize: 8.5,
        lineHeight: 1.6,
        marginTop: 0,
    },
    companyName: {
        fontSize: 12.5,
        fontWeight: "bold",
        fontFamily: "Lora",
        marginBottom: 20,
        color: "#000",
    },
    companyText: {
        fontSize: 9.5,
        color: "#374151",
        lineHeight: 1.6,
    },
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
        top: -2,
        lineHeight: 1,
    },
    midSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    titleRight: {
        alignItems: "flex-end",
        justifyContent: "flex-start",
        paddingTop: 10,
    },
    statementTitle: {
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "Lora",
        color: "#000",
        marginBottom: 2,
    },
    statementSubtitle: {
        fontSize: 11,
        fontFamily: "Lora",
        color: "#4b5563",
    },
    billToBlock: {
        flexDirection: "column",
        width: "50%",
        marginTop: 4,
    },
    billToLabel: {
        fontSize: 9,
        fontFamily: "Lora",
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 8,
        fontWeight: "bold",
    },
    clientName: {
        fontSize: 13,
        fontFamily: "Lora",
        fontWeight: "bold",
        marginBottom: 4,
        color: "#000",
    },
    clientText: {
        fontSize: 9.5,
        color: "#111827",
        marginBottom: 2,
    },
    summaryBlock: {
        flexDirection: "column",
        alignItems: "flex-end",
        width: "50%",
        marginTop: 10,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: 4,
        width: "100%",
    },
    summaryLabel: {
        fontSize: 10.5,
        fontFamily: "Lora",
        fontWeight: "bold",
        color: "#000",
        textAlign: "right",
        paddingRight: 10,
        flex: 1,
    },
    summaryValue: {
        fontSize: 10,
        color: "#000",
        textAlign: "left",
        width: 100,
    },
    amountDueBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: "#f3f4f6",
        paddingVertical: 4,
        paddingLeft: 8,
        paddingRight: 0,
        marginTop: 8,
        borderRadius: 12,
        width: "100%",
    },
    table: {
        width: "100%",
        marginBottom: 8,
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomStyle: "dotted",
        borderBottomColor: "#9ca3af",
        paddingBottom: 8,
        marginBottom: 8,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 8,
        alignItems: "flex-start",
    },
    colId: { width: "20%" },
    colDate: { width: "18%", textAlign: "center" },
    colDue: { width: "18%", textAlign: "center" },
    colTotal: { width: "14%", textAlign: "right" },
    colPaid: { width: "14%", textAlign: "right" },
    colBalance: { width: "16%", textAlign: "right" },

    headerText: {
        fontSize: 10.5,
        fontFamily: "Lora",
        fontWeight: "bold",
        color: "#111827",
    },
    cellText: {
        fontSize: 10,
        fontFamily: "Lora",
        color: "#111827",
    },
    invoiceLink: {
        fontSize: 10,
        fontFamily: "Lora",
        fontWeight: "bold",
        color: "#111827",
    },
    overdueText: {
        fontSize: 8,
        color: "#ef4444",
        fontWeight: "bold",
        marginTop: 2,
        textTransform: "uppercase",
        letterSpacing: 1,
    }
});

interface StatementItem {
    id: string;
    date: string;
    dueDate?: string | null;
    status: string;
    total: number;
    balanceDue?: number;
    items?: { serviceName: string }[];
    clientName?: string;
    invoiceNumber?: string;
}

interface StatementPDFProps {
    customerName: string;
    customerAddress?: string; // Optional for now
    customer?: any; // Contains full client information
    items: StatementItem[];
    totalAmount: number;
    currency?: string;
    companyDetails?: {
        name: string;
        email: string;
        phone?: string;
        address: string;
        website?: string;
        tinId?: string;
        logoUrl?: string;
    };
    type?: "outstanding" | "activity";
}

export default function StatementPDF({
    customerName,
    customerAddress = "",
    customer,
    items,
    totalAmount,
    currency = "USD",
    companyDetails = {
        name: "Blackfox Digital",
        address: "House 545/A, Road 11, Adabor\nDhaka 1207, Bangladesh",
        email: "billing@blackfox.com",
        website: "https://blackfoxdigital.com.bd",
        tinId: "5623936",
        logoUrl: "/invofox-logo.png"
    },
    type = "outstanding"
}: StatementPDFProps) {
    const todayFormatted = formatDateLong(new Date());
    const logoUrl = companyDetails.logoUrl || "";

    // Calculate Summary Stats
    const overdueAmount = items.reduce((sum, item) => {
        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.balanceDue! > 0;
        // In the screenshot there is a "Not yet due" and "Overdue". 
        // We really need to know if it is overdue.
        // For now, if status is NOT "Paid" and dueDate < today, it is overdue.
        if (isOverdue) return sum + (item.balanceDue ?? 0);
        return sum;
    }, 0);

    const notYetDueAmount = totalAmount - overdueAmount;

    const formatMoney = (amount: number) => {
        const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '';
        return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Top Section */}
                <View style={styles.brandSection}>
                    <View style={styles.brandLeft}>
                        {/* Logo */}
                        <View style={styles.logoWrapper}>
                            {logoUrl ? (
                                <Image
                                    src={logoUrl}
                                    style={{ width: 140, height: 50, objectFit: 'contain' }}
                                />
                            ) : (
                                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#ef4444", fontFamily: "Helvetica" }}>▲</Text>
                            )}
                        </View>
                        <View style={styles.companyDetails}>
                            <Text style={styles.companyName}>{companyDetails.name}</Text>
                            <Text style={styles.companyText}>{companyDetails.address}</Text>
                            {companyDetails.phone && <Text style={styles.companyText}>{companyDetails.phone}</Text>}
                            <Text style={styles.companyText}>{companyDetails.email}</Text>
                            {companyDetails.website && <Text style={styles.companyText}>{companyDetails.website}</Text>}
                            {companyDetails.tinId && <Text style={styles.companyText}>TIN: {companyDetails.tinId}</Text>}
                        </View>
                    </View>
                    <View style={styles.titleRight}>
                        <Text style={styles.statementTitle}>Statement of Account</Text>
                        <Text style={styles.statementSubtitle}>
                            {type === 'activity' ? "Account activity" : "Outstanding invoices"}
                        </Text>
                    </View>
                </View>

                {/* Mid Section */}
                <View style={styles.midSection}>
                    <View style={styles.billToBlock}>
                        <Text style={styles.billToLabel}>BILL TO</Text>
                        <Text style={styles.clientName}>{customer?.name || customerName}</Text>

                        {customer?.contactName && <Text style={styles.clientText}>{customer.contactName}</Text>}
                        {customer?.address && <Text style={styles.clientText}>{customer.address}</Text>}
                        {(customer?.city || customer?.state) && (
                            <Text style={styles.clientText}>{[customer.city, customer.state].filter(Boolean).join(" ")}</Text>
                        )}
                        {(customer?.zip || customer?.country) && (
                            <Text style={styles.clientText}>
                                {[
                                    customer.zip,
                                    customer.country
                                ].filter(Boolean).join(" ")}
                            </Text>
                        )}

                        <View style={{ marginTop: 4 }}>
                            {customer?.phone && <Text style={styles.clientText}>{customer.phone}</Text>}
                            {(customer?.contactEmail || customer?.email) && (
                                <Text style={styles.clientText}>{customer.contactEmail || customer.email}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.summaryBlock}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Statement Date:</Text>
                            <Text style={styles.summaryValue}>{todayFormatted}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Overdue:</Text>
                            <Text style={styles.summaryValue}>{formatMoney(overdueAmount)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Not Yet Due:</Text>
                            <Text style={styles.summaryValue}>{formatMoney(notYetDueAmount)}</Text>
                        </View>
                        <View style={styles.amountDueBox}>
                            <Text style={styles.summaryLabel}>Outstanding Balance ({currency}):</Text>
                            <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>{formatMoney(totalAmount)}</Text>
                        </View>
                    </View>
                </View>

                {/* Main Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, styles.colId]}>Invoice #</Text>
                        <Text style={[styles.headerText, styles.colDate]}>Invoice date</Text>
                        <Text style={[styles.headerText, styles.colDue]}>Due date</Text>
                        <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
                        <Text style={[styles.headerText, styles.colPaid]}>Paid</Text>
                        <Text style={[styles.headerText, styles.colBalance]}>Due</Text>
                    </View>

                    {items.map((item, i) => {
                        const dueAmount = item.balanceDue ?? item.total;
                        const paidAmount = item.total - dueAmount;
                        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && dueAmount > 0;

                        const dateStr = item.date ? formatDateDots(item.date) : "";
                        const dueStr = item.dueDate ? formatDateDots(item.dueDate) : "";

                        return (
                            <View key={i} style={styles.tableRow}>
                                <Text style={[styles.invoiceLink, styles.colId]}>{item.invoiceNumber?.replace(/Invoice\s+/i, "") || item.id}</Text>
                                <Text style={[styles.cellText, styles.colDate]}>
                                    {dateStr}
                                </Text>
                                <View style={styles.colDue}>
                                    <Text style={styles.cellText}>{dueStr}</Text>
                                    {isOverdue && (
                                        <Text style={styles.overdueText}>Overdue</Text>
                                    )}
                                </View>
                                <Text style={[styles.cellText, styles.colTotal]}>
                                    {formatMoney(item.total)}
                                </Text>
                                <Text style={[styles.cellText, styles.colPaid]}>
                                    {formatMoney(paidAmount)}
                                </Text>
                                <Text style={[styles.cellText, styles.colBalance, { fontWeight: 'bold' }]}>
                                    {formatMoney(dueAmount)}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Balance Footer Highlight */}
                <View style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 20,
                }}>
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#f3f4f6",
                        paddingVertical: 4,
                        paddingLeft: 12,
                        paddingRight: 0,
                        borderRadius: 12,
                    }}>
                        <Text style={{
                            fontSize: 8.5,
                            fontFamily: "Lora",
                            fontWeight: "bold",
                            textAlign: "right",
                            marginRight: 8
                        }}>
                            Outstanding Balance ({currency}):
                        </Text>
                        <Text style={{
                            fontSize: 8.5,
                            fontFamily: "Lora",
                            fontWeight: "bold",
                            width: 100,
                            textAlign: "left"
                        }}>
                            {formatMoney(totalAmount)}
                        </Text>
                    </View>
                </View>

            </Page>
        </Document >
    );
}

