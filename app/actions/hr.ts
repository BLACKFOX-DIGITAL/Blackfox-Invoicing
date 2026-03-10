"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAction } from "@/lib/action-utils";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

// --- Types ---

export type EmployeeWithRelations = {
    id: string;
    userId: string | null;
    company: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    designation: string | null;
    department: string | null;
    joinDate: Date | null;
    bankName: string | null;
    bankAccountNo: string | null;
    routingNumber: string | null;
    grossSalary: number;
    createdAt: Date;
    updatedAt: Date;
};

export type PayrollRecordWithEmployee = {
    id: number;
    employeeId: string;
    month: number;
    year: number;
    grossSalary: number;
    breakdown: any;
    additions: number;
    additionsBreakdown: any;
    deductions: number;
    deductionsBreakdown: any;
    netSalary: number;
    status: string;
    paymentDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    employee: {
        firstName: string;
        lastName: string;
        designation: string | null;
        bankAccountNo: string | null;
        bankName: string | null;
    };
};

export type SalaryComponent = {
    id: number;
    company: string;
    name: string;
    ratio: number;
};

export type SalaryIncrement = {
    id: number;
    employeeId: string;
    amount: number;
    effectiveMonth: number;
    effectiveYear: number;
    isApplied: boolean;
    createdAt: Date;
};

export type LeaveRequestWithEmployee = {
    id: number;
    employeeId: string;
    type: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    employee: {
        firstName: string;
        lastName: string;
    };
    isPaid: boolean;
};

export type HRDocumentWithEmployee = {
    id: number;
    employeeId: string;
    title: string;
    fileUrl: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    employee: {
        firstName: string;
        lastName: string;
    }
};

// --- Helpers ---

async function getAuthContext() {
    const session = await auth();
    if (!session?.user) return null;
    const company = (session.user as any).company || "blackfox";
    const role = (session.user as any).role || "Worker";
    const userId = session.user.id;
    return { company, role, userId };
}

// Default ratio calculation
const DEFAULT_COMPONENTS = [
    { name: "Basic Salary", ratio: 5.0 },
    { name: "House Rent", ratio: 3.5 },
    { name: "Medical Allowance", ratio: 1.0 },
    { name: "Conveyance", ratio: 0.5 }
];

async function ensureSalaryComponents(company: string) {
    const count = await prisma.salaryComponent.count({ where: { company } });
    if (count === 0) {
        await prisma.salaryComponent.createMany({
            data: DEFAULT_COMPONENTS.map(c => ({
                company,
                name: c.name,
                ratio: new Decimal(c.ratio)
            }))
        });
    }
}

async function calculateSalaryBreakdown(company: string, total: number) {
    await ensureSalaryComponents(company);
    const components = await prisma.salaryComponent.findMany({ where: { company } });
    const totalRatio = components.reduce((sum, c) => sum + c.ratio.toNumber(), 0);

    return components.map(c => ({
        name: c.name,
        amount: (total * c.ratio.toNumber()) / totalRatio
    }));
}

// --- Employees ---

export async function getEmployees(status: "Active" | "Archived" | "All" = "Active") {
    return createAction("getEmployees", async () => {
        const ctx = await getAuthContext();
        if (!ctx) return { success: false, error: "Unauthorized" };

        const where: any = { company: ctx.company };
        if (status !== "All") where.status = status;

        const employees = await prisma.employee.findMany({
            where,
            orderBy: { firstName: "asc" }
        });

        return {
            success: true,
            data: employees.map(e => ({ ...e, grossSalary: e.grossSalary.toNumber() }))
        };
    });
}

