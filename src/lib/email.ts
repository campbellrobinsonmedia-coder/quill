import { headers } from "next/headers";

// Outgoing email. In production it goes through Resend's HTTP API; set
// RESEND_API_KEY and EMAIL_FROM (a sender on a domain verified with Resend) to
// turn it on. Until then every email-dependent feature (verification, PIN
// reset) stays switched off, so the app behaves exactly as it did before.
// In development, EMAIL_TRANSPORT=console prints the email to the server log.

export type EmailTransport = "resend" | "console";

export function emailTransport(): EmailTransport | null {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  if (process.env.EMAIL_TRANSPORT === "console" && process.env.NODE_ENV !== "production") {
    return "console";
  }
  return null;
}

export const emailEnabled = () => emailTransport() !== null;

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const transport = emailTransport();
  if (transport === "console") {
    console.log(`\n[email → ${message.to}] ${message.subject}\n${message.text}\n`);
    return;
  }
  if (transport !== "resend") throw new Error("Email isn't configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
}

// Links in emails must point at the real site. APP_URL wins when set; otherwise
// it's read from the request, which on Vercel is the deployment's own host.
export async function appOrigin(): Promise<string> {
  const fixed = process.env.APP_URL?.replace(/\/+$/, "");
  if (fixed) return fixed;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(heading: string, body: string, link: string, cta: string, footer: string) {
  return {
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;line-height:1.5">
<h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#171717;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${escapeHtml(cta)}</a></p>
<p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
<p style="color:#666;font-size:13px">${escapeHtml(footer)}</p></div>`,
    text: `${heading}\n\n${body}\n\n${link}\n\n${footer}`,
  };
}

export function verificationEmail(link: string) {
  return {
    subject: "Confirm your email for Quill",
    ...layout(
      "Confirm your email",
      "Tap the button to finish creating your Quill account. The link works for 24 hours.",
      link,
      "Confirm email",
      "If you didn't create a Quill account, you can ignore this email."
    ),
  };
}

export function pinResetEmail(link: string) {
  return {
    subject: "Reset your Quill PIN",
    ...layout(
      "Reset your PIN",
      "Use the button to choose a new 4-digit PIN. The link works for one hour and can only be used once.",
      link,
      "Choose a new PIN",
      "If you didn't ask for this, you can ignore this email — your PIN hasn't changed."
    ),
  };
}
