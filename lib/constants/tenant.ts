/**
 * Tenant Configuration
 *
 * These constants identify the two organizations in this multi-tenant deployment.
 * Override them via environment variables in your .env file for a new deployment.
 *
 * PRIMARY_COMPANY  — the main internal organization (default: "blackfox")
 * VENDOR_COMPANY   — the vendor/partner organization  (default: "frameit")
 */
export const PRIMARY_COMPANY = process.env.PRIMARY_COMPANY || "blackfox";
export const VENDOR_COMPANY = process.env.VENDOR_COMPANY || "frameit";