export async function createEmployee(data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    designation?: string;
    department?: string;
    joinDate?: string;
    bankName?: string;
    bankAccountNo?: string;
    routingNumber?: string;
    paymentMethod?: string;
    grossSalary: number;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    emergencyContactEmail?: string;
}) {
    return createAction("createEmployee", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const employee = await prisma.employee.create({
            data: {
                company: ctx.company,
                firstName: data.firstName,
                lastName: data.lastName || null,
                email: data.email || null,
                phone: data.phone || null,
                designation: data.designation || null,
                department: data.department || null,
                joinDate: data.joinDate ? new Date(data.joinDate) : null,
                bankName: data.bankName || null,
                bankAccountNo: data.bankAccountNo || null,
                routingNumber: data.routingNumber || null,
                paymentMethod: data.paymentMethod || "Bank Transfer",
                grossSalary: new Decimal(data.grossSalary || 0),
                emergencyContactName: data.emergencyContactName || null,
                emergencyContactPhone: data.emergencyContactPhone || null,
                emergencyContactRelation: data.emergencyContactRelation || null,
                emergencyContactEmail: data.emergencyContactEmail || null,
            }
        });

        revalidatePath("/hr/directory");
        revalidatePath("/hr/payroll");
        return { success: true, data: { ...employee, grossSalary: employee.grossSalary.toNumber() } };
    });
}

export async function updateEmployee(id: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    designation?: string;
    department?: string;
    joinDate?: string;
    bankName?: string;
    bankAccountNo?: string;
    routingNumber?: string;
    paymentMethod?: string;
    grossSalary?: number;
    userId?: string | null;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    emergencyContactEmail?: string;
}) {
    return createAction("updateEmployee", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing || existing.company !== ctx.company) {
            return { success: false, error: "Employee not found or unauthorized" };
        }

        const updated = await prisma.employee.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                designation: data.designation,
                department: data.department,
                joinDate: data.joinDate ? new Date(data.joinDate) : existing.joinDate,
                bankName: data.bankName,
                bankAccountNo: data.bankAccountNo,
                routingNumber: data.routingNumber,
                paymentMethod: data.paymentMethod,
                grossSalary: data.grossSalary !== undefined ? new Decimal(data.grossSalary) : undefined,
                userId: data.userId !== undefined ? data.userId : undefined,
                emergencyContactName: data.emergencyContactName ?? existing.emergencyContactName,
                emergencyContactPhone: data.emergencyContactPhone ?? existing.emergencyContactPhone,
                emergencyContactRelation: data.emergencyContactRelation ?? existing.emergencyContactRelation,
                emergencyContactEmail: data.emergencyContactEmail ?? existing.emergencyContactEmail,
            }
        });

        revalidatePath("/hr/directory");
        return { success: true, data: { ...updated, grossSalary: updated.grossSalary.toNumber() } };
    });
}

export async function deleteEmployee(id: string) {
    return createAction("deleteEmployee", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing || existing.company !== ctx.company) {
            return { success: false, error: "Employee not found or unauthorized" };
        }

        await prisma.employee.delete({ where: { id } });

        revalidatePath("/hr/directory");
        return { success: true, data: null };
    });
}

export async function archiveEmployee(id: string, data: {
    exitDate: string;
    exitReason: string;
    exitNotes?: string;
}) {
    return createAction("archiveEmployee", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing || existing.company !== ctx.company) {
            return { success: false, error: "Employee not found or unauthorized" };
        }

        const updated = await prisma.employee.update({
            where: { id },
            data: {
                status: "Archived",
                exitDate: new Date(data.exitDate),
                exitReason: data.exitReason,
                exitNotes: data.exitNotes || null,
            }
        });

        revalidatePath("/hr/directory");
        revalidatePath("/hr/payroll");
        return { success: true, data: { ...updated, grossSalary: updated.grossSalary.toNumber() } };
    });
}

