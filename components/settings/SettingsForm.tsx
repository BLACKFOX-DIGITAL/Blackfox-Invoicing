"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Save, Building, DollarSign, Upload, Image as ImageIcon, Palette } from "lucide-react";
import Image from "next/image";
import { updateSettings } from "@/app/actions/settings";
import { useToast } from "@/components/ui/ToastProvider";
import type { SettingsData } from "@/app/actions/settings";

interface Props {
    initialSettings: SettingsData;
}

export default function SettingsForm({ initialSettings }: Props) {
    const [formData, setFormData] = useState({
        companyName: initialSettings.companyName || "",
        email: initialSettings.email || "",
        address: initialSettings.address || "",
        phone: initialSettings.phone || "",
        website: initialSettings.website || "",
        tinId: initialSettings.tinId || "",
        logoUrl: initialSettings.logoUrl || "",
        currency: initialSettings.currency || "৳ BDT",
        taxRate: initialSettings.taxRate ?? 0,
        defaultPaymentTerms: initialSettings.defaultPaymentTerms || "Net 30",
        themeColor: initialSettings.themeColor || "slate",
    });
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("company");
    const [logoPreview, setLogoPreview] = useState<string | null>(initialSettings.logoUrl || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const toast = useToast();

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        let currentLogoUrl = formData.logoUrl;

        if (selectedFile) {
            const formDataUpload = new FormData();
            formDataUpload.append("file", selectedFile);
            const { uploadCompanyLogo } = await import("@/app/actions/settings");
            const uploadResult = await uploadCompanyLogo(formDataUpload);
            if (uploadResult.success) {
                currentLogoUrl = uploadResult.data;
                setFormData(prev => ({ ...prev, logoUrl: currentLogoUrl }));
            } else {
                toast.error("Failed to upload logo: " + uploadResult.error);
                setSaving(false);
                return;
            }
        }

        const result = await updateSettings({
            companyName: formData.companyName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            website: formData.website,
            tinId: formData.tinId,
            currency: formData.currency,
            taxRate: Number(formData.taxRate),
            defaultPaymentTerms: formData.defaultPaymentTerms,
            themeColor: formData.themeColor,
        });

        setSaving(false);
        if (result.success) {
            toast.success("Settings saved successfully!");
        } else {
            toast.error("Failed to save settings: " + result.error);
        }
    };

    const navBtn = (tab: string, label: string, Icon: React.ElementType) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg text-sm transition-colors ${activeTab === tab
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-text-muted hover:bg-bg-surface hover:text-text-main"
                }`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    const renderContent = () => {
        switch (activeTab) {
            case "company":
                return (
                    <Card title="Company Information" className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-6">
                            <div className="flex items-center gap-4">
                                <div className="relative group w-24 h-24 rounded-lg bg-bg-surface border-2 border-dashed border-border-subtle flex items-center justify-center overflow-hidden transition-colors hover:border-primary/50">
                                    {logoPreview ? (
                                        <Image
                                            src={logoPreview}
                                            alt="Company Logo"
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                            unoptimized={logoPreview.startsWith('data:')}
                                        />
                                    ) : (
                                        <div className="text-text-muted flex flex-col items-center gap-1">
                                            <ImageIcon size={24} />
                                            <span className="text-[10px] uppercase font-semibold">Logo</span>
                                        </div>
                                    )}
                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Upload size={20} className="text-white" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                    </label>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-text-main">Company Logo</h3>
                                    <p className="text-xs text-text-muted mt-1 max-w-[200px]">Upload your company logo to appear on invoices. Recommended size: 200x200px.</p>
                                </div>
                            </div>

                            {[
                                { label: "Company Name", name: "companyName", icon: <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />, type: "text", placeholder: "" },
                            ].map(({ label, name, icon, type, placeholder }) => (
                                <div key={name} className="grid gap-1.5">
                                    <label className="text-sm font-semibold text-text-main">{label}</label>
                                    <div className="relative">
                                        {icon}
                                        <input
                                            name={name}
                                            value={(formData as any)[name] || ""}
                                            onChange={handleChange}
                                            type={type}
                                            placeholder={placeholder}
                                            className="pl-9 pr-4 py-2 w-full bg-bg-app border border-border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="grid gap-1.5">
                                <label className="text-sm font-semibold text-text-main">Company Address</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="px-4 py-2 w-full bg-bg-app border border-border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-primary resize-y" />
                            </div>
                            {[
                                { label: "Company Phone", name: "phone", type: "tel", placeholder: "+1 (555) 000-0000" },
                                { label: "Billing Email", name: "email", type: "email", placeholder: "" },
                                { label: "Website", name: "website", type: "url", placeholder: "https://example.com" },
                                { label: "TIN ID", name: "tinId", type: "text", placeholder: "Enter Company TIN ID" },
                            ].map(({ label, name, type, placeholder }) => (
                                <div key={name} className="grid gap-1.5">
                                    <label className="text-sm font-semibold text-text-main">{label}</label>
                                    <input name={name} value={(formData as any)[name] || ""} onChange={handleChange} type={type} placeholder={placeholder} className="px-4 py-2 w-full bg-bg-app border border-border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-primary" />
                                </div>
                            ))}
                        </div>
                    </Card>
                );
            case "financial":
                return (
                    <Card title="Financial Configuration" className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-1.5">
                                <label className="text-sm font-semibold text-text-main">Currency</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">৳</span>
                                    <input name="currency" value={formData.currency} onChange={handleChange} className="pl-9 pr-4 py-2 w-full bg-bg-app border border-border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div className="grid gap-1.5 md:col-span-2">
                                <label className="text-sm font-semibold text-text-main">Default Payment Terms</label>
                                <select name="defaultPaymentTerms" value={formData.defaultPaymentTerms} onChange={handleChange} className="px-4 py-2 w-full bg-bg-app border border-border-subtle rounded-md text-sm text-text-main focus:outline-none focus:border-primary">
                                    <option value="Net 0">Due on Receipt</option>
                                    <option value="Net 15">Net 15</option>
                                    <option value="Net 30">Net 30</option>
                                </select>
                            </div>
                        </div>
                    </Card>
                );
            case "appearance":
                return (
                    <Card title="Appearance & Branding" className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid gap-6">
                            <div className="grid gap-1.5">
                                <label className="text-sm font-semibold text-text-main">Theme Color Palette</label>
                                <p className="text-xs text-text-muted mb-3">Choose the primary color scheme for your interface. Please save and refresh to apply changes.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { id: "blue", name: "1. Trust Blue", hex: "#2563EB" },
                                        { id: "green", name: "2. Growth Green", hex: "#10B981" },
                                        { id: "indigo", name: "3. Indigo Modern", hex: "#4F46E5" },
                                        { id: "teal", name: "4. Teal Clarity", hex: "#0F766E" },
                                        { id: "slate", name: "5. Slate Authority", hex: "#475569" },
                                    ].map((theme) => (
                                        <div
                                            key={theme.id}
                                            onClick={() => setFormData(prev => ({ ...prev, themeColor: theme.id }))}
                                            className="flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors hover:bg-bg-surface"
                                            style={formData.themeColor === theme.id ? {
                                                backgroundColor: `${theme.hex}18`,
                                                borderColor: theme.hex,
                                                boxShadow: `0 0 0 1px ${theme.hex}`
                                            } : {}}
                                        >
                                            <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: theme.hex }} />
                                            <div className="flex-1 font-medium text-sm text-text-main">{theme.name}</div>
                                            {formData.themeColor === theme.id && (
                                                <div className="text-[10px] font-bold uppercase" style={{ color: theme.hex }}>Active</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            default:
                return <div className="text-text-muted italic">Coming soon...</div>;
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">System Settings</h1>
                    <p className="text-text-muted text-sm mt-1">Configure your invoice defaults and company profile</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-2">
                    {navBtn("company", "Company Profile", Building)}
                    {navBtn("financial", "Financial Config", DollarSign)}
                    {navBtn("appearance", "Appearance", Palette)}
                </div>
                <div className="md:col-span-2 space-y-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
