import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { X, Briefcase, DollarSign, Phone, Mail, User, ShieldAlert } from "lucide-react";
import Input from "@/components/ui/Input";

interface EmployeeModalProps {
    employee?: any;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    isSubmitting: boolean;
}

const RELATIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

export default function EmployeeModal({ employee, onClose, onSave, isSubmitting }: EmployeeModalProps) {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        designation: "",
        department: "",
        joinDate: "",
        bankName: "",
        bankAccountNo: "",
        routingNumber: "",
        paymentMethod: "Bank Transfer",
        grossSalary: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelation: "",
        emergencyContactEmail: "",
    });

    useEffect(() => {
        if (employee) {
            setFormData({
                firstName: employee.firstName || "",
                lastName: employee.lastName || "",
                email: employee.email || "",
                phone: employee.phone || "",
                designation: employee.designation || "",
                department: employee.department || "",
                joinDate: employee.joinDate ? (typeof employee.joinDate === 'string' ? employee.joinDate.split('T')[0] : new Date(employee.joinDate).toISOString().split('T')[0]) : "",
                bankName: employee.bankName || "",
                bankAccountNo: employee.bankAccountNo || "",
                routingNumber: employee.routingNumber || "",
                paymentMethod: employee.paymentMethod || "Bank Transfer",
                grossSalary: employee.grossSalary?.toString() || "",
                emergencyContactName: employee.emergencyContactName || "",
                emergencyContactPhone: employee.emergencyContactPhone || "",
                emergencyContactRelation: employee.emergencyContactRelation || "",
                emergencyContactEmail: employee.emergencyContactEmail || "",
            });
        }
    }, [employee]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            grossSalary: parseFloat(formData.grossSalary) || 0,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border-subtle flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        {employee ? <><Briefcase size={20} className="text-primary" /> Edit Employee</> : <><Briefcase size={20} className="text-primary" /> Add New Employee</>}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    <form id="employee-form" onSubmit={handleSubmit} className="space-y-7">

                        {/* Personal Information */}
                        <div>
                            <h3 className="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                                <User size={16} className="text-primary" /> Personal Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">First Name *</label>
                                    <Input required name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Last Name</label>
                                    <Input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Email</label>
                                    <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Phone</label>
                                    <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                                </div>
                            </div>
                        </div>

                        {/* Job Details */}
                        <div>
                            <h3 className="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                                <Briefcase size={16} className="text-primary" /> Job Details
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Designation</label>
                                    <Input name="designation" value={formData.designation} onChange={handleChange} placeholder="Software Engineer" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Department</label>
                                    <Input name="department" value={formData.department} onChange={handleChange} placeholder="Engineering" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Join Date</label>
                                    <Input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Monthly Gross Salary *</label>
                                    <Input type="number" required name="grossSalary" value={formData.grossSalary} onChange={handleChange} placeholder="10000" />
                                </div>
                            </div>
                        </div>

                        {/* Payment Setup */}
                        <div>
                            <h3 className="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                                <DollarSign size={16} className="text-primary" /> Payment Setup
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium text-text-main">Payment Method</label>
                                    <select
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-bg-app border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none transition-all cursor-pointer"
                                    >
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                </div>
                                {formData.paymentMethod === "Bank Transfer" && (
                                    <>
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-sm font-medium text-text-main">Bank Name</label>
                                            <Input name="bankName" value={formData.bankName} onChange={handleChange} placeholder="Chase Bank" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-text-main">Account Number</label>
                                            <Input name="bankAccountNo" value={formData.bankAccountNo} onChange={handleChange} placeholder="XXXXXXXXXX" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-text-main">Routing Number</label>
                                            <Input name="routingNumber" value={formData.routingNumber} onChange={handleChange} placeholder="XXXXXXXXX" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div>
                            <h3 className="text-sm font-semibold text-text-main mb-4 flex items-center gap-2">
                                <ShieldAlert size={16} className="text-status-warning" /> Emergency Contact
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Contact Name</label>
                                    <Input
                                        name="emergencyContactName"
                                        value={formData.emergencyContactName}
                                        onChange={handleChange}
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main">Relationship</label>
                                    <select
                                        name="emergencyContactRelation"
                                        value={formData.emergencyContactRelation}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-bg-app border border-border-subtle rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none transition-all cursor-pointer"
                                    >
                                        <option value="">Select Relation...</option>
                                        {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main flex items-center gap-1.5"><Phone size={13} /> Phone Number</label>
                                    <Input
                                        name="emergencyContactPhone"
                                        value={formData.emergencyContactPhone}
                                        onChange={handleChange}
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-main flex items-center gap-1.5"><Mail size={13} /> Email (Optional)</label>
                                    <Input
                                        type="email"
                                        name="emergencyContactEmail"
                                        value={formData.emergencyContactEmail}
                                        onChange={handleChange}
                                        placeholder="jane@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-border bg-background/50 rounded-b-2xl flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="employee-form"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Saving..." : employee ? "Update Employee" : "Add Employee"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
