import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind conflict resolution.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
export function getCurrencySymbol(currency: string = "USD"): string {
    try {
        return (0).toLocaleString(undefined, {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).replace(/\d/g, "").trim();
    } catch (e) {
        if (currency === "USD") return "$";
        if (currency === "৳ BDT" || currency === "BDT") return "৳";
        return currency;
    }
}
