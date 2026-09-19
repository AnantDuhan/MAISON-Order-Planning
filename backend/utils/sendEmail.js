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
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "Resend email configuration is missing. Required: RESEND_API_KEY, RESEND_FROM_EMAIL",
    );
  }

  return { apiKey, from };
};

const assertEmailOptions = (options) => {
  if (!options?.email) throw new Error("Email recipient is required");
  if (!options.subject) throw new Error("Email subject is required");
  if (!options.html) throw new Error("Email HTML content is required");
};

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
  const { apiKey, from } = getEmailConfig();

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.email],
      subject: options.subject,
      html: options.html,
    }),
    signal: AbortSignal.timeout(15_000),
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
