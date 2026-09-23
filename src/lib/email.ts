/**
 * Email sending abstraction.
 *
 * No SMTP/provider is wired up yet, so this logs the message to the server
 * console. To enable real emails, integrate a provider here (Resend, SES,
 * nodemailer/SMTP) using env vars, and keep the same function signature.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const body = [
    `To: ${to}`,
    `Subject: Reset your News Trail password`,
    ``,
    `We received a request to reset your News Trail password.`,
    `Click the link below to set a new password (valid for 1 hour):`,
    resetUrl,
    ``,
    `If you didn't request this, you can ignore this email.`,
  ].join("\n");

  // eslint-disable-next-line no-console
  console.log("\n===== PASSWORD RESET EMAIL (dev) =====\n" + body + "\n======================================\n");
}

export function emailConfigured() {
  // Flip to true once a real provider is integrated above.
  return false;
}
