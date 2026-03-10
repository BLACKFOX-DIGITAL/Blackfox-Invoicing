import { Decimal } from "@prisma/client/runtime/library";

export function getCurrencySymbol(currencyCode: string): string {
    const code = currencyCode.toUpperCase();
    switch (code) {
        case 'USD':
        case 'CAD':
        case 'AUD':
        case 'MXN':
            return '$';
        case 'EUR':
            return '€';
        case 'GBP':
            return '£';
        case 'JPY':
        case 'CNY':
            return '¥';
        case 'INR':
            return '₹';
        case 'BDT':
        case '৳ BDT':
            return '৳';
        default:
            return code; // Fallback to code if symbol unknown or same as code
    }
}

/**
 * Standardizes how customers are displayed throughout the application UI.
 * Rules:
 * - Always show Customer ID
 * - Never show Customer Name (except in specific exempted contexts like legal documents)
 */
// QA-11 fix: removed dead 'name' property — function never used it
export function formatContactName(first?: string | null, middle?: string | null, last?: string | null): string {
    return [first, middle, last].filter(Boolean).join(" ");
}

export function formatCustomerDisplay(customer: { id: string | number } | null | undefined): string {
    if (!customer) return "";
    return customer.id.toString();
}

/**
 * Sorts array of customers sequentially by ID (from lowest number to highest number).
 */
export function sortCustomers<T extends { id: string | number }>(customers: T[]): T[] {
    if (!customers || !Array.isArray(customers)) return [];
    return [...customers].sort((a, b) =>
        String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
    );
}

/**
 * Formats a date string or object into "dd/mm/yyyy" format.
 * Safe for YYYY-MM-DD and DD/MM/YYYY strings.
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "";

    // 1. Handle YYYY-MM-DD
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year}`;
    }

    // 2. Handle DD/MM/YYYY (Already formatted? Just return it or ensure parts are correct)
    if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        return date;
    }

    // 3. Fallback for Date objects or ISO strings
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formats a date into "Month DD, YYYY" format (e.g., February 02, 2026).
 */
export function formatDateLong(date: string | Date | null | undefined): string {
    if (!date) return "";

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let d: Date;

    if (typeof date === 'string') {
        // Handle YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-').map(Number);
            d = new Date(year, month - 1, day);
        }
        // Handle DD/MM/YYYY
        else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            const [day, month, year] = date.split('/').map(Number);
            d = new Date(year, month - 1, day);
        }
        // Handle ISO or other string
        else {
            d = new Date(date);
        }
    } else {
        d = new Date(date);
    }

    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return `${month} ${day}, ${year}`;
}

/**
 * Formats a date into "DD.MM.YYYY" format (e.g., 30.12.2025).
 */
export function formatDateDots(date: string | Date | null | undefined): string {
    if (!date) return "";

    let d: Date;

    if (typeof date === 'string') {
        // Handle YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-').map(Number);
            d = new Date(year, month - 1, day);
        }
        // Handle DD/MM/YYYY
        else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            const [day, month, year] = date.split('/').map(Number);
            d = new Date(year, month - 1, day);
        }
        // Handle ISO or other string
        else {
            d = new Date(date);
        }
    } else {
        d = new Date(date);
    }

    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
}

/**
 * Formats a number as a currency string.
 */
export function formatCurrency(amount: number | string | Decimal, currencyCode: string = 'USD'): string {
    const numericAmount = typeof amount === 'object' && 'toNumber' in amount ? amount.toNumber() : Number(amount);
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a Date into a chart-friendly period label based on groupBy setting.
 * Used by revenue and work volume series reports.
 */
export function formatPeriodLabel(date: Date, groupBy: "day" | "week" | "month"): string {
    if (groupBy === "day") return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (groupBy === "week") {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
/**
 * Converts a number to words using the South Asian numbering system (Lakh/Crore).
 */
export function numberToWords(num: number): string {
    if (num === 0) return "Zero";

    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const formatThreeDigit = (n: number) => {
        let str = "";
        if (n >= 100) {
            str += a[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n > 19) {
            str += b[Math.floor(n / 10)] + " " + a[n % 10];
        } else {
            str += a[n];
        }
        return str.trim();
    };

    let result = "";

    // Crore
    if (num >= 10000000) {
        result += formatThreeDigit(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
    }

    // Lakh
    if (num >= 100000) {
        result += formatThreeDigit(Math.floor(num / 100000)) + " Lac ";
        num %= 100000;
    }

    // Thousand
    if (num >= 1000) {
        result += formatThreeDigit(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
    }

    // Hundreds
    result += formatThreeDigit(num);

    return result.trim().replace(/\s+/g, ' ') + " Taka Only";
}
