import { Injectable, Logger } from '@nestjs/common';

export interface MailResult {
  sent: boolean;
  error?: string;
  id?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'onenight <onboarding@resend.dev>';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  private get apiKey(): string {
    return (process.env.RESEND_API_KEY || '').trim();
  }

  private get from(): string {
    return (process.env.RESEND_FROM || '').trim() || DEFAULT_FROM;
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async send(msg: MailMessage): Promise<MailResult> {
    const to = (msg.to || '').trim();
    const label = `"${msg.subject}" → ${to || '(no recipient)'}`;

    if (!to || !EMAIL_RE.test(to)) {
      const error = `לא נשלח מייל: כתובת נמען לא תקינה (${to || 'ריקה'})`;
      this.logger.error(
        `NOT SENT — ${label}: the recipient address is missing or malformed. ` +
          'For a listing notification this means the Dress row has no usable `email`.',
      );
      return { sent: false, error };
    }

    const apiKey = this.apiKey;
    if (!apiKey) {
      const error = 'לא נשלח מייל: RESEND_API_KEY אינו מוגדר בשרת';
      this.logger.error(
        `NOT SENT — ${label}: RESEND_API_KEY is not set in the server environment. ` +
          'Set it in backend/.env for local dev, or in the service environment ' +
          '(Render → Environment) in production. backend/.env is read by ' +
          'src/common/load-env.ts, imported first in main.ts.',
      );
      return { sent: false, error };
    }

    let res: Response;
    try {
      res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject: msg.subject,
          html: msg.html,
          ...(msg.text ? { text: msg.text } : {}),
          ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        }),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `NOT SENT — ${label}: could not reach ${RESEND_ENDPOINT} (${detail}). ` +
          'Check outbound network access from the server.',
        err instanceof Error ? err.stack : undefined,
      );
      return { sent: false, error: 'לא נשלח מייל: אין גישה לשירות הדואר' };
    }

    const bodyText = await res.text().catch(() => '');

    if (!res.ok) {
      let hint = '';
      if (res.status === 401 || res.status === 403) {
        hint =
          ' — usually either an invalid RESEND_API_KEY or a RESEND_FROM domain ' +
          `that is not verified in Resend (currently from="${this.from}").`;
      } else if (res.status === 422) {
        hint = ' — Resend rejected the payload; check the From/To formatting.';
      } else if (res.status === 429) {
        hint = ' — rate limited by Resend.';
      }
      this.logger.error(`NOT SENT — ${label}: Resend returned ${res.status}${hint} Body: ${bodyText}`);
      return { sent: false, error: `לא נשלח מייל: שירות הדואר החזיר שגיאה (${res.status})` };
    }

    let id: string | undefined;
    try {
      id = (JSON.parse(bodyText) as { id?: string })?.id;
    } catch {
    }
    this.logger.log(`sent — ${label}${id ? ` (resend id ${id})` : ''}`);
    return { sent: true, id };
  }
}
