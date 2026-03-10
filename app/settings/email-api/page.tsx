"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Save, Mail, Eye, EyeOff, CheckCircle } from "lucide-react";
import { getEmailApiSettings, updateEmailApiSettings } from "@/app/actions/settings";
import { useToast } from "@/components/ui/ToastProvider";

export default function EmailApiPage() {
    const [zohoApiKey, setZohoApiKey] = useState("");
    const [zeptoMailUrl, setZeptoMailUrl] = useState("api.zeptomail.com/");
    const [zeptoMailSender, setZeptoMailSender] = useState("");
    const [zeptoMailWebhookSecret, setZeptoMailWebhookSecret] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [showWebhookSecret, setShowWebhookSecret] = useState(false);
    const toast = useToast();

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            const result = await getEmailApiSettings();
            if (result.success) {
                setZohoApiKey(result.data.zohoApiKey);
                if (result.data.zeptoMailUrl) setZeptoMailUrl(result.data.zeptoMailUrl);
                if (result.data.zeptoMailSender) setZeptoMailSender(result.data.zeptoMailSender);
                if (result.data.zeptoMailWebhookSecret) setZeptoMailWebhookSecret(result.data.zeptoMailWebhookSecret);
            }
            setLoading(false);
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const result = await updateEmailApiSettings({
            zohoApiKey: zohoApiKey.trim(),
            zeptoMailUrl: zeptoMailUrl.trim(),
            zeptoMailSender: zeptoMailSender.trim(),
            zeptoMailWebhookSecret: zeptoMailWebhookSecret.trim()
        });
        if (result.success) {
            toast.success("Email API settings saved successfully!");
        } else {
            toast.error(result.error || "Failed to save settings");
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-bg-surface rounded w-48" />
                    <div className="h-4 bg-bg-surface rounded w-72" />
                    <div className="h-48 bg-bg-surface rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Email API</h1>
                    <p className="text-text-muted mt-2">Configure your transactional email service.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            <Card className="p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Mail size={20} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-main">Zoho Transactional Email</h2>
                        <p className="text-sm text-text-muted">Used for sending invoices and reminders to customers.</p>
                    </div>
                </div>

                <div className="border-t border-border-subtle pt-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={zohoApiKey}
                                onChange={(e) => setZohoApiKey(e.target.value)}
                                placeholder="Paste your Zoho Transactional API key here..."
                                className="w-full border border-border-subtle rounded-lg px-4 py-3 pr-12 text-sm font-mono bg-bg-surface text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                                title={showKey ? "Hide API Key" : "Show API Key"}
                            >
                                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-2 ml-1">
                            Get your API key from{" "}
                            <a
                                href="https://zeptomail.zoho.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Zoho ZeptoMail
                            </a>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">
                            Webhook Secret
                        </label>
                        <div className="relative">
                            <input
                                type={showWebhookSecret ? "text" : "password"}
                                value={zeptoMailWebhookSecret}
                                onChange={(e) => setZeptoMailWebhookSecret(e.target.value)}
                                placeholder="Paste your Webhook Secret here..."
                                className="w-full border border-border-subtle rounded-lg px-4 py-3 pr-12 text-sm font-mono bg-bg-surface text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                                title={showWebhookSecret ? "Hide Secret" : "Show Secret"}
                            >
                                {showWebhookSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-2 ml-1">
                            Used to securely verify delivery tracking events (Opens, Clicks, Bounces).
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">
                            Host URL
                        </label>
                        <input
                            type="text"
                            value={zeptoMailUrl}
                            onChange={(e) => setZeptoMailUrl(e.target.value)}
                            placeholder="e.g. api.zeptomail.com/"
                            className="w-full border border-border-subtle rounded-lg px-4 py-3 text-sm font-mono bg-bg-surface text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all mb-4"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">
                            Sender Email Address
                        </label>
                        <input
                            type="email"
                            value={zeptoMailSender}
                            onChange={(e) => setZeptoMailSender(e.target.value)}
                            placeholder="e.g. billing@yourdomain.com"
                            className="w-full border border-border-subtle rounded-lg px-4 py-3 text-sm font-mono bg-bg-surface text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all mb-4"
                        />
                        <p className="text-xs text-text-muted mt-2 ml-1">
                            This is the address your clients will see the emails coming from. Must match your verified domain in ZeptoMail.
                        </p>
                    </div>

                    {zohoApiKey && zeptoMailUrl && zeptoMailSender && (
                        <div className="flex items-center gap-2 text-sm text-status-success bg-status-success/10 px-4 py-2.5 rounded-lg mt-4">
                            <CheckCircle size={16} />
                            <span>API settings are fully configured</span>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
