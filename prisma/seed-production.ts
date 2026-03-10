import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined')
}

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding production (Admin only)...')

    // 1. Create default admin user
    const hashedPassword = await bcrypt.hash('PRODUCTION_PASSWORD_HERE', 10)

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
    console.log('Created admin user: admin@invofox.com / PRODUCTION_PASSWORD_HERE')

    // 2. Default Settings (Empty/Basic)
    await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            companyName: "My Company",
            email: "admin@invofox.com",
            address: "123 Business St",
            currency: "USD",
            taxRate: 0,
            defaultPaymentTerms: "due_on_receipt",
            logoUrl: "",
        }
    })
    console.log('Created default settings.')

    console.log('Production seeding finished.')
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
