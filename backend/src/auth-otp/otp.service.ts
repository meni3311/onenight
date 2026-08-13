import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';

interface OtpRecord {
  code: string;
  expires: number;
}

/**
 * Email OTP service.
 *
 * Codes are kept in memory (Map) with a 10-minute expiry — fine for this app.
 * Email delivery uses Resend. The official `resend` SDK is declared in
 * package.json, but to stay runtime-safe even before `npm install`, we call
 * Resend's HTTP API directly (https://api.resend.com/emails) with the API key
 * from RESEND_API_KEY. If no key is configured the code is logged to the
 * console so the flow still works in local dev.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger('OtpService');
  private readonly store = new Map<string, OtpRecord>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly from = process.env.RESEND_FROM || 'onenight <onboarding@resend.dev>';

  private normalize(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  async sendOtp(email: string): Promise<{ success: true }> {
    const addr = this.normalize(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      throw new BadRequestException('כתובת אימייל לא תקינה');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.store.set(addr, { code, expires: Date.now() + this.TTL_MS });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY missing — OTP for ${addr} is ${code}`);
      return { success: true };
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [addr],
        subject: 'הקוד שלך ל-onenight',
        html: this.emailTemplate(code),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`Resend send failed (${res.status}): ${detail}`);
      throw new BadRequestException('שליחת המייל נכשלה, נסי שוב');
    }

    return { success: true };
  }

  verifyOtp(email: string, code: string): { success: true; token: string } {
    const addr = this.normalize(email);
    const record = this.store.get(addr);

    if (!record) throw new BadRequestException('לא נשלח קוד לכתובת זו');
    if (Date.now() > record.expires) {
      this.store.delete(addr);
      throw new BadRequestException('הקוד פג תוקף, שלחי קוד חדש');
    }
    if (record.code !== String(code || '').trim()) {
      throw new BadRequestException('קוד שגוי');
    }

    this.store.delete(addr); // single-use
    const token = randomBytes(24).toString('hex');
    return { success: true, token };
  }

  /** Branded, RTL email body showing the 6-digit code. */
  private emailTemplate(code: string): string {
    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
  <body style="margin:0;padding:0;background:#f6f1ee;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ee;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece2dd;">
            <tr>
              <td align="center" style="padding:36px 28px 8px;">
                <div style="font-style:italic;font-size:30px;color:#6B2D2D;letter-spacing:.5px;">onenight</div>
                <div style="font-size:13px;color:#9b8d88;margin-top:4px;">השכרת שמלות ערב</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 28px 4px;color:#2A1F1F;font-size:16px;">
                קוד האימות שלך
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 28px 8px;">
                <div style="display:inline-block;font-size:40px;font-weight:700;letter-spacing:10px;color:#2A1F1F;background:#f6f1ee;border-radius:12px;padding:16px 28px;">
                  ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 28px 36px;color:#9b8d88;font-size:13px;line-height:1.6;">
                הקוד תקף ל-10 דקות. אם לא ביקשת קוד, אפשר להתעלם מהמייל הזה.
              </td>
            </tr>
          </table>
          <div style="color:#b3a8a3;font-size:12px;margin-top:16px;">© onenight</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