export async function restoreEmployee(id: string) {
    return createAction("restoreEmployee", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const existing = await prisma.employee.findUnique({ where: { id } });
        if (!existing || existing.company !== ctx.company) {
            return { success: false, error: "Employee not found or unauthorized" };
        }

        const updated = await prisma.employee.update({
            where: { id },
            data: {
                status: "Active",
                exitDate: null,
                exitReason: null,
                exitNotes: null,
            }
        });

        revalidatePath("/hr/directory");
        revalidatePath("/hr/payroll");
        return { success: true, data: { ...updated, grossSalary: updated.grossSalary.toNumber() } };
    });
}


// --- Payroll ---

export async function getPayrollRecords(month: number, year: number) {
    return createAction("getPayrollRecords", async () => {
        const ctx = await getAuthContext();
        if (!ctx) return { success: false, error: "Unauthorized" };

        let whereClause: any = { month, year, employee: { company: ctx.company } };

        if (ctx.role === "Worker" || ctx.role === "VendorWorker") {
            whereClause.employee.userId = ctx.userId;
        }

        const records = await prisma.payrollRecord.findMany({
            where: whereClause,
            include: { employee: { select: { firstName: true, lastName: true, designation: true, bankAccountNo: true, bankName: true, paymentMethod: true } } },
            orderBy: { employee: { firstName: "asc" } }
        });

        return {
            success: true,
            data: records.map(r => ({
                ...r,
                grossSalary: r.grossSalary.toNumber(),
                breakdown: r.breakdown ? JSON.parse(r.breakdown) : null,
                additions: r.additions.toNumber(),
                additionsBreakdown: r.additionsBreakdown ? JSON.parse(r.additionsBreakdown) : null,
                deductions: r.deductions.toNumber(),
                deductionsBreakdown: r.deductionsBreakdown ? JSON.parse(r.deductionsBreakdown) : null,
                netSalary: r.netSalary.toNumber()
            }))
        };
    });
}

export async function generatePayroll(month: number, year: number) {
    return createAction("generatePayroll", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        // Apply pending increments first
        const pendingIncrements = await prisma.salaryIncrement.findMany({
            where: {
                effectiveMonth: { lte: month },
                effectiveYear: { lte: year },
                isApplied: false,
                employee: { company: ctx.company }
            }
        });

        for (const inc of pendingIncrements) {
            const emp = await prisma.employee.findUnique({ where: { id: inc.employeeId } });
            if (emp) {
                await prisma.employee.update({
                    where: { id: emp.id },
                    data: {
                        grossSalary: emp.grossSalary.plus(inc.amount)
                    }
                });
                await prisma.salaryIncrement.update({
                    where: { id: inc.id },
                    data: { isApplied: true }
                });
            }
        }

        // Get all active (non-archived) employees for this company
        const employees = await prisma.employee.findMany({
            where: { company: ctx.company, status: "Active" }
        });

        const existingRecords = await prisma.payrollRecord.findMany({
            where: { month, year, employee: { company: ctx.company } },
            select: { employeeId: true }
        });
        const existingIds = new Set(existingRecords.map(r => r.employeeId));

        let generatedCount = 0;
        for (const emp of employees) {
            if (!existingIds.has(emp.id)) {
                const breakdown = await calculateSalaryBreakdown(ctx.company, emp.grossSalary.toNumber());

                await prisma.payrollRecord.create({
                    data: {
                        employeeId: emp.id,
                        month,
                        year,
                        grossSalary: emp.grossSalary,
                        breakdown: JSON.stringify(breakdown),
                        netSalary: emp.grossSalary,
                        status: "Pending"
                    }
                });
                generatedCount++;
            }
        }

        revalidatePath("/hr/payroll");
        return { success: true, data: generatedCount };
    });
}

