const nodemailer = require("nodemailer");

/**
 * A single pooled SMTP transport for the whole process.
 *
 * SMTP configuration:
 *
 *   SMTP_HOST
 *   SMTP_PORT       -> 587 by default
 *   SMTP_MAIL
 *   SMTP_PASSWORD
 *
 * Port 587:
 *   secure: false
 *   Uses STARTTLS
 *
 * Port 465:
 *   secure: true
 *   Uses TLS immediately
 *
 * The transport uses a connection pool so emails don't need to create
 * a new TCP connection + TLS handshake + SMTP AUTH for every message.
 */

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const mail = process.env.SMTP_MAIL;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !mail || !password) {
    throw new Error(
      "SMTP email configuration is missing. " +
        "Required: SMTP_HOST, SMTP_MAIL, SMTP_PASSWORD",
    );
  }

  console.log(`📧 SMTP configuration: ${host}:${port} (IPv4)`);

  transporter = nodemailer.createTransport({
    host,

    port,

    // Port 465 = TLS immediately
    // Port 587 = plain connection followed by STARTTLS
    secure: port === 465,

    // Force IPv4. This avoids IPv6 connectivity issues
    // that can occur on some cloud environments.
    family: 4,

    auth: {
      user: mail,
      pass: password,
    },

    // Connection pooling
    pool: true,
    maxConnections: 5,
    maxMessages: 100,

    // Connection timeouts
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,

    // Keep SMTP connections alive
    keepAlive: true,
  });

  transporter.on("error", (error) => {
    console.error("❌ SMTP pool error:", error.code || "", error.message);
  });

  transporter.on("idle", () => {
    console.log("📨 SMTP pool is idle");
  });

  return transporter;
};

/**
 * Build email options.
 */
const buildMailOptions = (options) => ({
  from: process.env.SMTP_MAIL,
  to: options.email,
  subject: options.subject,
  html: options.html,

  headers: {
    "Content-Type": "text/html; charset=UTF-8",
  },
});

/**
 * Send an email and wait for the SMTP result.
 *
 * Use this when the caller genuinely needs confirmation that
 * Nodemailer successfully handed the message to the SMTP server.
 */
const sendEmail = async (options) => {
  if (!options || !options.email) {
    throw new Error("Email recipient is required");
  }

  if (!options.subject) {
    throw new Error("Email subject is required");
  }

  if (!options.html) {
    throw new Error("Email HTML content is required");
  }

  const mailer = getTransporter();

  try {
    const info = await mailer.sendMail(buildMailOptions(options));

    console.log(`📧 Email sent successfully to ${options.email}`);

    return info;
  } catch (error) {
    console.error(
      `❌ Email sending failed (to: ${options.email}, subject: "${options.subject}")`,
    );

    console.error("Code:", error.code || "UNKNOWN");

    console.error("Message:", error.message);

    throw error;
  }
};

/**
 * Send an email in the background.
 *
 * The HTTP request does not wait for the SMTP operation.
 *
 * Useful for:
 *   - Order confirmation
 *   - Contact form
 *   - Notifications
 *   - Non-critical transactional emails
 *
 * Failures are logged instead of being returned to the caller.
 */
const sendEmailInBackground = (options) => {
  setImmediate(async () => {
    try {
      await sendEmail(options);
    } catch (error) {
      console.error(
        `❌ Background email failed (to: ${options.email}, subject: "${options.subject}")`,
      );

      console.error("Code:", error.code || "UNKNOWN");

      console.error("Message:", error.message);
    }
  });
};

/**
 * Test the SMTP connection during application startup.
 *
 * This does not send an email.
 *
 * It verifies:
 *   - DNS resolution
 *   - TCP connection
 *   - TLS / STARTTLS
 *   - SMTP greeting
 *   - SMTP authentication
 */
const warmUpEmailTransport = async () => {
  try {
    const mailer = getTransporter();

    console.log("🔌 Verifying SMTP connection...");

    await mailer.verify();

    console.log("✅ SMTP transport ready");
  } catch (error) {
    console.warn("⚠️ SMTP transport not ready");

    console.warn("Code:", error.code || "UNKNOWN");

    console.warn("Message:", error.message);

    /*
     * Do NOT throw here.
     *
     * SMTP failure should not prevent the entire application
     * from starting. Email functionality can be retried when
     * an email is actually sent.
     */
  }
};

/**
 * Optional TCP-level diagnostic.
 *
 * This is particularly useful on Render/cloud environments.
 *
 * It determines whether the server can even establish a TCP
 * connection to the SMTP host before Nodemailer gets involved.
 *
 * Example:
 *
 *   smtp.gmail.com:587
 *
 * This function does NOT authenticate or send email.
 */
const testSMTPNetwork = () => {
  const net = require("net");

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host) {
    console.warn("⚠️ SMTP network test skipped: SMTP_HOST is missing");
    return;
  }

  console.log(`🌐 Testing SMTP TCP connection to ${host}:${port} over IPv4...`);

  const socket = new net.Socket();

  let completed = false;

  socket.setTimeout(10000);

  socket.on("connect", () => {
    completed = true;

    console.log(`✅ SMTP TCP connection established: ${host}:${port}`);

    socket.destroy();
  });

  socket.on("timeout", () => {
    if (completed) return;

    console.error(`❌ SMTP TCP connection timeout: ${host}:${port}`);

    socket.destroy();
  });

  socket.on("error", (error) => {
    if (completed) return;

    console.error(`❌ SMTP TCP connection failed: ${host}:${port}`);

    console.error("Code:", error.code || "UNKNOWN");

    console.error("Message:", error.message);
  });

  socket.on("close", () => {
    // Nothing to do here.
  });

  socket.connect({
    host,
    port,
    family: 4,
  });
};

module.exports = sendEmail;

module.exports.sendEmail = sendEmail;
module.exports.sendEmailInBackground = sendEmailInBackground;
module.exports.warmUpEmailTransport = warmUpEmailTransport;
module.exports.testSMTPNetwork = testSMTPNetwork;
