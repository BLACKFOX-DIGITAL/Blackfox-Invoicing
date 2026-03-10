"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import InviteUserModal from "@/components/users/InviteUserModal";
import { Plus, Shield, ShieldAlert, ShieldCheck, Mail, Trash2, Edit2, Loader2 } from "lucide-react";
import { getUsers, createUser, deleteUser } from "@/app/actions/users";
import { useToast } from "@/components/ui/ToastProvider";
import SortableHeader from "@/components/ui/SortableHeader";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const result = await getUsers();
        if (result.success) {
            setUsers(result.data);
        } else {
            toast.error("Failed to load users");
        }
        setLoading(false);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "Owner":
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"><ShieldCheck size={14} /> Owner</span>;
            case "Manager":
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20"><ShieldAlert size={14} /> Manager</span>;
            case "VendorManager":
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20"><ShieldAlert size={14} /> Vendor Manager</span>;
            case "VendorWorker":
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-400/20"><Shield size={14} /> Vendor Worker</span>;
            default:
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-500 border border-gray-500/20"><Shield size={14} /> Worker</span>;
        }
    };

    const getCompanyBadge = (company: string) => {
        if (company === "frameit") {
            return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-400/20">Frame IT</span>;
        }
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">Blackfox</span>;
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            const result = await deleteUser(id);
            if (result.success) {
                fetchUsers();
            } else {
                toast.error("Failed to delete user");
            }
        }
    };

    const handleCreateUser = async (data: any) => {
        setIsSubmitting(true);
        const result = await createUser(data);

        if (result.success) {
            setIsInviteModalOpen(false);
            fetchUsers();
            toast.success(`User ${data.name} created successfully!`);
        } else {
            toast.error(result.error || "Failed to create user");
        }
        setIsSubmitting(false);
    };

    if (loading && users.length === 0) {
        return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    const sortField = searchParams.get("sortField") || "name";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "asc";

    const handleSort = (field: string) => {
        const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams(searchParams.toString());
        params.set("sortField", field);
        params.set("sortOrder", newOrder);
        router.push(`${pathname}?${params.toString()}`);
    };

    const sortedUsers = [...users].sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "joined") {
            valA = new Date(a.createdAt).getTime();
            valB = new Date(b.createdAt).getTime();
        } else if (typeof valA === "string") {
            valA = valA.toLowerCase();
            valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Team Members</h1>
                    <p className="text-text-muted text-sm mt-1">Manage access and roles for your team</p>
                </div>
                <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Plus size={18} /> Create New User
                </Button>
            </div>

            <Card className="overflow-hidden">
                <Table
                    headers={[
                        <SortableHeader key="sh_usr" label="User" sortKey="name" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                        <SortableHeader key="sh_co" label="Company" sortKey="company" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                        <SortableHeader key="sh_role" label="Role" sortKey="role" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                        <SortableHeader key="sh_join" label="Joined" sortKey="joined" currentSort={sortField} currentOrder={sortOrder} onSort={handleSort} className="text-white" />,
                        <div key="sh_act" className="text-right font-bold w-full text-white">Actions</div>
                    ]}
                    data={sortedUsers}
                    renderRow={(user, i) => (
                        <tr key={user.id} className="hover:bg-bg-app/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-text-main text-sm">{user.name}</div>
                                        <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                                            <Mail size={12} /> {user.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {getCompanyBadge(user.company || "blackfox")}
                            </td>
                            <td className="px-6 py-4">
                                {getRoleBadge(user.role)}
                            </td>
                            <td className="px-6 py-4 text-sm text-text-muted">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/5 rounded-md transition-colors"
                                        onClick={() => handleDelete(user.id, user.name)}
                                        title="Remove User"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )}
                />
            </Card>

            {isInviteModalOpen && (
                <InviteUserModal
                    onClose={() => setIsInviteModalOpen(false)}
                    onInvite={handleCreateUser}
                />
            )}
        </div>
    );
}
