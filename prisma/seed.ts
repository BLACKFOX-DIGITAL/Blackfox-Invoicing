import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const MOCK_SETTINGS = {
    companyName: "Blackfox Digital",
    email: "billing@blackfoxdigital.com",
    address: "House 545/A, Road 11, Adabor\nDhaka 1207, Bangladesh",
    currency: "USD",
    taxRate: 0,
    defaultPaymentTerms: "Net 30",
    logoUrl: "",
    paymentMethods: [
        { type: "Bank Transfer", name: "Main Bank", details: "Bank: XYZ\nAcc: 123456" }
    ]
};

const MOCK_CUSTOMERS: any[] = [];
const MOCK_SERVICES: any[] = [];
const MOCK_ALL_WORK_LOGS: any[] = [];
const MOCK_ALL_INVOICES: any[] = [];
const MOCK_INVOICE_ITEMS: any[] = [];
const MOCK_USERS: any[] = [];
import bcrypt from 'bcryptjs'

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined')
}

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // Users
    // Create a default admin user
    const hashedPassword = await bcrypt.hash('password123', 10)

    await prisma.user.upsert({
        where: { email: 'admin@invofox.com' },
        update: {},
        create: {
            name: 'Admin User',
            email: 'admin@invofox.com',
            password: hashedPassword,
            role: 'Owner'
        }
    })
    console.log('Created admin user: admin@invofox.com / password123')

    // Settings
    await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            companyName: MOCK_SETTINGS.companyName,
            email: MOCK_SETTINGS.email,
            address: MOCK_SETTINGS.address,
            currency: MOCK_SETTINGS.currency,
            taxRate: MOCK_SETTINGS.taxRate,
            defaultPaymentTerms: MOCK_SETTINGS.defaultPaymentTerms,
            logoUrl: MOCK_SETTINGS.logoUrl || "",
        }
    })

    // Payment Methods
    let pmIdCounter = 1;
    for (const method of MOCK_SETTINGS.paymentMethods) {
        await prisma.paymentMethod.upsert({
            where: { id: pmIdCounter },
            update: {
                type: method.type,
                name: method.name,
                details: method.details
            },
            create: {
                id: pmIdCounter,
                type: method.type,
                name: method.name,
                details: method.details
            }
        })
        pmIdCounter++;
    }

    // Customers
    for (const c of MOCK_CUSTOMERS) {
        await prisma.customer.upsert({
            where: { id: c.id },
            update: {},
            create: {
                id: c.id,
                name: c.name,
                email: c.email,
                status: c.status,
                currency: c.currency,
                paymentTerms: (c as any).paymentTerms,
                additionalContacts: (c as any).additionalContacts ? JSON.stringify((c as any).additionalContacts) : null,
                address: (c as any).address,
                phone: (c as any).phone,
                taxId: (c as any).taxId,
                paymentMethodId: c.name === "Acme Corp" ? 1 : undefined
            },
        })
    }

    // Services
    for (const s of MOCK_SERVICES) {
        await prisma.service.upsert({
            where: { id: s.id },
            update: {},
            create: {
                id: s.id,
                name: s.name,
                description: s.description,
                rate: s.rate,
                customerId: s.customerId || null,
                customerName: s.customerName
            }
        })
    }

    // Work Logs
    for (const l of MOCK_ALL_WORK_LOGS) {
        await prisma.workLog.upsert({
            where: { id: l.id },
            update: {},
            create: {
                id: l.id,
                date: new Date(l.date),
                customerId: l.customerId,
                serviceId: l.serviceId,
                quantity: l.quantity,
                rate: l.rate,
                total: l.total,
                status: l.status,
                description: l.description
            }
        })
    }

    // Invoices
    for (const i of MOCK_ALL_INVOICES) {
        const subtotal = parseFloat(i.subtotal.replace(/[$,]/g, ''))
        const tax = parseFloat(i.tax.replace(/[$,]/g, ''))
        const total = parseFloat(i.total.replace(/[$,]/g, ''))

        await prisma.invoice.upsert({
            where: { id: i.id },
            update: {
                dueDate: i.dueDate ? new Date(i.dueDate) : null,
            },
            create: {
                id: i.id,
                customerId: i.customerId,
                clientName: i.client,
                date: new Date(i.date),
                dueDate: i.dueDate ? new Date(i.dueDate) : null,
                subtotal: subtotal,
                tax: tax,
                total: total,
                status: i.status,
            }
        })
    }

    // Invoice Items
    for (const item of MOCK_INVOICE_ITEMS) {
        await prisma.invoiceItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
                id: item.id,
                invoiceId: item.invoiceId,
                serviceName: item.service,
                quantity: item.quantity,
                rate: item.rate,
                total: item.total
            }
        })
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
