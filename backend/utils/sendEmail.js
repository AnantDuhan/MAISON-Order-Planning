/**
 * Transactional email through Resend's HTTPS API.
 *
 * This intentionally avoids SMTP: Render free services block SMTP ports, while
 * HTTPS requests to the Resend API are supported.
 *
 * Required environment variables:
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL  e.g. Maison <hello@your-verified-domain.com>
 */

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

const getEmailConfig = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const senders = {
    noreply: process.env.EMAIL_FROM_NOREPLY,
    support: process.env.EMAIL_FROM_SUPPORT,
  };

  if (!apiKey || !senders.noreply || !senders.support) {
    throw new Error(
      "Resend email configuration is missing. Required: RESEND_API_KEY, EMAIL_FROM_NOREPLY, EMAIL_FROM_SUPPORT",
    );
  }

  return { apiKey, senders, replyTo: process.env.EMAIL_REPLY_TO };
};

const assertEmailOptions = (options) => {
  if (!options?.email) throw new Error("Email recipient is required");
  if (!options.subject) throw new Error("Email subject is required");
  if (!options.html) throw new Error("Email HTML content is required");
};

// Resend expects attachment content as base64. Accept Buffers for convenience.
const toResendAttachments = (attachments = []) =>
  attachments.map((attachment) => ({
    filename: attachment.filename,
    content: Buffer.isBuffer(attachment.content)
      ? attachment.content.toString("base64")
      : attachment.content,
    ...(attachment.contentType && { content_type: attachment.contentType }),
  }));

const getResponseBody = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

// Send a message and wait until Resend accepts it for delivery.
const sendEmail = async (options) => {
  assertEmailOptions(options);
  const { apiKey, senders, replyTo } = getEmailConfig();
  const from = senders[options.sender || "noreply"];

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.email],
      reply_to: options.replyTo || replyTo,
      subject: options.subject,
      html: options.html,
      ...(options.attachments?.length && {
        attachments: toResendAttachments(options.attachments),
      }),
    }),
    signal: AbortSignal.timeout(options.attachments?.length ? 30_000 : 15_000),
  });

  const body = await getResponseBody(response);
  if (!response.ok) {
    throw new Error(body.message || body.name || `Resend request failed (${response.status})`);
  }

  console.log(`📧 Email accepted by Resend for ${options.email}`);
  return body;
};

// Use for request paths that should not wait for email delivery.
const sendEmailInBackground = (options) => {
  setImmediate(async () => {
    try {
      await sendEmail(options);
    } catch (error) {
      console.error(
        `❌ Background email failed (to: ${options?.email}, subject: "${options?.subject}")`,
      );
      console.error("Message:", error.message);
    }
  });
};

// Kept for the existing server startup hook. Resend has no SMTP connection to
// warm; this only reports whether the service has been configured.
const warmUpEmailTransport = async () => {
  try {
    getEmailConfig();
    console.log("✅ Resend email API configured");
  } catch (error) {
    console.warn("⚠️ Resend email API is not configured:", error.message);
  }
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.sendEmailInBackground = sendEmailInBackground;
module.exports.warmUpEmailTransport = warmUpEmailTransport;
