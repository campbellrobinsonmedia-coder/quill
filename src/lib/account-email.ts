import { appOrigin, pinResetEmail, sendEmail, verificationEmail } from "@/lib/email";
import { issueToken } from "@/lib/auth-tokens";

export async function sendVerificationEmail(user: { id: string; email: string }) {
  const raw = await issueToken(user.id, "VERIFY_EMAIL");
  const link = `${await appOrigin()}/verify-email?token=${raw}`;
  await sendEmail({ to: user.email, ...verificationEmail(link) });
}

export async function sendPinResetEmail(user: { id: string; email: string }) {
  const raw = await issueToken(user.id, "RESET_PIN");
  const link = `${await appOrigin()}/reset-pin?token=${raw}`;
  await sendEmail({ to: user.email, ...pinResetEmail(link) });
}
