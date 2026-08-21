import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';

@Injectable()
export class UsersRepository {
  constructor(private _user: PrismaRepository<'user'>) {}

  getImpersonateUser(name: string) {
    return this._user.model.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: name,
            },
          },
          {
            email: {
              contains: name,
            },
          },
          {
            id: {
              contains: name,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
    });
  }

  getUserById(id: string) {
    return this._user.model.user.findFirst({
      where: {
        id,
      },
    });
  }

  // Plus-addressing (user+1@gmail.com, user+2@gmail.com, ...) is one real
  // inbox by construction, so it's the cheapest way to get repeated free
  // trials from a single identity — DISALLOW_PLUS can reject it outright,
  // but defaults to off (many legitimate users rely on plus-addressing for
  // their own organization), so it can't be the only defense. This doesn't
  // block registration or reject the email; it only tells the caller
  // whether *another* account already shares this address's base local-part
  // + domain, so the caller can withhold a fresh trial grant without
  // touching whether the account itself is allowed to exist.
  async hasPlusAddressedAliasHistory(email: string): Promise<boolean> {
    const at = email.indexOf('@');
    if (at === -1) return false;
    const domain = email.slice(at);
    const base = email.slice(0, at).split('+')[0];
    if (!base) return false;

    const count = await this._user.model.user.count({
      where: {
        providerName: Provider.LOCAL,
        OR: [
          { email: `${base}${domain}` },
          { email: { startsWith: `${base}+`, endsWith: domain } },
        ],
      },
    });
    return count > 0;
  }

  getUserByEmail(email: string) {
    return this._user.model.user.findFirst({
      where: {
        email,
        providerName: Provider.LOCAL,
      },
      include: {
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
      },
    });
  }

  activateUser(id: string) {
    return this._user.model.user.update({
      where: {
        id,
      },
      data: {
        activated: true,
      },
    });
  }

  getUserByProvider(providerId: string, provider: Provider) {
    return this._user.model.user.findFirst({
      where: {
        providerId,
        providerName: provider,
      },
    });
  }

  updatePassword(id: string, password: string) {
    return this._user.model.user.update({
      where: {
        id,
        providerName: Provider.LOCAL,
      },
      data: {
        password: AuthService.hashPassword(password),
        passwordResetRequired: false,
        // A password change is exactly when a stolen/leaked session JWT
        // should stop working - without this, the old token stays valid
        // for the rest of its lifetime (up to 24h) even after the victim's
        // own remediation. auth.middleware.ts compares this on every
        // request and rejects a mismatch.
        authSessionVersion: { increment: 1 },
      },
    });
  }

  changeAudienceSize(userId: string, audience: number) {
    return this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        audience,
      },
    });
  }

  async getPersonal(userId: string) {
    const user = await this._user.model.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        bio: true,
        picture: {
          select: {
            id: true,
            path: true,
          },
        },
      },
    });

    return user;
  }

  async changePersonal(userId: string, body: UserDetailDto) {
    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        name: body.fullname,
        bio: body.bio,
        picture: body.picture
          ? {
              connect: {
                id: body.picture.id,
              },
            }
          : {
              disconnect: true,
            },
      },
    });
  }

  async getEmailNotifications(userId: string) {
    return this._user.model.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        sendSuccessEmails: true,
        sendFailureEmails: true,
        sendStreakEmails: true,
      },
    });
  }

  async updateEmailNotifications(userId: string, body: EmailNotificationsDto) {
    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        sendSuccessEmails: body.sendSuccessEmails,
        sendFailureEmails: body.sendFailureEmails,
        sendStreakEmails: body.sendStreakEmails,
      },
    });
  }
}
