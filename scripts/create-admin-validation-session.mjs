import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findFirst({ where: { deletedAt: null, activated: true } });
  if (!user) throw new Error('No active user exists for validation');
  const admin = await prisma.adminUser.upsert({
    where: { userId: user.id },
    update: { role: 'OWNER', status: 'ACTIVE', mfaEnabled: true },
    create: { userId: user.id, role: 'OWNER', status: 'ACTIVE', mfaEnabled: true },
  });
  const jti = randomUUID();
  await prisma.adminSession.create({ data: { adminUserId: admin.id, jti, expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt: new Date() } });
  process.stdout.write(jwt.sign({ sub: admin.id, jti, typ: 'admin' }, process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '60m' }));
} finally {
  await prisma.$disconnect();
}
