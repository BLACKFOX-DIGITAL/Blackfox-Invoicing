export const PAYMENT_METHODS = [
    "Bank Transfer",
    "PayPal",
    "Credit Card",
    "Cash",
    "Cheque",
    "Other"
] as const;

export type PaymentMethodType = typeof PAYMENT_METHODS[number];
