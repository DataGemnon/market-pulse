import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Market Pulse <onboarding@resend.dev>';
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://market-pulse.vercel.app';

function formatPrice(price: number, currency = 'USD'): string {
    const sym =
        currency === 'EUR' ? '€' :
        currency === 'GBP' || currency === 'GBp' ? '£' :
        currency === 'JPY' ? '¥' : '$';
    return `${sym}${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildAlertEmailHtml(opts: {
    symbol: string;
    name: string;
    type: 'above' | 'below';
    targetPrice: number;
    currentPrice: number;
    currency: string;
}): string {
    const { symbol, name, type, targetPrice, currentPrice, currency } = opts;
    const isAbove   = type === 'above';
    const accentCol = isAbove ? '#10b981' : '#ef4444';
    const accentBg  = isAbove ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
    const accentBdr = isAbove ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)';
    const emoji     = isAbove ? '📈' : '📉';
    const direction = isAbove ? 'rose above' : 'fell below';
    const label     = isAbove ? 'TARGET CROSSED ↑' : 'TARGET CROSSED ↓';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Price Alert — ${symbol}</title>
</head>
<body style="margin:0;padding:0;background-color:#07070f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;padding:0 16px;">

          <!-- Logo / header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#0891b2,#7c3aed);border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:18px;line-height:36px;">⚡</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Market Pulse</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#12121e;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:28px;">

              <!-- Alert badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background:${accentBg};border:1px solid ${accentBdr};border-radius:8px;padding:5px 12px;">
                    <span style="color:${accentCol};font-size:11px;font-weight:700;letter-spacing:0.1em;">${label}</span>
                  </td>
                </tr>
              </table>

              <!-- Stock identity -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
                <tr>
                  <td style="background:${accentBg};border-radius:14px;width:52px;height:52px;text-align:center;vertical-align:middle;font-size:24px;">${emoji}</td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <div style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px;">${symbol}</div>
                    <div style="color:#64748b;font-size:13px;margin-top:2px;">${name}</div>
                  </td>
                </tr>
              </table>

              <!-- Alert message -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;">
                    <div style="color:#94a3b8;font-size:12px;margin-bottom:6px;">Your alert</div>
                    <div style="color:white;font-size:15px;line-height:1.5;">
                      <strong style="color:white;">${symbol}</strong>
                      ${direction}
                      <strong style="color:${accentCol};">${formatPrice(targetPrice, currency)}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Price grid -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td width="48%" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;">
                    <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Current Price</div>
                    <div style="color:white;font-size:22px;font-weight:800;">${formatPrice(currentPrice, currency)}</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:${accentBg};border:1px solid ${accentBdr};border-radius:12px;padding:16px;text-align:center;">
                    <div style="color:${accentCol};font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Your Target</div>
                    <div style="color:${accentCol};font-size:22px;font-weight:800;">${formatPrice(targetPrice, currency)}</div>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}"
                       style="display:inline-block;background:linear-gradient(135deg,#0891b2,#7c3aed);color:white;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.01em;">
                      Open Market Pulse →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#1e293b;font-size:11px;margin:0;line-height:1.6;">
                You received this because you set a price alert on Market Pulse.<br/>
                Sign in to manage your alerts.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface AlertEmailPayload {
    to: string;
    symbol: string;
    name: string;
    type: 'above' | 'below';
    targetPrice: number;
    currentPrice: number;
    currency?: string;
}

export async function sendPriceAlertEmail(payload: AlertEmailPayload): Promise<void> {
    const { to, symbol, name, type, targetPrice, currentPrice, currency = 'USD' } = payload;
    const isAbove   = type === 'above';
    const direction = isAbove ? 'rose above' : 'fell below';
    const subject   = `${isAbove ? '📈' : '📉'} ${symbol} ${direction} ${formatPrice(targetPrice, currency)}`;

    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: buildAlertEmailHtml({ symbol, name, type, targetPrice, currentPrice, currency }),
    });
}
