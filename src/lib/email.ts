import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) sgMail.setApiKey(apiKey);

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "medhadherehelp@gmail.com";
  if (!apiKey) {
    // In development without SendGrid configured, log the link instead
    console.log(`[DEV] Verification email to ${to}: ${verificationUrl}`);
    return;
  }

  await sgMail.send({
    to,
    from: fromEmail,
    subject: "Set your MedAdhere password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e1b4b; margin-bottom: 8px;">Welcome to MedAdhere</h2>
        <p style="color: #374151; margin-bottom: 24px;">
          Your account has been created. Click the button below to set your password and get started.
          This link expires in 24 hours.
        </p>
        <a href="${verificationUrl}"
           style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none;
                  padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Set my password
        </a>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          If you did not expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}
