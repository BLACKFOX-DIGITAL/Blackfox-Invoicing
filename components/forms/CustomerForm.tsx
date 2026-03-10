"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { useRole } from "@/lib/roleContext";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";

import { COUNTRIES } from "@/lib/constants/countries";

// Validation Schema
const customerSchema = z.object({
    // 1. Basic Info
    id: z.string().min(1, "Customer ID is required").regex(/^\d+$/, "Customer ID must contain digits only"),
    name: z.string().min(1, "Customer Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    sendInvoicesToCompanyEmail: z.boolean().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    currency: z.string().min(1, "Currency is required"),
    taxId: z.string().optional(),
    paymentMethodId: z.preprocess(
        (val) => (val === "" || val === null ? undefined : Number(val)),
        z.number().optional()
    ),
    status: z.boolean(),
    notes: z.string().optional(),

    // 2. Primary Contact
    primaryContact: z.object({
        firstName: z.string().optional(),
        middleName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.string().optional(),
        email: z.string().email("Invalid email").optional().or(z.literal("")),
        sendInvoices: z.boolean().optional(),
        phone: z.string().optional(),
    }),

    // 3. Additional Contacts
    additionalContacts: z.array(z.object({
        name: z.string().min(1, "Name is required"),
        role: z.string().optional(),
        email: z.string().email("Invalid email").optional().or(z.literal("")),
        sendInvoices: z.boolean().optional(),
        phone: z.string().optional(),
        tags: z.array(z.string()).optional(), // Billing, Ops, etc.
    })).optional(),

    // 4. Billing Addresses
    addresses: z.array(z.object({
        id: z.string().optional(),
        companyName: z.string().optional(),
        address: z.string().min(1, "Address is required"),
        taxId: z.string().optional(),
        contactFirstName: z.string().optional(),
        contactMiddleName: z.string().optional(),
        contactLastName: z.string().optional(),
        contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
        contactPhone: z.string().optional(),
        website: z.string().optional(),
    })).optional(),

    // 5. Billing Preferences
    billing: z.object({
        paymentTerms: z.number().min(0, "Must be 0 or more"),
        attachLogs: z.boolean(),
    }),
}).superRefine((data, ctx) => {
    if (!data.email && !data.primaryContact.email) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["email"],
            message: "Company Email or Contact Email is required",
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["primaryContact", "email"],
            message: "Company Email or Contact Email is required",
        });
    }
});

type CustomerFormData = z.infer<typeof customerSchema>;

// System Metadata passed from parent
interface SystemMetadata {
    createdAt: string | Date;
    lastInvoice?: { id: string; date: string | Date };
    outstandingBalance: number;
}

interface CustomerFormProps {
    defaultValues?: Partial<CustomerFormData>;
    onSubmit: (data: CustomerFormData) => void;
    isEditing?: boolean;
    systemMetadata?: SystemMetadata; // [NEW]
}

