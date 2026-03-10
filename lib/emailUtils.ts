export interface EmailTemplateData {
    companyName: string;
    logoUrl?: string;
    invoiceId?: string;
    amount?: string;
    dueDate?: string;
    messageHtml: string;
    type?: 'invoice' | 'statement' | 'general' | 'receipt' | 'overdue';
    invoiceLink?: string;
    websiteUrl?: string;
    footerHtml?: string;
    headingHtml?: string;
}

/**
 * SEC-03 fix: Strip dangerous HTML from user-authored template content before
 * injecting into outbound emails. Removes script tags, on* event handlers,
 * and javascript: href values. Does NOT strip formatting tags (b, i, br, etc.).
 */
export function sanitizeEmailContent(html: string): string {
    return html
        // Remove <script> blocks and everything inside
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove <style> blocks
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove on* event handler attributes (onclick, onload, onerror, etc.)
        .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
        // Neutralise javascript: hrefs
        .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"')
        // Remove data: URIs in src (potential vector)
        .replace(/src\s*=\s*["']\s*data:[^"']*["']/gi, 'src=""');
}

export function buildInvoiceEmailHtml(data: EmailTemplateData): string {
    const {
        companyName,
        logoUrl,
        invoiceId,
        amount,
        dueDate,
        messageHtml: rawMessageHtml,
        type = 'invoice',
        invoiceLink = "#",
        websiteUrl = "",
        footerHtml: rawFooterHtml = "",
        headingHtml
    } = data;

    // SEC-03: sanitize user-authored content before embedding in email HTML
    const messageHtml = sanitizeEmailContent(rawMessageHtml);
    const footerHtml = sanitizeEmailContent(rawFooterHtml);

    const logoBlock = logoUrl
        ? `<img src="${logoUrl}" alt="${companyName} Logo" style="max-height: 48px; margin: 0 auto; display: block;" />`
        : '';

    let summaryBlock = '';
    if (type === 'invoice') {
        summaryBlock = `
        <div class="invoice-summary">
            <p class="summary-text">
                ${headingHtml || `Invoice for <strong>${amount}</strong> due by <strong>${dueDate}</strong>`}
            </p>
            <a href="${invoiceLink}" class="view-button">View Invoice</a>
        </div>`;
    } else if (type === 'statement') {
        summaryBlock = `
        <div class="invoice-summary">
            <p class="summary-text">
                ${headingHtml || `Account Statement for <strong>${companyName}</strong>`}
            </p>
            <div style="font-size: 24px; font-weight: 900; color: #6366f1; margin-bottom: 8px;">${amount}</div>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: #94a3b8; margin: 0;">Total Remaining Balance</p>
        </div>`;
    } else if (type === 'receipt') {
        summaryBlock = `
        <div class="invoice-summary" style="border-top: 2px solid #10b981; border-bottom: 2px solid #10b981; background-color: #f0fdf4;">
            <p class="summary-text" style="color: #10b981; font-weight: bold; margin-bottom: 8px;">
                ${headingHtml || `Payment Receipt`}
            </p>
            <div style="font-size: 28px; font-weight: 900; color: #022c22; margin-bottom: 8px;">${amount}</div>
            <p class="summary-text" style="color: #064e3b; margin-top: 10px;">
                Applied to Invoice <strong>${invoiceId}</strong>
            </p>
            <a href="${invoiceLink}" class="view-button" style="background-color: #10b981; color: white;">View Invoice</a>
        </div>`;
    } else if (type === 'overdue') {
        summaryBlock = `
        <div class="invoice-summary" style="border-top: 2px solid #ef4444; border-bottom: 2px solid #ef4444; background-color: #fef2f2;">
            <p class="summary-text" style="color: #ef4444; font-weight: bold; margin-bottom: 8px;">
                ${headingHtml || `Overdue Invoice`}
            </p>
            <div style="font-size: 28px; font-weight: 900; color: #7f1d1d; margin-bottom: 8px;">${amount}</div>
            <p class="summary-text" style="color: #991b1b; margin-top: 10px;">
                Due Date was <strong>${dueDate}</strong>
            </p>
            <a href="${invoiceLink}" class="view-button" style="background-color: #ef4444; color: white;">View Invoice</a>
        </div>`;
    }

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; }
    .container { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { text-align: center; margin-bottom: 30px; }
    .company-name { color: #475569; font-size: 26px; font-weight: 700; margin-top: 15px; margin-bottom: 0; }
    .invoice-summary { text-align: center; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 30px 0; margin-bottom: 30px; }
    .summary-text { color: #64748b; font-size: 16px; margin: 0 0 20px 0; }
    .summary-text strong { color: #334155; font-weight: 700; }
    .view-button { display: inline-block; background-color: #a5b4fc; color: #ffffff; font-weight: bold; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-size: 16px; }
    .email-body { font-size: 15px; color: #1e293b; line-height: 1.7; margin-bottom: 40px; }
    .footer { text-align: center; margin-top: 40px; border-top: 1px solid transparent; padding-top: 20px; color: #94a3b8; font-size: 13px; }
    .footer p { margin: 5px 0; }
    .footer-invoice-link { color: #a5b4fc; font-weight: bold; text-decoration: none; }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoUrl ? logoBlock : `<h1 class="company-name">${companyName}</h1>`}
        </div>
        
        ${summaryBlock}
        
        <div class="email-body">
            ${messageHtml}
        </div>
        
        <div class="footer" style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
            ${footerHtml ? `<div>${footerHtml}</div>` : ''}
            <p style="margin-top: 20px; font-size: 11px; color: #cbd5e1;">© ${new Date().getFullYear()} ${companyName}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}
