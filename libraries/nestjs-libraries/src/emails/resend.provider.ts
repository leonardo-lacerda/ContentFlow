import { Resend } from 'resend';
import { Logger } from '@nestjs/common';
import { EmailInterface } from '@gitroom/nestjs-libraries/emails/email.interface';

const logger = new Logger('ResendProvider');

export class ResendProvider implements EmailInterface {
  name = 'resend';
  validateEnvKeys = ['RESEND_API_KEY'];
  // Constructed when this class is instantiated (EMAIL_PROVIDER=resend), not
  // when this module is imported. EmailService imports every provider class
  // regardless of which one is selected, so building the Resend client at
  // module scope crashed the whole process on boot whenever RESEND_API_KEY
  // was unset — even when Resend was never the configured provider. The SDK
  // throws on an empty key; the placeholder keeps construction safe, and any
  // real send attempt still fails clearly (caught below) if left unconfigured.
  private resend = new Resend(process.env.RESEND_API_KEY || 're_unconfigured');
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string,
    replyTo?: string
  ) {
    try {
      const sends = await this.resend.emails.send({
        from: `${emailFromName} <${emailFromAddress}>`,
        to,
        subject,
        html,
        ...(replyTo && { reply_to: replyTo }),
      });

      return sends;
    } catch (err) {
      logger.error('Failed to send email via Resend', err);
    }

    return { sent: false };
  }
}