export async function updatePayrollRecord(id: number, data: { additions: number; additionsBreakdown?: any[]; deductions: number; deductionsBreakdown?: any[]; status: string }) {
    return createAction("updatePayrollRecord", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const record = await prisma.payrollRecord.findUnique({
            where: { id },
            include: { employee: true }
        });

        if (!record || record.employee.company !== ctx.company) {
            return { success: false, error: "Record not found or unauthorized" };
        }

        const additionsDec = new Decimal(data.additions);
        const deductionsDec = new Decimal(data.deductions);
        const netSalary = record.grossSalary.plus(additionsDec).minus(deductionsDec);

        const updated = await prisma.payrollRecord.update({
            where: { id },
            data: {
                additions: additionsDec,
                additionsBreakdown: data.additionsBreakdown ? JSON.stringify(data.additionsBreakdown) : null,
                deductions: deductionsDec,
                deductionsBreakdown: data.deductionsBreakdown ? JSON.stringify(data.deductionsBreakdown) : null,
                netSalary,
                status: data.status,
                paymentDate: data.status === "Paid" && record.status !== "Paid" ? new Date() : record.paymentDate
            }
        });

        revalidatePath("/hr/payroll");
        return {
            success: true, data: {
                ...updated,
                grossSalary: updated.grossSalary.toNumber(),
                breakdown: updated.breakdown ? JSON.parse(updated.breakdown) : null,
                additions: updated.additions.toNumber(),
                additionsBreakdown: updated.additionsBreakdown ? JSON.parse(updated.additionsBreakdown) : null,
                deductions: updated.deductions.toNumber(),
                deductionsBreakdown: updated.deductionsBreakdown ? JSON.parse(updated.deductionsBreakdown) : null,
                netSalary: updated.netSalary.toNumber()
            }
        };
    });
}

export async function markPayrollAsPaid(recordIds: number[]) {
    return createAction("markPayrollAsPaid", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const records = await prisma.payrollRecord.findMany({
            where: { id: { in: recordIds } },
            include: { employee: true }
        });

        const validRecordIds = records
            .filter(r => r.employee.company === ctx.company && r.status !== "Paid")
            .map(r => r.id);

        if (validRecordIds.length === 0) {
            return { success: false, error: "No valid records found to update." };
        }

        await prisma.payrollRecord.updateMany({
            where: { id: { in: validRecordIds } },
            data: {
                status: "Paid",
                paymentDate: new Date()
            }
        });

        revalidatePath("/hr/payroll");
        return { success: true, data: { count: validRecordIds.length } };
    });
}

// Apply festival bonus to selected payroll records (bonus = basic salary component)
export async function applyFestivalBonus(recordIds: number[]) {
    return createAction("applyFestivalBonus", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const records = await prisma.payrollRecord.findMany({
            where: { id: { in: recordIds } },
            include: { employee: true }
        });

        const validRecords = records.filter(r => r.employee.company === ctx.company);
        if (validRecords.length === 0) return { success: false, error: "No valid records found." };

        // For each record, get the Basic Salary component from the breakdown
        let appliedCount = 0;
        for (const record of validRecords) {
            let bonusAmount: Decimal;
            const breakdown: { name: string; amount: number }[] | null = record.breakdown
                ? JSON.parse(record.breakdown)
                : null;

            const basicComponent = breakdown?.find(c => c.name === "Basic Salary");
            if (basicComponent) {
                bonusAmount = new Decimal(basicComponent.amount);
            } else {
                // Fallback: calculate from salary components ratio
                const components = await prisma.salaryComponent.findMany({ where: { company: ctx.company } });
                const basicComp = components.find(c => c.name === "Basic Salary");
                if (basicComp) {
                    const totalRatio = components.reduce((s, c) => s + c.ratio.toNumber(), 0);
                    bonusAmount = record.grossSalary.times(basicComp.ratio.toNumber()).dividedBy(totalRatio);
                } else {
                    // Last resort: use 50% of gross (standard basic ratio)
                    bonusAmount = record.grossSalary.times(0.5);
                }
            }

            const newAdditions = record.additions.plus(bonusAmount);
            const newNetSalary = record.grossSalary.plus(newAdditions).minus(record.deductions);

            // Parse existing additionsBreakdown or default to empty array
            let existingAdditionsBreakdown = [];
            if (record.additionsBreakdown) {
                try {
                    existingAdditionsBreakdown = JSON.parse(record.additionsBreakdown);
                } catch (e) {
                    existingAdditionsBreakdown = [];
                }
            }
            
            // Append Festival Bonus
            existingAdditionsBreakdown.push({
                name: "Festival Bonus",
                amount: bonusAmount.toNumber()
            });

            await prisma.payrollRecord.update({
                where: { id: record.id },
                data: {
                    additions: newAdditions,
                    additionsBreakdown: JSON.stringify(existingAdditionsBreakdown),
                    netSalary: newNetSalary,
                }
            });
            appliedCount++;
        }

        revalidatePath("/hr/payroll");
        return { success: true, data: { count: appliedCount } };
    });
}


