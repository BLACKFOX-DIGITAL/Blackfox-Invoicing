import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { CreditCard, Mail, Globe, Phone, MapPin, Building2, User, Users, FileText, Calendar, Edit } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function CustomerHeader({ customer, id }: { customer: any; id: string }) {
    // Parse additionalContacts
    const contacts = Array.isArray(customer.additionalContacts)
        ? customer.additionalContacts
        : [];

    // Build full address string
    const addressParts = [customer.address, customer.city, customer.state, customer.zip].filter(Boolean);
    const fullAddress = addressParts.join(", ");
    const countryLabel = customer.country || "";

    return (
        <div className="bg-bg-card rounded-lg border border-border-subtle shadow-sm overflow-hidden">
            {/* ── TOP BAR: Name + Status + Edit ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 border-b border-border-subtle bg-gradient-to-r from-bg-card to-bg-surface/50">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-text-main">{customer.name}</h1>
                    <Badge variant="default" className="font-mono text-xs">{id}</Badge>
                    <div className="flex items-center gap-1 text-sm text-text-muted bg-bg-surface px-2 py-1 rounded">
                        <span className="text-base">
                            {customer.currency === 'USD' ? '🇺🇸' :
                                customer.currency === 'EUR' ? '🇪🇺' :
                                    customer.currency === 'GBP' ? '🇬🇧' :
                                        customer.currency === 'CAD' ? '🇨🇦' :
                                            customer.currency === 'AUD' ? '🇦🇺' : '🏳️'}
                        </span>
                        <span>{customer.currency || 'USD'}</span>
                    </div>
                    <Badge variant={customer.status === "Active" ? "success" : "secondary"}>
                        {customer.status || "Active"}
                    </Badge>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={(customer.pendingAmount || 0) === 0 ? "success" : "warning"}>
                        {(customer.pendingAmount || 0) === 0 ? "Healthy" : "Attention"}
                    </Badge>
                    <Button href={`/customers/${id}/edit`} variant="secondary" size="sm">
                        <Edit size={14} className="mr-1.5" /> Edit
                    </Button>
                </div>
            </div>

            {/* ── DETAIL GRID ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border-subtle">

                {/* Column 1: Company Details */}
                <div className="p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={12} /> Company Details
                    </h3>
                    <div className="space-y-2.5 text-sm">
                        {customer.email && (
                            <div className="flex items-center gap-2.5">
                                <Mail size={14} className="text-text-muted shrink-0" />
                                <a href={`mailto:${customer.email}`} className="text-text-main hover:text-primary transition-colors">
                                    {customer.email}
                                </a>
                            </div>
                        )}
                        {customer.phone && (
                            <div className="flex items-center gap-2.5">
                                <Phone size={14} className="text-text-muted shrink-0" />
                                <span className="text-text-main">{customer.phone}</span>
                            </div>
                        )}
                        {customer.website && (
                            <div className="flex items-center gap-2.5">
                                <Globe size={14} className="text-text-muted shrink-0" />
                                <a
                                    href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-text-main hover:text-primary hover:underline transition-colors"
                                >
                                    {customer.website.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                            </div>
                        )}
                        {(fullAddress || countryLabel) && (
                            <div className="flex items-start gap-2.5">
                                <MapPin size={14} className="text-text-muted shrink-0 mt-0.5" />
                                <span className="text-text-main text-sm leading-relaxed">
                                    {fullAddress}{fullAddress && countryLabel ? ", " : ""}{countryLabel}
                                </span>
                            </div>
                        )}
                        {!customer.email && !customer.phone && !customer.website && !fullAddress && (
                            <span className="text-text-muted italic text-xs">No company details added</span>
                        )}
                    </div>
                </div>

                {/* Column 2: Contacts */}
                <div className="p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={12} /> Contacts
                    </h3>
                    <div className="space-y-3 text-sm">
                        {/* Primary Contact */}
                        {(customer.contactName || customer.email || customer.phone) && (
                            <div className="bg-bg-surface p-2.5 rounded-md border border-primary/10 space-y-1">
                                <div className="flex items-center gap-2">
                                    <User size={13} className="text-primary shrink-0" />
                                    <span className="font-semibold text-text-main">{customer.contactName || "Primary Contact"}</span>
                                    {customer.contactRole && (
                                        <span className="text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded">{customer.contactRole}</span>
                                    )}
                                    <Badge variant="default" className="text-[9px] px-1.5 py-0">Primary</Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 ml-5 text-xs text-text-muted">
                                    {customer.email && (
                                        <span className="flex items-center gap-1">
                                            <Mail size={11} /> {customer.email}
                                        </span>
                                    )}
                                    {customer.phone && (
                                        <span className="flex items-center gap-1">
                                            <Phone size={11} /> {customer.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Additional Contacts */}
                        {contacts.length > 0 ? (
                            contacts.map((contact: any, index: number) => (
                                <div key={index} className="bg-bg-surface/50 rounded-md p-2.5 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <User size={13} className="text-text-muted shrink-0" />
                                        <span className="font-medium text-text-main">{contact.name || "Unnamed"}</span>
                                        {contact.role && (
                                            <span className="text-[10px] text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">{contact.role}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 ml-5 text-xs text-text-muted">
                                        {contact.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail size={11} /> {contact.email}
                                            </span>
                                        )}
                                        {contact.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone size={11} /> {contact.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            !customer.contactName && !customer.email && !customer.phone && (
                                <span className="text-text-muted italic text-xs">No contacts added</span>
                            )
                        )}
                    </div>
                </div>

                {/* Column 3: Financial / Billing */}
                <div className="p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={12} /> Financial & Billing
                    </h3>
                    <div className="space-y-2.5 text-sm">
                        {customer.taxId && (
                            <div className="flex items-center gap-2.5">
                                <CreditCard size={14} className="text-text-muted shrink-0" />
                                <span className="text-text-muted">Tax ID / VAT:</span>
                                <span className="text-text-main font-mono text-xs">{customer.taxId}</span>
                            </div>
                        )}
                        {customer.paymentMethod && (
                            <div className="flex items-center gap-2.5">
                                <CreditCard size={14} className="text-text-muted shrink-0" />
                                <span className="text-text-muted">Payment Method:</span>
                                <span className="text-text-main font-medium">{customer.paymentMethod.name}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2.5">
                            <Calendar size={14} className="text-text-muted shrink-0" />
                            <span className="text-text-muted">Payment Terms:</span>
                            <span className="text-text-main font-medium">{customer.paymentTerms || 30} days</span>
                        </div>
                        {customer.notes && (
                            <div className="mt-2 pt-2 border-t border-border-subtle">
                                <p className="text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Notes</p>
                                <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
                            </div>
                        )}
                        <div className="mt-2 pt-2 border-t border-border-subtle">
                            <p className="text-xs text-text-muted mb-1">Member since</p>
                            <p className="text-sm text-text-main font-medium">{formatDate(customer.createdAt)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
