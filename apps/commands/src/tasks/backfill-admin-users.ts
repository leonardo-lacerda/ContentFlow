import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { AdminUserService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-user.service';

// One-off Fase 0 migration: creates an AdminUser(OWNER) row for every user
// that still only has the legacy `isSuperAdmin` boolean, so the hardened
// admin session/MFA/audit stack has something to attach to. Safe to re-run —
// skips users that already have an AdminUser row.
// See docs/admin/PLANO-SISTEMA-ADMIN.md.
@Injectable()
export class BackfillAdminUsers {
  constructor(
    private _user: PrismaRepository<'user'>,
    private _adminUserService: AdminUserService
  ) {}

  @Command({
    command: 'admin:backfill-owners',
    describe:
      'Create an AdminUser(OWNER) row for every legacy isSuperAdmin=true user',
  })
  async run() {
    const legacyAdmins = await this._user.model.user.findMany({
      where: { isSuperAdmin: true },
      select: { id: true, email: true },
    });

    let created = 0;
    let skipped = 0;

    for (const legacyAdmin of legacyAdmins) {
      const existing = await this._adminUserService.getByUserId(legacyAdmin.id);
      if (existing) {
        skipped++;
        continue;
      }
      await this._adminUserService.create({
        userId: legacyAdmin.id,
        role: 'OWNER',
        createdBy: 'migration:isSuperAdmin-backfill',
      });
      created++;
      console.log(`Created AdminUser(OWNER) for ${legacyAdmin.email}`);
    }

    console.log(
      `Done. Created: ${created}, already existed: ${skipped}, total legacy admins: ${legacyAdmins.length}`
    );
    return true;
  }
}
