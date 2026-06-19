import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(to: string, name: string, code: string) {
  try {
    await resend.emails.send({
      from: 'TargetZero <onboarding@resend.dev>', // replace with your verified domain later
      to,
      subject: `Your verification code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0F172A; border-radius: 16px;">
          <h2 style="color: #fff; margin-bottom: 8px;">Hi ${name} 👋</h2>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
            Welcome to Preparation! Use the code below to verify your account and start tracking your exam prep.
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
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err };
  }
}
