/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 * Handles password reset OTP verification delivery for LRSYS
 */

export interface SendOtpOptions {
  toEmail: string;
  toName: string;
  otpCode: string;
  minutesValid?: number;
}

export interface BrevoResult {
  success: boolean;
  delivered: boolean;
  simulated?: boolean;
  otpPreview?: string;
  message: string;
  messageId?: string;
  warning?: string;
}

export function isBrevoConfigured(): boolean {
  const key = process.env.BREVO_API_KEY || '';
  return key.trim().length > 10 && !key.includes('your_brevo_api_key');
}

export async function sendPasswordOtpEmail(options: SendOtpOptions): Promise<BrevoResult> {
  const { toEmail, toName, otpCode, minutesValid = 10 } = options;
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'vehanrajintha22@gmail.com').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'Sri Lanka Customs (LRSYS)').trim();

  // Adaptive HTML email template (Light theme by default matching Gmail/Outlook, Dark theme adjustable if client in dark mode)
  const htmlContent = `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>LRSYS Security Verification Passcode</title>
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    /* Dark Mode Media Query */
    @media (prefers-color-scheme: dark) {
      .email-bg {
        background-color: #0b0f17 !important;
      }
      .email-card {
        background-color: #111827 !important;
        border-color: #1f2937 !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
      }
      .header-border {
        border-bottom-color: #1f2937 !important;
      }
      .text-title {
        color: #f8fafc !important;
      }
      .text-sub {
        color: #94a3b8 !important;
      }
      .text-body {
        color: #cbd5e1 !important;
      }
      .text-bold {
        color: #ffffff !important;
      }
      .badge-header {
        background-color: rgba(14, 165, 233, 0.15) !important;
        border-color: rgba(14, 165, 233, 0.35) !important;
        color: #38bdf8 !important;
      }
      .otp-box {
        background-color: #0f172a !important;
        border-color: #0284c7 !important;
      }
      .otp-subhead {
        color: #94a3b8 !important;
      }
      .otp-code {
        color: #38bdf8 !important;
        text-shadow: 0 0 20px rgba(56, 189, 248, 0.45) !important;
      }
      .expiry-tag {
        background-color: rgba(234, 179, 8, 0.15) !important;
        border-color: rgba(234, 179, 8, 0.3) !important;
        color: #facc15 !important;
      }
      .security-box {
        background-color: rgba(239, 68, 68, 0.1) !important;
        border-left-color: #ef4444 !important;
      }
      .security-text {
        color: #fca5a5 !important;
      }
      .session-pill {
        background-color: #1e293b !important;
        border-color: #334155 !important;
        color: #94a3b8 !important;
      }
      .footer-bg {
        background-color: #0d131f !important;
        border-top-color: #1f2937 !important;
        color: #64748b !important;
      }
    }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <!-- Full Width Background Table -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-bg" style="background-color: #f1f5f9; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Responsive 560px max width) -->
        <table role="presentation" width="100%" class="email-card" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08);">
          
          <!-- Header Banner -->
          <tr>
            <td class="header-border" style="padding: 34px 32px 24px 32px; border-bottom: 1px solid #f1f5f9; text-align: center;">
              <!-- Official Brand Pill -->
              <div class="badge-header" style="display: inline-block; padding: 7px 18px; border-radius: 999px; background-color: #f0f9ff; border: 1px solid #bae6fd; margin-bottom: 16px;">
                <span style="font-size: 11px; font-weight: 700; color: #0284c7; letter-spacing: 1.5px; text-transform: uppercase;">
                  Sri Lanka Customs • Terminal Security
                </span>
              </div>
              <h1 class="text-title" style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.3;">
                Password Verification Code
              </h1>
              <p class="text-sub" style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">
                One-Time Single-Use Security Passcode (OTP)
              </p>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 32px;">
              <p class="text-body" style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Hello <strong class="text-bold" style="color: #0f172a;">${toName || 'Customs Officer'}</strong>,
              </p>
              <p class="text-body" style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                A request was submitted from the <strong class="text-bold" style="color: #0f172a;">LRSYS CusDec Long Room System</strong> to change your officer account password. Use the single-use passcode below to authorize your session:
              </p>

              <!-- OTP Passcode Card -->
              <div class="otp-box" style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 16px; padding: 26px 20px; text-align: center; margin-bottom: 24px;">
                <div class="otp-subhead" style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #0369a1; margin-bottom: 10px; font-weight: 700;">
                  Your 6-Digit Passcode
                </div>
                <div class="otp-code" style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0284c7; text-align: center; margin-left: 12px; margin-bottom: 12px; line-height: 1.1;">
                  ${otpCode}
                </div>
                <div class="expiry-tag" style="display: inline-block; background-color: #fef3c7; border: 1px solid #fde68a; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 999px;">
                  ⏱ Valid for ${minutesValid} minutes
                </div>
              </div>

              <!-- Security Advisory Alert -->
              <div class="security-box" style="background-color: #fff1f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
                <p class="security-text" style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.6;">
                  <strong>Important Security Notice:</strong> Never share this passcode with anyone. Sri Lanka Customs IT and Long Room staff will never ask for your password or OTP. If you did not initiate this change, contact your Long Room Administrator immediately.
                </p>
              </div>

              <!-- Session / Recipient Metadata -->
              <div style="font-size: 12px; color: #64748b;">
                Authorized session for: 
                <span class="session-pill" style="display: inline-block; background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 3px 10px; border-radius: 6px; font-family: monospace; font-weight: 600; color: #334155; margin-left: 4px;">
                  ${toEmail}
                </span>
              </div>
            </td>
          </tr>

          <!-- Official Terminal Footer -->
          <tr>
            <td class="footer-bg" style="padding: 22px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #64748b;">
                Sri Lanka Customs • Long Room Clearance Directorate (LRSYS)
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                Long Room Division • Customs House, Colombo 01, Sri Lanka
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Check if Brevo API Key is configured
  if (!isBrevoConfigured()) {
    console.log('\n======================================================');
    console.log(' [BREVO EMAIL NOTIFICATION - DEVELOPMENT SIMULATION] ');
    console.log('======================================================');
    console.log(` Recipient:  ${toName} <${toEmail}>`);
    console.log(` Passcode:   >>> ${otpCode} <<<`);
    console.log(` Expires In: ${minutesValid} minutes`);
    console.log(' Reason:     BREVO_API_KEY is not yet configured in .env');
    console.log('======================================================\n');

    return {
      success: true,
      delivered: false,
      simulated: true,
      message: `Verification OTP generated (simulated in development console).`
    };
  }

  // Live Brevo Transactional Email Send
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: toEmail,
            name: toName || toEmail
          }
        ],
        subject: `[LRSYS Security] Your Password Verification OTP: ${otpCode}`,
        htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('[Brevo API Error]:', response.status, data);
      const isIpBlocked =
        response.status === 401 ||
        response.status === 403 ||
        String(data?.message || '').toLowerCase().includes('ip') ||
        String(data?.code || '').toLowerCase().includes('unauthorized');

      const message = isIpBlocked
        ? 'Brevo Security Alert: API call blocked by IP address review. In the alert email from Brevo, click "[Stop the review of IP addresses]" or disable IP Review in Brevo Security Settings.'
        : `Brevo email delivery failed: ${data?.message || 'HTTP status ' + response.status}`;

      return {
        success: false,
        delivered: false,
        simulated: false,
        message,
        warning: data?.message || `Brevo HTTP ${response.status}`
      };
    }

    console.log(`[Brevo Email Sent]: Successfully dispatched OTP to ${toEmail}. Message ID: ${data.messageId}`);
    return {
      success: true,
      delivered: true,
      message: `Verification OTP dispatched to ${toEmail} via Brevo.`,
      messageId: data.messageId
    };
  } catch (err: any) {
    console.error('[Brevo Dispatch Exception]:', err.message);
    return {
      success: false,
      delivered: false,
      simulated: false,
      message: 'Email dispatch error occurred; check server network logs.',
      warning: err.message
    };
  }
}

