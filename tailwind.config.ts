import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: "var(--primary, #475569)",
                "primary-hover": "var(--primary-hover, #334155)",
                "text-main": "var(--text-main, #343B41)",
                "text-muted": "var(--text-muted, #64748b)",
                "bg-app": "var(--bg-app, #f8fafc)",
                "bg-sidebar": "var(--bg-sidebar, #ffffff)",
                "bg-surface": "var(--bg-surface, #f1f5f9)",
                "bg-card": "var(--bg-card, #ffffff)",
                "bg-surface-hover": "var(--bg-surface-hover, #e2e8f0)",
                "border-subtle": "var(--border-subtle, #cbd5e1)",
                "status-success": "var(--status-success, #10b981)",
                "status-warning": "var(--status-warning, #f59e0b)",
                "status-error": "var(--status-error, #ef4444)",
                accent: "var(--accent, #343B41)",
            },
            borderRadius: {
                sm: "var(--radius-sm)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                xl: "var(--radius-xl)",
            }
        },
    },
    plugins: [],
};
export default config;
