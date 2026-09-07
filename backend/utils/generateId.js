/**
 * Short, URL-safe document ids.
 *
 * Replaces the old Snowflake ids (19-digit numeric strings) with compact
 * 8-character ids drawn from a lowercase-alphanumeric alphabet. Every model
 * declares `_id: String`, so these slot in without any schema change.
 *
 * Alphabet: 0-9 a-z (36 symbols). At length 8 that is 36^8 ≈ 2.8e12
 * possibilities — ample for this project's scale. Callers that need a hard
 * guarantee of no collision (e.g. the migration script) should still check
 * the target collection before insert.
 *
 * CommonJS on purpose: every backend module `require`s it. `nanoid` is pinned
 * to v3 for the same reason (v4+ ship ESM-only).
 */

const { customAlphabet } = require('nanoid');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const LENGTH = 8;

const nanoid = customAlphabet(ALPHABET, LENGTH);

/**
 * @returns {string} a fresh 8-character id, e.g. "kzsmhij4".
 */
const generateId = () => nanoid();

module.exports = generateId;
module.exports.generateId = generateId;
module.exports.ALPHABET = ALPHABET;
module.exports.LENGTH = LENGTH;
