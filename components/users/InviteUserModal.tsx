"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { X, Lock, Shield, Building2, AlertCircle } from "lucide-react";

interface InviteUserModalProps {
    onClose: () => void;
    onInvite: (data: { name: string; email: string; password: string; role: string; company: string }) => void;
}

const BLACKFOX_ROLES = ["Worker", "Manager", "Owner"];
const FRAMEIT_ROLES = ["VendorWorker", "VendorManager"];

const inputClass = "w-full bg-bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary transition-colors";
const labelClass = "block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5";

export default function InviteUserModal({ onClose, onInvite }: InviteUserModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [company, setCompany] = useState("blackfox");
    const [role, setRole] = useState("Worker");
    const [error, setError] = useState("");

    const availableRoles = company === "frameit" ? FRAMEIT_ROLES : BLACKFOX_ROLES;

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCompany = e.target.value;
        setCompany(newCompany);
        // Reset role when switching company
        setRole(newCompany === "frameit" ? "VendorWorker" : "Worker");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) { setError("Name is required."); return; }
        if (!email.trim()) { setError("Email is required."); return; }
        if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }

        onInvite({ name: name.trim(), email: email.trim(), password, role, company });
    };

    const getRoleDescription = () => {
        if (company === "frameit") {
            return "VendorManager can view all Frame IT logs. VendorWorker can only view their own logs.";
        }
        return "Owner has full access. Manager can manage billing. Worker can view logs and create items.";
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg-card rounded-2xl shadow-xl w-full max-w-md border border-border-subtle">
                <div className="flex justify-between items-center p-5 border-b border-border-subtle">
                    <h2 className="text-lg font-bold text-text-main">Create New User</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm">
                            <AlertCircle size={15} /><span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Name</label>
                        <input
                            className={inputClass}
                            placeholder="John Doe"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Email Address</label>
                        <input
                            className={inputClass}
                            type="email"
                            placeholder="john@company.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Password</label>
                        <div className="relative">
                            <input
                                className={inputClass}
                                type="text"
                                placeholder="Set initial password (min 6 chars)"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Company</label>
                        <div className="relative">
                            <select
                                className={`${inputClass} appearance-none cursor-pointer`}
                                value={company}
                                onChange={handleCompanyChange}
                            >
                                <option value="blackfox">Blackfox Limited</option>
                                <option value="frameit">Frame IT Solutions</option>
                            </select>
                            <Building2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Role</label>
                        <div className="relative">
                            <select
                                className={`${inputClass} appearance-none cursor-pointer`}
                                value={role}
                                onChange={e => setRole(e.target.value)}
                            >
                                {availableRoles.map(r => (
                                    <option key={r} value={r}>
                                        {r === "VendorWorker" ? "Vendor Worker"
                                            : r === "VendorManager" ? "Vendor Manager"
                                                : r}
                                    </option>
                                ))}
                            </select>
                            <Shield size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>
                        <p className="text-xs text-text-muted mt-1.5">{getRoleDescription()}</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-border-subtle mt-1">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Create User</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
