import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
await p.location.deleteMany({ where: { source: 'anitabi' } })
await p.work.deleteMany({ where: { source: 'anitabi' } })
console.log('Cleared anitabi data')
await p.$disconnect()
