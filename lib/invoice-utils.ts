import { Decimal } from "decimal.js";

/**
 * Calculates the current status and overdue days for an invoice.
 */
export function calculateInvoiceStatus(invoice: {
    status: string;
    date: Date;
    dueDate: Date | null;
    total: Decimal | number;
    totalPaid: Decimal | number;
}) {
    let status = invoice.status;
    let overdueDays = 0;

    // Skip check for Paid, Void, Cancelled, or Draft
    if (status !== 'Paid' && status !== 'Draft' && status !== 'Cancelled' && status !== 'Void') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fallback to 14 days if no dueDate is set
        const dueDate = invoice.dueDate || new Date(new Date(invoice.date).getTime() + 14 * 24 * 60 * 60 * 1000);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        if (due < today) {
            status = 'Overdue';
            const diffTime = today.getTime() - due.getTime();
            overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
    }

    return { status, overdueDays };
}

/**
 * Validates role-based access.
 * Returns true if the user's role is in the allowed list.
 */
export function isAuthorized(userRole: string | undefined, allowedRoles: string[]) {
    if (!userRole) return false;
    return allowedRoles.includes(userRole);
}
