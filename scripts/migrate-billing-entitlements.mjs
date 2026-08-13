import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const planMap = { FREE: 'FREE', STANDARD: 'CREATOR', PRO: 'PRO', TEAM: 'STUDIO', ULTIMATE: 'AGENCY' };
const plans = [
  ['FREE', 'Free', 0, 200],
  ['STARTER', 'Starter', 4900, 1000],
  ['CREATOR', 'Creator', 9900, 2500],
  ['PRO', 'Pro', 19900, 6000],
  ['STUDIO', 'Studio', 39900, 16000],
  ['AGENCY', 'Agency', 89900, 40000],
];

const balanceSnapshot = async () => {
  const rows = await prisma.creditLot.groupBy({
    by: ['organizationId'],
    _sum: { remainingCredits: true },
  });
  return new Map(rows.map((row) => [row.organizationId, row._sum.remainingCredits || 0]));
};

try {
  const before = await balanceSnapshot();
  const organizations = await prisma.organization.findMany({
    select: { id: true, subscription: { select: { subscriptionTier: true, deletedAt: true } }, billingSubscription: { select: { id: true } } },
  });
  const candidates = organizations.filter((organization) => !organization.billingSubscription);
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', organizations: organizations.length, subscriptionsToCreate: candidates.length }, null, 2));
  if (!apply) {
    console.log('No changes made. Run with --apply after reviewing this report.');
    process.exit(0);
  }

  for (const [code, name, priceCents, monthlyCredits] of plans) {
    await prisma.billingPlan.upsert({ where: { code }, update: {}, create: { code, name, priceCents, monthlyCredits } });
  }
  for (const organization of candidates) {
    const legacy = organization.subscription?.deletedAt ? 'FREE' : String(organization.subscription?.subscriptionTier || 'FREE');
    const code = planMap[legacy] || 'FREE';
    const plan = await prisma.billingPlan.findUniqueOrThrow({ where: { code } });
    await prisma.billingSubscription.upsert({
      where: { organizationId: organization.id },
      update: {},
      create: {
        organizationId: organization.id,
        planId: plan.id,
        provider: 'MIGRATION',
        status: 'ACTIVE',
        metadata: { migratedFrom: legacy, migratedAt: new Date().toISOString() },
      },
    });
  }

  const after = await balanceSnapshot();
  const changedBalances = [...new Set([...before.keys(), ...after.keys()])]
    .filter((organizationId) => (before.get(organizationId) || 0) !== (after.get(organizationId) || 0));
  if (changedBalances.length) throw new Error(`Credit balance changed for ${changedBalances.length} organizations`);
  console.log(JSON.stringify({ migrated: candidates.length, changedBalances: 0 }, null, 2));
} finally {
  await prisma.$disconnect();
}
