import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { formatDate, numberToWords } from "@/lib/format";

// Register fonts if needed, or use defaults
// For a professional letter, standard fonts work.

const styles = StyleSheet.create({
    page: {
        paddingTop: 16,
        paddingBottom: 60,
        paddingHorizontal: 44,
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#000",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end", // align bottom so date is on line with bottom of logo
        marginBottom: 10,
    },
    logoSection: {
        width: "50%",
    },
    logo: {
        width: 130, // Make logo slightly smaller to eliminate extra space
        height: "auto",
    },
    companyDetails: {
        textAlign: "right",
        fontSize: 9,
        lineHeight: 1.4,
    },
    companyName: {
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 10,
    },
    dateLine: {
        textAlign: "right",
        marginBottom: 5,
    },
    recipientHeader: {
        marginBottom: 5,
        lineHeight: 1,
    },
    recipientLine: {
        marginBottom: -2,
    },
    subject: {
        fontWeight: "bold",
        marginBottom: 5,
    },
    salutation: {
        marginBottom: 5,
    },
    bodyText: {
        lineHeight: 0.95,
        marginBottom: 5,
    },
    table: {
        width: "auto",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#000",
        marginBottom: 10,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: "#000",
    },
    tableHeader: {
        backgroundColor: "#f0f0f0",
        fontWeight: "bold",
    },
    tableCell: {
        paddingVertical: 2,
        paddingHorizontal: 5,
        borderRightWidth: 1,
        borderColor: "#000",
    },
    cellSl: { width: "10%", textAlign: "center" },
    cellName: { width: "45%" },
    cellAcc: { width: "25%", textAlign: "center" },
    cellAmount: { width: "20%", borderRightWidth: 0, textAlign: "right" },

    totalRow: {
        flexDirection: "row",
        backgroundColor: "#ccc",
        fontWeight: "bold",
    },
    totalLabel: {
        width: "80%",
        paddingVertical: 3,
        paddingHorizontal: 5,
        textAlign: "center",
        borderRightWidth: 1,
        borderColor: "#000",
    },
    totalAmount: {
        width: "20%",
        paddingVertical: 3,
        paddingHorizontal: 5,
        textAlign: "right",
    },
    inWord: {
        fontWeight: "bold",
        marginBottom: 40,
    },
    footerSignature: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 40,
    },
    sigLine: {
        borderTopWidth: 1,
        width: 150,
        paddingTop: 5,
        textAlign: "center",
        height: 20,
    },
    footerContact: {
        position: "absolute",
        bottom: 30,
        left: 44,
        right: 44,
        borderTopWidth: 0.5,
        borderColor: "#ccc",
        paddingTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        fontSize: 8,
        color: "#666",
        lineHeight: 1.4,
    }
});

interface BankTransferLetterProps {
    companyName: string;
    bankName: string;
    branchName: string;
    companyAccNo: string;
    sourceAccName: string;
    debitBranch: string;
    month: string;
    year: number;
    records: any[];
    logoUrl?: string | null;
    companyAddress?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyEmail?: string;
}

export default function BankTransferLetter({
    companyName,
    bankName,
    branchName,
    companyAccNo,
    sourceAccName,
    debitBranch,
    month,
    year,
    records,
    logoUrl,
    companyAddress,
    companyPhone,
    companyWebsite,
    companyEmail
}: BankTransferLetterProps) {
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.netSalary) || 0), 0);
    const dateStr = formatDate(new Date());

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Section with Date on the right */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        {logoUrl && <Image src={logoUrl} style={styles.logo} />}
                    </View>
                    <View style={styles.dateLine}>
                        <Text>Date: {dateStr}</Text>
                    </View>
                </View>

                <View style={styles.recipientHeader}>
                    <Text style={styles.recipientLine}>To</Text>
                    <Text style={styles.recipientLine}>The Branch Manager</Text>
                    <Text style={styles.recipientLine}>{bankName} Limited</Text>
                    <Text style={styles.recipientLine}>{branchName}</Text>
                </View>


                <View style={styles.subject}>
                    <Text>Subject: Employee Salary transfer letter for the month of {month} {year}</Text>
                </View>

                <View style={styles.salutation}>
                    <Text>Dear Sir/Madam,</Text>
                </View>

                <View style={styles.bodyText}>
                    <Text>
                        We, {sourceAccName} request you to kindly transfer the salaries of the following employees into their respective bank accounts by debiting from our account bearing a/c no. {companyAccNo}, {bankName}, {debitBranch}.
                    </Text>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={[styles.tableCell, styles.cellSl, { textAlign: "center" }]}><Text>Sl</Text></View>
                        <View style={[styles.tableCell, styles.cellName, { textAlign: "center" }]}><Text>Name</Text></View>
                        <View style={[styles.tableCell, styles.cellAcc, { textAlign: "center" }]}><Text>Acc No</Text></View>
                        <View style={[styles.tableCell, styles.cellAmount, { textAlign: "center" }]}><Text>Amount</Text></View>
                    </View>

                    {records.map((r, i) => (
                        <View key={i} style={styles.tableRow}>
                            <View style={[styles.tableCell, styles.cellSl]}><Text>{i + 1}</Text></View>
                            <View style={[styles.tableCell, styles.cellName]}><Text>{r.employee.firstName} {r.employee.lastName}</Text></View>
                            <View style={[styles.tableCell, styles.cellAcc]}><Text>{r.employee.bankAccountNo || "-"}</Text></View>
                            <View style={[styles.tableCell, styles.cellAmount]}><Text>{Number(r.netSalary).toLocaleString()}</Text></View>
                        </View>
                    ))}

                    <View style={styles.totalRow}>
                        <View style={styles.totalLabel}><Text>Total Amount</Text></View>
                        <View style={styles.totalAmount}><Text>{totalAmount.toLocaleString()}</Text></View>
                    </View>
                </View>

                <View style={styles.inWord}>
                    <Text>In Word: {numberToWords(totalAmount)}</Text>
                </View>

                <View style={styles.footerSignature}>
                    <View style={styles.sigLine}></View>
                    <View style={styles.sigLine}></View>
                </View>

                {/* Footer Contact Details */}
                <View style={styles.footerContact}>
                    {/* Left: Address */}
                    <View style={{ width: "38%", flexDirection: "row" }}>
                        <Text style={{ fontWeight: "bold" }}>Address: </Text>
                        <View style={{ flex: 1 }}>
                            {companyAddress?.split('\n').map((line, i) => (
                                <Text key={i}>{line}</Text>
                            ))}
                        </View>
                    </View>

                    <Text style={{ marginHorizontal: 5 }}>|</Text>

                    {/* Middle: Phone Number */}
                    <View style={{ width: "25%", textAlign: "center", flexDirection: "row", justifyContent: "center" }}>
                        <Text style={{ fontWeight: "bold" }}>Phone: </Text>
                        <Text>{companyPhone}</Text>
                    </View>

                    <Text style={{ marginHorizontal: 5 }}>|</Text>

                    {/* Right: Email and Website */}
                    <View style={{ width: "32%", textAlign: "right" }}>
                        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                            <Text style={{ fontWeight: "bold" }}>Email: </Text>
                            <Text>{companyEmail}</Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                            <Text style={{ fontWeight: "bold" }}>Website: </Text>
                            <Text>{companyWebsite}</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
