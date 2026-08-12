import { PrismaClient } from '@prisma/client';

const rollback = Symbol('rollback');
async function verifyMutation(mutation) {
  const prisma = new PrismaClient();
  let mutationSucceeded = false;
  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.adminAuditLog.create({
        data: { actorEmail: 'immutability-test@contentflow.invalid', action: 'test.immutability', resourceType: 'Test', severity: 'INFO' },
      });
      await mutation(tx, row.id);
      mutationSucceeded = true;
      throw Object.assign(new Error('unexpected mutation success'), { code: rollback });
    });
  } catch (error) {
    if (mutationSucceeded) return false;
    if (error?.code === rollback) return false;
    return true;
  } finally {
    await prisma.$disconnect();
  }
}

try {
  const updateBlocked = await verifyMutation((tx, id) => tx.adminAuditLog.update({ where: { id }, data: { reason: 'must fail' } }));
  const deleteBlocked = await verifyMutation((tx, id) => tx.adminAuditLog.delete({ where: { id } }));
  if (updateBlocked && deleteBlocked) {
    console.log(JSON.stringify({ updateBlocked: true, deleteBlocked: true }));
    process.exit(0);
  }
  throw new Error(`immutability assertion failed: updateBlocked=${updateBlocked}, deleteBlocked=${deleteBlocked}`);
} catch (error) {
  if (error?.errorCode === 'P1001' || error?.code === 'P1001') {
    console.error('AdminAuditLog immutability verification skipped: database is unavailable at DATABASE_URL.');
    process.exit(2);
  }
  console.error('AdminAuditLog immutability verification failed', error);
  process.exit(1);
}
