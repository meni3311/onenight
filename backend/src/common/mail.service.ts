import { Injectable, Logger } from '@nestjs/common';

/**
 * The outcome of one send attempt.
 *
 * Deliberately a return value rather than an exception. Every caller so far
 * is sending a *notification about something that already happened* — a
 * listing was approved, a listing was rejected. The database write is the
 * real work and it has committed by the time this runs; throwing here would
 * turn "we approved the dress but couldn't tell her" into "the approval
 * failed", which is both false and worse. Callers surface `sent` to the
 * admin and move on.
 */
export interface MailResult {
  sent: boolean;
  /** Present when `sent` is false. Safe to show a human — no secrets. */
  error?: string;
  /** Resend's message id, when it accepted the message. */
  id?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Resend derives one if omitted, but ours is better. */
  text?: string;
  replyTo?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'onenight <onboarding@resend.dev>';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Outbound email, via Resend's HTTP API.
 *
 * Calls the REST endpoint directly rather than the `resend` SDK — same choice
 * OtpService made, and for the same reason: it works whether or not the
 * package tree is installed. Unlike OtpService, this one never throws and
 * logs enough to diagnose a failure from the server log alone, which is the
 * whole point of extracting it. Every silent-failure mode that hid the
 * approval email is a distinct, named log line below.
 *
 * Configuration is read per-send rather than captured in a field, so a value
 * corrected in the environment takes effect on the next attempt instead of
 * requiring a restart — and so a missing one is reported at the moment it
 * actually mattered.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  private get apiKey(): string {
    return (process.env.RESEND_API_KEY || '').trim();
  }

  /**
   * The From header. Note this is the single most common cause of a Resend
   * send that fails *after* the key is correct: the domain has to be verified
   * in the Resend dashboard, and an unverified one comes back 403 with a
   * message saying so. The 403 branch below calls that out by name rather
   * than logging a bare status code.
   */
  private get from(): string {
    return (process.env.RESEND_FROM || '').trim() || DEFAULT_FROM;
  }

  /** True when email can actually go out. Read by callers that want to warn early. */
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
      /* error, not warn: in production this is a feature that is silently
         off, and a warn would read as routine noise. */
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
      /* Network-level: DNS, TLS, egress blocked by the host's firewall. */
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
      /* Log the whole response body. Resend's errors are specific and
         actionable ("The onenight.co.il domain is not verified", "API key is
         invalid") and truncating them to a status code is what turns a
         five-minute fix into an afternoon. */
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
      /* A 2xx with an unparseable body is still a success as far as Resend is
         concerned; the id is only used for log correlation. */
    }
    this.logger.log(`sent — ${label}${id ? ` (resend id ${id})` : ''}`);
    return { sent: true, id };
  }
}
