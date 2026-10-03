/**
 * Phone helpers. whatsappNumber is stored as a Number today (usually the
 * 10-digit national number), so login has to accept "+91 98765 43210",
 * "09876543210" and "9876543210" alike and match all of them.
 */
const DEFAULT_CC = String(process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');

// Digits only, national form (country code and trunk "0" stripped for the
// default country). Returns null when it can't be a mobile number.
const toNational = input => {
    let digits = String(input ?? '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.length > 10 && digits.startsWith(DEFAULT_CC)) digits = digits.slice(DEFAULT_CC.length);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits.length >= 8 && digits.length <= 12 ? digits : null;
};

// Full international digits without "+", e.g. "919876543210" — what SMS APIs want.
const toInternational = national => `${DEFAULT_CC}${national}`;

// Stored values that may belong to this number (with or without country code).
const storedCandidates = national => [Number(national), Number(toInternational(national))];

// "+91 ••••••3210" for UI/logs.
const mask = national => `+${DEFAULT_CC} ••••••${String(national).slice(-4)}`;

module.exports = { toNational, toInternational, storedCandidates, mask };
