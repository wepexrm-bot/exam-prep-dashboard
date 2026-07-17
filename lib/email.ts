import { BrevoClient } from '@getbrevo/brevo';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

const client = BREVO_API_KEY ? new BrevoClient({ apiKey: BREVO_API_KEY }) : null;

type EmailType = 'verification' | 'reset';

async function sendEmail(to: string, name: string, code: string, type: EmailType) {
  if (!client || !BREVO_SENDER_EMAIL) {
    const msg = !BREVO_API_KEY
      ? 'BREVO_API_KEY not configured'
      : 'BREVO_SENDER_EMAIL not configured';
    console.warn(`Email not configured (${msg}) — failing open with fallback code.`);
    return { success: false, code, error: new Error(msg) };
  }

  const isReset = type === 'reset';
  const subject = isReset ? `Password reset code: ${code}` : `Your verification code: ${code}`;
  const heading = isReset ? 'Password reset' : `Hi ${name}`;
  const bodyText = isReset
    ? `You requested to reset your password. Use the code below to set a new password and regain access to your account.`
    : `Welcome to Preparation! Use the code below to verify your account and start tracking your exam prep.`;

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: 'Preparation', email: BREVO_SENDER_EMAIL },
      to: [{ email: to, name }],
      subject,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0F172A; border-radius: 16px;">
          <h2 style="color: #fff; margin-bottom: 8px;">${heading}</h2>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
            ${bodyText}
          </p>
          <div style="background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #22D3EE;">${code}</span>
          </div>
          <p style="color: #64748B; font-size: 12px;">
            This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    console.log(`Brevo ${type} email sent to`, to);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error('Email send error:', message);
    return { success: false, code, error: new Error(message) };
  }
}

export async function sendVerificationEmail(to: string, name: string, code: string) {
  return sendEmail(to, name, code, 'verification');
}

export async function sendResetEmail(to: string, name: string, code: string) {
  return sendEmail(to, name, code, 'reset');
}