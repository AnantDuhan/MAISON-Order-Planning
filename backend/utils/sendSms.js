/**
 * OTP delivery over SMS. Provider chosen by SMS_PROVIDER:
 *
 *   console  (default outside production) — logs the code; for local testing.
 *   msg91    — Indian DLT-compliant OTP route. Needs MSG91_AUTH_KEY and
 *              MSG91_TEMPLATE_ID (a DLT-approved template, e.g.
 *              "##otp## is your Maison sign-in code. Valid for 10 minutes.").
 *              MSG91_OTP_VAR is the template variable name (default "otp").
 *   twilio   — Twilio Messages API. Needs TWILIO_ACCOUNT_SID,
 *              TWILIO_AUTH_TOKEN and TWILIO_FROM. For Indian numbers the
 *              sender and template still need DLT registration.
 *
 * All providers are called over HTTPS with fetch — no SDKs.
 */

const provider = () =>
    (process.env.SMS_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'console')).toLowerCase();

const isSmsConfigured = () => {
    switch (provider()) {
        case 'console':
            return true;
        case 'msg91':
            return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);
        case 'twilio':
            return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
        default:
            return false;
    }
};

const failIfNotOk = async (response, name) => {
    if (response.ok) return;
    let detail = '';
    try {
        const body = await response.json();
        detail = body.message || body.error || JSON.stringify(body);
    } catch {
        /* no body */
    }
    throw new Error(`${name} SMS failed (${response.status}) ${detail}`.trim());
};

/**
 * @param {string} to   international digits without "+", e.g. "919876543210"
 * @param {string} code the one-time code
 */
const sendOtpSms = async (to, code) => {
    const name = provider();

    if (name === 'console') {
        console.log(`📱 [SMS console] OTP for +${to}: ${code}`);
        return;
    }

    if (name === 'msg91') {
        const response = await fetch('https://control.msg91.com/api/v5/flow', {
            method: 'POST',
            headers: { authkey: process.env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                template_id: process.env.MSG91_TEMPLATE_ID,
                short_url: '0',
                recipients: [{ mobiles: to, [process.env.MSG91_OTP_VAR || 'otp']: code }],
            }),
            signal: AbortSignal.timeout(15_000),
        });
        return failIfNotOk(response, 'MSG91');
    }

    if (name === 'twilio') {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                To: `+${to}`,
                From: process.env.TWILIO_FROM,
                Body: `${code} is your Maison sign-in code. It expires in 10 minutes. Never share it.`,
            }),
            signal: AbortSignal.timeout(15_000),
        });
        return failIfNotOk(response, 'Twilio');
    }

    throw new Error('SMS is not configured (set SMS_PROVIDER)');
};

module.exports = { sendOtpSms, isSmsConfigured };
