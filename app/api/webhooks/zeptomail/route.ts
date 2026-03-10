import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();

        // Parse the Producer-Signature header sent by ZeptoMail.
        // Format: "ts=<timestamp>;s=<url-encoded-base64-hmac>;s-algorithm=HmacSHA256"
        let headerTs: string | null = req.headers.get("ts");
        let headerS: string | null = req.headers.get("s");

        const producerSig = req.headers.get("producer-signature");
        if (producerSig) {
            const parts = producerSig.split(';');
            parts.forEach(part => {
                const eqIdx = part.indexOf('=');
                if (eqIdx === -1) return;
                const key = part.substring(0, eqIdx).trim();
                const value = part.substring(eqIdx + 1).trim();
                if (key === 'ts') headerTs = value;
                if (key === 's') headerS = decodeURIComponent(value);
            });
        }

        // Require a configured webhook secret — fail closed.
        const settings = await prisma.settings.findFirst({ select: { zeptoMailWebhookSecret: true } as any });
        const webhookSecret = (settings as any)?.zeptoMailWebhookSecret || process.env.ZEPTOMAIL_WEBHOOK_SECRET;

        if (!webhookSecret) {
            // No secret configured — accept but don't process (avoids breaking unset deployments).
            return NextResponse.json({ error: "Webhook not configured" }, { status: 200 });
        }

        // Verify HMAC-SHA256 signature.
        if (!headerTs || !headerS) {
            return NextResponse.json({ error: "Missing Signature Headers" }, { status: 200 });
        }

        // Replay-attack protection: reject requests with a stale timestamp (> 5 minutes).
        const tsNum = parseInt(headerTs, 10);
        const nowSec = Math.floor(Date.now() / 1000);
        if (isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
            return NextResponse.json({ error: "Request expired" }, { status: 200 });
        }

        const hmac = crypto.createHmac("sha256", webhookSecret);
        const computedSignature = hmac.update(headerTs + rawBody).digest("base64");

        if (computedSignature !== headerS) {
            // Do not reveal signature details in logs (info leak risk).
            if (process.env.NODE_ENV === "development") {
                console.warn("[Webhook] Signature mismatch — possible misconfigured secret or spoofed request.");
            }
            return NextResponse.json({ error: "Invalid Signature" }, { status: 200 });
        }

        // Parse body and extract events.
        const body = JSON.parse(rawBody);

        let events: any[] = [];
        if (body.event_message && Array.isArray(body.event_message)) {
            events = body.event_message;
        } else if (Array.isArray(body)) {
            events = body;
        } else {
            events = [body];
        }

        for (const event of events) {
            // The message ID can live at the root of the event object.
            const messageId = event.request_id || event.message_id || event.messageId;

            // Event type comes from the top-level event_name array or the event_data object.
            let eventType: string | undefined = body.event_name?.[0] || event.object || event.event;
            if (!eventType && event.event_data?.[0]) {
                eventType = event.event_data[0].object || event.event_data[0].event;
            }

            if (!messageId || !eventType) continue;

            // Map ZeptoMail event type strings to our status values.
            const checkType = eventType.toLowerCase();
            let newStatus = "";

            switch (checkType) {
                case "open":
                case "email_opened":
                case "email_open":
                    newStatus = "Opened";
                    break;
                case "click":
                case "email_clicked":
                case "email_click":
                case "email_link_click":
                case "link_click":
                    newStatus = "Clicked";
                    break;
                case "hardbounce":
                case "softbounce":
                case "bounce":
                case "email_bounced":
                case "email_bounce":
                    newStatus = "Bounced";
                    break;
                case "delivery":
                case "delivered":
                case "email_delivered":
                    newStatus = "Delivered";
                    break;
                default:
                    continue; // Silently ignore unknown events.
            }

            await prisma.emailLog.updateMany({
                where: { messageId },
                data: { status: newStatus }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[Webhook] Processing error:", error.message);
        return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 200 });
    }
}