// --- Salary Increment ---

export async function createSalaryIncrement(data: {
    employeeId: string;
    amount: number;
    effectiveMonth: number;
    effectiveYear: number;
}) {
    return createAction("createSalaryIncrement", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        const increment = await prisma.salaryIncrement.create({
            data: {
                employeeId: data.employeeId,
                amount: new Decimal(data.amount),
                effectiveMonth: data.effectiveMonth,
                effectiveYear: data.effectiveYear
            }
        });

        return { success: true, data: increment };
    });
}

// --- Salary Components (Ratios) ---

export async function getSalaryComponents() {
    return createAction("getSalaryComponents", async () => {
        const ctx = await getAuthContext();
        if (!ctx) return { success: false, error: "Unauthorized" };

        await ensureSalaryComponents(ctx.company);
        const components = await prisma.salaryComponent.findMany({
            where: { company: ctx.company }
        });

        return {
            success: true,
            data: components.map(c => ({ ...c, ratio: c.ratio.toNumber() }))
        };
    });
}

export async function updateSalaryComponents(components: { name: string, ratio: number }[]) {
    return createAction("updateSalaryComponents", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }

        // Delete existing and recreate
        await prisma.salaryComponent.deleteMany({ where: { company: ctx.company } });
        await prisma.salaryComponent.createMany({
            data: components.map(c => ({
                company: ctx.company,
                name: c.name,
                ratio: new Decimal(c.ratio)
            }))
        });

        revalidatePath("/hr/payroll");
        return { success: true, data: null };
    });
}

// --- Leaves ---
// Added isPaid field for tracking paid/unpaid status
export async function getLeaveRequests(month?: number, year?: number) {
    return createAction("getLeaveRequests", async () => {
        const ctx = await getAuthContext();
        if (!ctx) return { success: false, error: "Unauthorized" };
        let whereClause: any = { employee: { company: ctx.company } };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            whereClause.OR = [
                { startDate: { gte: startDate, lte: endDate } },
                { endDate: { gte: startDate, lte: endDate } },
                { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] }
            ];
        }

        if (ctx.role === "Worker" || ctx.role === "VendorWorker") {
            whereClause.employee.userId = ctx.userId;
        }
        const leaves = await prisma.leaveRequest.findMany({
            where: whereClause,
            include: { employee: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: leaves as unknown as LeaveRequestWithEmployee[] };
    });
}

export async function getLeaveBalance(employeeId?: string) {
    return createAction("getLeaveBalance", async () => {
        const ctx = await getAuthContext();
        if (!ctx) return { success: false, error: "Unauthorized" };

        let targetId = employeeId;
        if (!targetId) {
            const employee = await prisma.employee.findUnique({ where: { userId: ctx.userId } });
            if (!employee) return { success: false, error: "Employee record not found" };
            targetId = employee.id;
        }

        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);

        const approvedLeaves = await prisma.leaveRequest.findMany({
            where: {
                employeeId: targetId,
                status: "Approved",
                isPaid: true,
                startDate: { gte: startOfYear },
            }
        });

        let usedDays = 0;
        approvedLeaves.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            usedDays += days;
        });

        const entitlement = 22;
        return { success: true, data: { entitlement, usedDays, remaining: entitlement - usedDays } };
    });
}