export default function CustomerForm({ defaultValues, onSubmit, isEditing = false, systemMetadata }: CustomerFormProps) {
    const { role } = useRole();
    const toast = useToast();
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: defaultValues || {
            id: "",
            name: "",
            email: "",
            sendInvoicesToCompanyEmail: false,
            phone: "",
            website: "",
            address: "",
            city: "",
            state: "",
            zip: "",
            country: "US", // Default to US code
            currency: "USD",
            taxId: "",
            paymentMethodId: undefined,
            status: true,
            notes: "",
            primaryContact: {
                firstName: "",
                middleName: "",
                lastName: "",
                role: "",
                email: "",
                sendInvoices: false,
                phone: "",
            },
            additionalContacts: [],
            addresses: [],
            billing: {
                paymentTerms: 30,
                attachLogs: true,
            }
        },
    });

    const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
        control,
        name: "additionalContacts",
    });

    const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
        control,
        name: "addresses",
    });

    const status = watch("status");
    const attachLogs = watch("billing.attachLogs");
    const [paymentMethods, setPaymentMethods] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        async function fetchMethods() {
            const { getPaymentMethods } = await import("@/app/actions/settings");
            const result = await getPaymentMethods();
            if (result.success) {
                setPaymentMethods(result.data);
            }
        }
        fetchMethods();
    }, []);

    // Format utility for display
    const formatDate = (date: string | Date) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Helper for Section Headers
    const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
        <div className="mb-6 pb-2 border-b border-border-subtle/50">
            <h3 className="text-lg font-bold text-text-main">{title}</h3>
            {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
        </div>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-bg-card p-6 rounded-lg border border-border-subtle max-w-4xl mx-auto">

            {/* ── SECTION 1: COMPANY DETAILS ── */}
            <div>
                <SectionHeader title="1. Company Details" description="Core identity and contact info." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Input
                            label="Customer ID"
                            {...register("id")}
                            placeholder="e.g. 101"
                            disabled={isEditing}
                            error={errors.id?.message}
                            required
                            onInput={(e) => {
                                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                            }}
                        />
                    </div>
                    <div>
                        <Input
                            label="Customer Name"
                            {...register("name")}
                            placeholder="Company Name"
                            error={errors.name?.message}
                            required
                        />
                    </div>
                    <div>
                        <Input
                            label="Company Email *"
                            {...register("email")}
                            placeholder="info@company.com"
                            error={errors.email?.message}
                        />
                        <label className="flex items-center gap-2 mt-1.5 ml-1 flex-wrap">
                            <input type="checkbox" {...register("sendInvoicesToCompanyEmail")} className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary bg-bg-surface cursor-pointer" />
                            <span className="text-xs text-text-muted">Send invoices to this email</span>
                            <span className="w-full text-[10px] text-text-muted mt-0.5">*(At least one email is required: Company or Contact)</span>
                        </label>
                    </div>
                    <div>
                        <Input
                            label="Company Phone"
                            {...register("phone")}
                            placeholder="+1 555 000 0000"
                        />
                    </div>
                    <div>
                        <Input
                            label="Website"
                            {...register("website")}
                            placeholder="https://example.com"
                            error={errors.website?.message}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">Status</label>
                        <div className="flex items-center gap-3 mt-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" {...register("status")} className="sr-only peer" />
                                <div className="w-11 h-6 bg-bg-surface peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                            <span className={`text-sm font-medium ${status ? "text-status-success" : "text-text-muted"}`}>
                                {status ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 2: PRIMARY CONTACT ── */}
            <div>
                <SectionHeader title="2. Primary Contact" description="Who you talk to and invoice." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-1">
                        <Input
                            label="First Name"
                            {...register("primaryContact.firstName")}
                            placeholder="Jane"
                        />
                        <Input
                            label="Middle Name"
                            {...register("primaryContact.middleName")}
                            placeholder="M"
                        />
                        <Input
                            label="Last Name"
                            {...register("primaryContact.lastName")}
                            placeholder="Doe"
                        />
                    </div>
                    <div>
                        <Input
                            label="Job Title / Role"
                            {...register("primaryContact.role")}
                            placeholder="e.g. Accounts Manager"
                        />
                    </div>
                    <div>
                        <Input
                            label="Email Address *"
                            {...register("primaryContact.email")}
                            placeholder="jane@company.com"
                            error={errors.primaryContact?.email?.message}
                        />
                        <label className="flex items-center gap-2 mt-1.5 ml-1 flex-wrap">
                            <input type="checkbox" {...register("primaryContact.sendInvoices")} className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary bg-bg-surface cursor-pointer" />
                            <span className="text-xs text-text-muted">Send invoices to this email</span>
                            <span className="w-full text-[10px] text-text-muted mt-0.5">*(At least one email is required: Company or Contact)</span>
                        </label>
                    </div>
                    <div>
                        <Input
                            label="Phone / WhatsApp"
                            {...register("primaryContact.phone")}
                            placeholder="+1 555 000 0000"
                        />
                    </div>
                </div>
            </div>

            {/* ── SECTION 3: ADDITIONAL CONTACTS ── */}
            <div>
                <SectionHeader title="3. Additional Contacts" description="Other stakeholders (Billing, Ops, etc)." />
                <div className="space-y-4">
                    {contactFields.map((field, index) => (
                        <div key={field.id} className="bg-bg-surface p-4 rounded-md border border-border-subtle relative group">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-text-main">Contact #{index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeContact(index)}
                                    className="text-text-muted hover:text-status-error transition-colors p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Input
                                        label="Contact Name"
                                        {...register(`additionalContacts.${index}.name`)}
                                        error={errors.additionalContacts?.[index]?.name ? "Required" : undefined}
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Job Title / Role"
                                        {...register(`additionalContacts.${index}.role`)}
                                        placeholder="e.g. Production Lead"
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Email Address"
                                        {...register(`additionalContacts.${index}.email`)}
                                    />
                                    <label className="flex items-center gap-2 mt-1.5 ml-1 cursor-pointer">
                                        <input type="checkbox" {...register(`additionalContacts.${index}.sendInvoices`)} className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary bg-bg-surface" />
                                        <span className="text-xs text-text-muted">Send invoices to this email</span>
                                    </label>
                                </div>
                                <div>
                                    <Input
                                        label="Phone / WhatsApp"
                                        {...register(`additionalContacts.${index}.phone`)}
                                        placeholder="+1 555 000 0000"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => appendContact({ name: "", email: "", role: "", phone: "", sendInvoices: false, tags: [] })}
                        className="w-full border-dashed border-2 border-border-subtle bg-transparent hover:bg-bg-surface"
                    >
                        <Plus size={16} /> Add Contact
                    </Button>
                </div>
            </div>

            {/* ── SECTION 4: ADDRESS ── */}
            <div>
                <SectionHeader title="4. Address" description="Company location." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Street Address"
                            {...register("address")}
                            placeholder="123 Main St, Suite 100"
                        />
                    </div>
                    <div>
                        <Input
                            label="City"
                            {...register("city")}
                            placeholder="New York"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="State / Province"
                            {...register("state")}
                            placeholder="NY"
                        />
                        <Input
                            label="Zip / Postal"
                            {...register("zip")}
                            placeholder="10001"
                        />
                    </div>
                    <div>
                        <Select label="Country" {...register("country")}>
                            {COUNTRIES.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>

            {/* ── SECTION 5: SECONDARY BILLING PROFILES ── */}
            <div>
                <SectionHeader title="5. Additional Billing Profiles" description="Alternative entities/addresses to use when generating invoices for this customer." />
                <div className="space-y-4">
                    {addressFields.map((field, index) => (
                        <div key={field.id} className="bg-bg-surface p-4 rounded-md border border-border-subtle relative group">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-text-main">Billing Profile #{index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeAddress(index)}
                                    className="text-text-muted hover:text-status-error transition-colors p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Input
                                        label="Company / Entity Name"
                                        {...register(`addresses.${index}.companyName`)}
                                        placeholder="e.g. Acme Corp EU"
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Tax ID / VAT"
                                        {...register(`addresses.${index}.taxId`)}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-1">
                                    <Input
                                        label="Contact First"
                                        {...register(`addresses.${index}.contactFirstName`)}
                                        placeholder="John"
                                    />
                                    <Input
                                        label="Middle"
                                        {...register(`addresses.${index}.contactMiddleName`)}
                                        placeholder=""
                                    />
                                    <Input
                                        label="Last"
                                        {...register(`addresses.${index}.contactLastName`)}
                                        placeholder="Doe"
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Contact Email"
                                        {...register(`addresses.${index}.contactEmail`)}
                                        placeholder="john@example.com"
                                        error={errors.addresses?.[index]?.contactEmail?.message}
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Contact Phone"
                                        {...register(`addresses.${index}.contactPhone`)}
                                        placeholder="+1 555 000 0000"
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Website"
                                        {...register(`addresses.${index}.website`)}
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Textarea
                                        label="Full Address"
                                        {...register(`addresses.${index}.address`)}
                                        placeholder={"123 Main St\nSuite 100\nCity, State 10001\nCountry"}
                                        rows={3}
                                        error={errors.addresses?.[index]?.address ? "Required" : undefined}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => appendAddress({ companyName: "", address: "", taxId: "", contactFirstName: "", contactMiddleName: "", contactLastName: "", contactEmail: "", contactPhone: "", website: "" })}
                        className="w-full border-dashed border-2 border-border-subtle bg-transparent hover:bg-bg-surface"
                    >
                        <Plus size={16} /> Add Billing Profile
                    </Button>
                </div>
            </div>

            {/* ── SECTION 6: FINANCIAL & BILLING ── */}
            <div>
                <SectionHeader title="6. Financial Settings" description="Currency, tax, payment configuration." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Select label="Currency" {...register("currency")}>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="CAD">CAD ($)</option>
                            <option value="AUD">AUD ($)</option>
                        </Select>
                    </div>
                    <div>
                        <Input
                            label="Tax ID / VAT"
                            {...register("taxId")}
                            placeholder="Optional"
                        />
                    </div>
                    <div>
                        <Select
                            label="Payment Method"
                            {...register("paymentMethodId")}
                            value={String(watch("paymentMethodId") || "")}
                        >
                            <option value="">Select Method (Optional)</option>
                            {paymentMethods.length > 0 ? (
                                paymentMethods.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))
                            ) : (
                                <option value="" disabled>No methods in Settings</option>
                            )}
                        </Select>
                        {paymentMethods.length === 0 && (
                            <p className="text-[10px] text-text-muted mt-1 ml-1">
                                Add methods in <a href="/settings/payment-methods" className="text-primary hover:underline">Settings</a>
                            </p>
                        )}
                    </div>
                    <div>
                        <Input
                            label="Default Payment Terms (Days)"
                            type="number"
                            {...register("billing.paymentTerms", { valueAsNumber: true })}
                            placeholder="e.g. 30"
                            error={errors.billing?.paymentTerms?.message}
                            helperText="Number of days until invoice is due."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1.5 ml-1">Attach Work Logs?</label>
                        <div className="flex items-center gap-3 mt-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" {...register("billing.attachLogs")} className="sr-only peer" />
                                <div className="w-11 h-6 bg-bg-surface peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                            <span className="text-sm text-text-main">
                                {attachLogs ? "Yes" : "No"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 7: NOTES ── */}
            <div>
                <SectionHeader title="7. Internal Notes" description="Private notes visible only to your team." />
                <Textarea
                    {...register("notes")}
                    placeholder="Internal notes about this customer..."
                    rows={3}
                />
            </div>

            {/* ── SECTION 8: SYSTEM DATA (READ ONLY) ── */}
            {isEditing && systemMetadata && (
                <div>
                    <SectionHeader title="8. System Data" />
                    <div className="grid grid-cols-3 gap-4 bg-bg-surface p-4 rounded-md text-xs">
                        <div>
                            <span className="block text-text-muted mb-1">Created At</span>
                            <span className="font-mono text-text-main">{formatDate(systemMetadata.createdAt)}</span>
                        </div>
                        <div>
                            <span className="block text-text-muted mb-1">Last Invoice</span>
                            <span className="font-mono text-text-main">
                                {systemMetadata.lastInvoice
                                    ? `${formatDate(systemMetadata.lastInvoice.date)} (${systemMetadata.lastInvoice.id})`
                                    : "N/A"
                                }
                            </span>
                        </div>
                        <div>
                            <span className="block text-text-muted mb-1">Outstanding Balance</span>
                            <span className={`font-mono font-bold ${systemMetadata.outstandingBalance > 0 ? "text-status-error" : "text-status-success"}`}>
                                ${systemMetadata.outstandingBalance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t border-border-subtle">
                {isEditing && role === "Owner" && (
                    <Button
                        type="button"
                        variant="danger"
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this customer? This cannot be undone.")) {
                                toast.error("Delete functionality is currently disabled for safety.");
                            }
                        }}
                    >
                        <Trash2 size={16} className="mr-2" />
                        Delete Customer
                    </Button>
                )}

                <div className="flex gap-3 ml-auto">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => window.history.back()}
                    >
                        Cancel
                    </Button>
                    <Button type="submit">
                        {isEditing ? "Save Changes" : "Create Customer"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
