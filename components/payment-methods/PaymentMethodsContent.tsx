"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Save } from "lucide-react";
import PaymentSettings from "@/components/settings/PaymentSettings";
import { getSettings, updateSettings } from "@/app/actions/settings";
import { useToast } from "@/components/ui/ToastProvider";

const DEFAULT_SETTINGS = {
    paymentMethods: [] as { id: number; name: string; type: string; details: string }[]
};

export default function PaymentMethodsContent() {
    const [formData, setFormData] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const toast = useToast();

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            const result = await getSettings();
            if (result.success && result.data) {
                setFormData(prev => ({ ...prev, paymentMethods: result.data.paymentMethods || [] }));
            }
            setLoading(false);
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);

        const result = await updateSettings({
            paymentMethods: formData.paymentMethods
        });

        if (result.success) {
            // Re-fetch to get real database IDs for new methods
            const updated = await getSettings();
            if (updated.success && updated.data) {
                setFormData(prev => ({ ...prev, paymentMethods: updated.data.paymentMethods || [] }));
            }
            toast.success("Changes saved successfully!");
            setHasChanges(false);
        } else {
            toast.error("Failed to save: " + result.error);
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center text-text-muted">Loading payment methods...</div>;
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Payment Methods</h1>
                    <p className="text-text-muted mt-2">Manage the payment options available to your customers.</p>
                </div>
                <div className="flex items-center gap-4">
                    {hasChanges && (
                        <span className="text-sm font-medium text-amber-500 animate-pulse">
                            Unsaved Changes
                        </span>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                        <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PaymentSettings
                    methods={formData.paymentMethods || []}
                    onAdd={(newMethod) => {
                        setFormData(prev => ({
                            ...prev,
                            paymentMethods: [...(prev.paymentMethods || []), { ...newMethod, id: -Date.now() }]
                        }));
                        setHasChanges(true);
                    }}
                    onEdit={(updatedMethod) => {
                        setFormData(prev => ({
                            ...prev,
                            paymentMethods: prev.paymentMethods.map(m =>
                                m.id === updatedMethod.id ? updatedMethod : m
                            )
                        }));
                        setHasChanges(true);
                    }}
                    onDelete={(id) => {
                        setFormData(prev => ({
                            ...prev,
                            paymentMethods: prev.paymentMethods.filter(m => m.id !== id)
                        }));
                        setHasChanges(true);
                    }}
                />
            </div>
        </div>
    );
}