export async function createLeaveRequest(data: { type: string; startDate: string; endDate: string; reason: string; isPaid: boolean; employeeId?: string }) {
    return createAction("createLeaveRequest", async () => {
        const ctx = await getAuthContext();
        if (!ctx) return { success: false, error: "Unauthorized" };

        let targetEmployeeId = data.employeeId;

        // If no employeeId provided or user is not a manager, they can only request for themselves
        const isManager = ctx.role === "Owner" || ctx.role === "Manager" || ctx.role === "VendorManager";

        if (!isManager || !targetEmployeeId) {
            const employee = await prisma.employee.findUnique({ where: { userId: ctx.userId } });
            if (!employee || employee.company !== ctx.company) {
                return { success: false, error: "No employee record linked to your user account." };
            }
            targetEmployeeId = employee.id;
        } else {
            // Verify the target employee belongs to the same company
            const targetEmployee = await prisma.employee.findUnique({ where: { id: targetEmployeeId } });
            if (!targetEmployee || targetEmployee.company !== ctx.company) {
                return { success: false, error: "Employee not found or unauthorized." };
            }
        }

        const leave = await prisma.leaveRequest.create({
            data: {
                employeeId: targetEmployeeId,
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                reason: data.reason,
                isPaid: data.isPaid,
                status: "Pending"
            }
        });
        revalidatePath("/hr/leaves");
        return { success: true, data: leave };
    });
}

export async function updateLeaveRequestStatus(id: number, status: string) {
    return createAction("updateLeaveRequestStatus", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }
        const leave = await prisma.leaveRequest.findUnique({
            where: { id },
            include: { employee: true }
        });
        if (!leave || leave.employee.company !== ctx.company) {
            return { success: false, error: "Leave request not found or unauthorized" };
        }
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: { status }
        });
        revalidatePath("/hr/leaves");
        return { success: true, data: updated };
    });
}

// --- Documents ---

export async function getHRDocuments() {
    return createAction("getHRDocuments", async () => {
        const ctx = await getAuthContext();
        if (!ctx) return { success: false, error: "Unauthorized" };
        let whereClause: any = { employee: { company: ctx.company } };
        if (ctx.role === "Worker" || ctx.role === "VendorWorker") {
            whereClause.employee.userId = ctx.userId;
        }
        const documents = await prisma.hRDocument.findMany({
            where: whereClause,
            include: { employee: { select: { firstName: true, lastName: true, designation: true } } },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: documents };
    });
}

export async function createHRDocument(data: { employeeId: string; title: string; fileUrl: string; type: string }) {
    return createAction("createHRDocument", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }
        const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
        if (!employee || employee.company !== ctx.company) {
            return { success: false, error: "Employee not found or unauthorized" };
        }
        const doc = await prisma.hRDocument.create({
            data: {
                employeeId: data.employeeId,
                title: data.title,
                fileUrl: data.fileUrl,
                type: data.type
            }
        });
        revalidatePath("/hr/documents");
        return { success: true, data: doc };
    });
}

export async function deleteHRDocument(id: number) {
    return createAction("deleteHRDocument", async () => {
        const ctx = await getAuthContext();
        if (!ctx || (ctx.role !== "Owner" && ctx.role !== "Manager" && ctx.role !== "VendorManager")) {
            return { success: false, error: "Unauthorized" };
        }
        const doc = await prisma.hRDocument.findUnique({
            where: { id },
            include: { employee: true }
        });
        if (!doc || doc.employee.company !== ctx.company) {
            return { success: false, error: "Document not found or unauthorized" };
        }
        await prisma.hRDocument.delete({ where: { id } });
        revalidatePath("/hr/documents");
        return { success: true, data: null };
    });
}
