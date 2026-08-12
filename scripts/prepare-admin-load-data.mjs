import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const prefix = 'admin-load-20260812-';
try {
  if (process.argv.includes('--cleanup')) {
    const result = await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    console.log(JSON.stringify({ cleaned: result.count }));
  } else {
    const data = Array.from({ length: 1000 }, (_, index) => ({
      email: `${prefix}${String(index).padStart(4, '0')}@example.invalid`,
      providerName: 'LOCAL',
      timezone: 0,
      name: `Admin load user ${index}`,
      activated: true,
    }));
    const result = await prisma.user.createMany({ data, skipDuplicates: true });
    console.log(JSON.stringify({ inserted: result.count, prefix }));
  }
} finally {
  await prisma.$disconnect();
}
