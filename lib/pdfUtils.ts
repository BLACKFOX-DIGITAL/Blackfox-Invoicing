import { pdf } from "@react-pdf/renderer";

/**
 * Helper to fetch a logo URL and convert it to a Base64 string.
 * This ensures reliable rendering of images in react-pdf.
 */
export async function fetchLogoBase64(logoUrl: string): Promise<string | null> {
    if (!logoUrl) return null;

    try {
        const fullUrl = logoUrl.startsWith('/') && typeof window !== 'undefined'
            ? `${window.location.origin}${logoUrl}`
            : logoUrl;

        // Use a controller with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(fullUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`Logo fetch failed with status: ${response.status}`);
            if (logoUrl !== '/logo.png') return fetchLogoBase64('/logo.png');
            return null;
        }

        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to load logo for PDF, trying fallback:", e);
        // Fallback to static logo if the dynamic one fails
        if (logoUrl !== '/logo.png') {
            return fetchLogoBase64('/logo.png');
        }
        return null;
    }
}
