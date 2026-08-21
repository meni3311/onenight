import { MailMessage } from '../common/mail.service';

const CREAM = '#FAF6F1';
const BORDEAUX = '#6B2D2D';
const DARK = '#2A1F1F';
const ROSE = '#C4A0A0';
const MUTED = '#9b8d88';
const HAIRLINE = '#ece2dd';

export function listingUrl(dressId: string): string {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
  return `${base}/#dress=${encodeURIComponent(dressId)}`;
}

function shell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
  <body style="margin:0;padding:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid ${HAIRLINE};">
            <tr>
              <td align="center" style="padding:36px 28px 4px;">
                <div style="font-style:italic;font-size:30px;color:${BORDEAUX};letter-spacing:.5px;">onenight</div>
                <div style="font-size:13px;color:${MUTED};margin-top:4px;">השכרת שמלות ערב</div>
              </td>
            </tr>
            ${bodyHtml}
          </table>
          <div style="color:${ROSE};font-size:12px;margin-top:16px;">© onenight</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BORDEAUX};color:#ffffff;text-decoration:none;font-size:14px;letter-spacing:.06em;padding:13px 34px;">${label}</a>`;
}

function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface DressMailContext {
  title: string;
  id: string;
  rejectReason?: string | null;
}

export function approvedMail(to: string, dress: DressMailContext): MailMessage {
  const url = listingUrl(dress.id);
  const title = esc(dress.title);

  return {
    to,
    subject: 'השמלה שלך עלתה לאתר onenight 🎉',
    html: shell(`
            <tr>
              <td align="center" style="padding:20px 28px 0;color:${DARK};font-size:20px;font-weight:bold;">
                המודעה שלך אושרה
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 28px 0;color:${DARK};font-size:15px;line-height:1.8;">
                שמחות לבשר ש<strong>"${title}"</strong> עברה את הבדיקה שלנו ומופיעה עכשיו בגלריה — פתוחה לפניות משוכרות.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 28px 8px;">
                ${button(url, 'לצפייה במודעה')}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 28px 32px;color:${MUTED};font-size:12px;line-height:1.7;">
                אם הכפתור לא עובד, אפשר להעתיק את הקישור:<br />
                <span style="color:${BORDEAUX};word-break:break-all;">${esc(url)}</span>
              </td>
            </tr>`),
    text: [
      'המודעה שלך אושרה',
      '',
      `"${dress.title}" עברה את הבדיקה שלנו ומופיעה עכשיו בגלריה של onenight.`,
      '',
      `לצפייה במודעה: ${url}`,
    ].join('\n'),
  };
}

export function rejectedMail(to: string, dress: DressMailContext): MailMessage {
  const title = esc(dress.title);
  const reason = (dress.rejectReason || '').trim();

  return {
    to,
    subject: 'עדכון לגבי המודעה שלך ב-onenight',
    html: shell(`
            <tr>
              <td align="center" style="padding:20px 28px 0;color:${DARK};font-size:20px;font-weight:bold;">
                המודעה עדיין לא אושרה
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 28px 0;color:${DARK};font-size:15px;line-height:1.8;">
                עברנו על <strong>"${title}"</strong> ולצערנו היא לא אושרה בשלב הזה.
              </td>
            </tr>
            ${
              reason
                ? `<tr>
              <td style="padding:18px 28px 0;">
                <div style="background:${CREAM};border-inline-start:3px solid ${ROSE};padding:14px 16px;color:${DARK};font-size:14px;line-height:1.7;">
                  <div style="color:${MUTED};font-size:11px;letter-spacing:.1em;margin-bottom:6px;">סיבת הדחייה</div>
                  ${esc(reason)}
                </div>
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td align="center" style="padding:20px 28px 32px;color:${MUTED};font-size:13px;line-height:1.8;">
                אפשר לתקן ולשלוח שוב — נשמח לראות אותה באתר.
              </td>
            </tr>`),
    text: [
      'המודעה עדיין לא אושרה',
      '',
      `עברנו על "${dress.title}" ולצערנו היא לא אושרה בשלב הזה.`,
      ...(reason ? ['', `סיבת הדחייה: ${reason}`] : []),
      '',
      'אפשר לתקן ולשלוח שוב.',
    ].join('\n'),
  };
}
