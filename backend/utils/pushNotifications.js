const https = require('https');

/**
 * Send a push notification via Expo's Push API.
 *
 * Deliberately dependency-free (no `expo-server-sdk`, no `axios`/`fetch`
 * assumption) — just a plain HTTPS POST, since Expo's push endpoint is a
 * simple JSON API: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * NOTE: this reaches devices that hold a valid Expo push token. As of
 * Expo SDK 53, remote push tokens can only be obtained from a Development
 * Build (not Expo Go on Android), so this will only actually deliver once
 * the mobile app is running as a dev build / production build. Calling it
 * before that is harmless — it just won't have any token to send to yet
 * (`pushToken` will be null and this function no-ops).
 *
 * @param {string|null|undefined} pushToken - the recipient's Expo push token
 * @param {string} title
 * @param {string} body
 * @param {object} [data] - optional payload delivered to the app
 */
function sendPushNotification(pushToken, title, body, data = {}) {
    return new Promise((resolve) => {
        if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
            // No token yet (user hasn't registered, or is on a build that
            // can't obtain one) — nothing to do.
            resolve({ skipped: true });
            return;
        }

        const payload = JSON.stringify({
            to: pushToken,
            title,
            body,
            data,
            sound: 'default',
        });

        const req = https.request(
            {
                hostname: 'exp.host',
                path: '/--/api/v2/push/send',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                timeout: 8000,
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => resolve({ status: res.statusCode, body: raw }));
            }
        );

        req.on('error', (error) => resolve({ error: error.message }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ error: 'timeout' });
        });

        req.write(payload);
        req.end();
    });
}

module.exports = { sendPushNotification };
