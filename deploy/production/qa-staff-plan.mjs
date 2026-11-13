// Pure decision logic for create-qa-staff.mjs (no browser, no network, no credentials) so it can be regression-tested.
import crypto from 'node:crypto';

export const PLAN = [
  { username: 'qa_master_agent', role: 'master_agent', label: 'master_agent' },
  { username: 'qa_agent', role: 'agent', label: 'agent', upline: 'qa_master_agent' },
];

/** True when `@name` appears as a whole username in the page text (not as a prefix of another name). */
export function hasUsername(text, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_])@${esc}(?![A-Za-z0-9_])`, 'i').test(text);
}

/** The role dropdown must offer the role we are about to create. */
export function checkRoleOptions(optionValues, role) {
  return optionValues.includes(role) ? { ok: true } : { ok: false, reason: `role "${role}" is not offered (offered: ${optionValues.join(', ') || 'none'})` };
}

/**
 * Upline availability. An upline created by this same plan cannot exist during a dry run, so that is not a failure.
 * Returns 'OK' | 'PENDING UNTIL APPLY' | 'FAIL'.
 */
export function uplineStatus({ apply, upline, optionTexts, plannedUplines }) {
  if (!upline) return 'OK';
  if (optionTexts.some((t) => hasUsername(t, upline))) return 'OK';
  if (!apply && plannedUplines.includes(upline)) return 'PENDING UNTIL APPLY';
  return 'FAIL';
}

/** Never create a duplicate and never adopt an account we did not create. */
export function decideAccount({ existsInApp, inRecord, hasCredLine }) {
  if (!existsInApp && !hasCredLine) return { action: 'CREATE' };
  if (!existsInApp && hasCredLine) return { action: 'ABORT', reason: 'a credentials line exists but the account does not (stale line); remove it first' };
  if (existsInApp && inRecord && hasCredLine) return { action: 'REUSE' };
  return { action: 'ABORT', reason: 'the username already exists and was not created by this tool; it is left untouched' };
}

/** "₱0.00", "0", "PHP 0.00" -> zero; anything with a non-zero digit or no digits -> false. */
export function isZeroBalance(text) {
  const t = String(text ?? '').replace(/[^0-9.\-]/g, '');
  return /\d/.test(t) && Number(t) === 0;
}

/** Problems found on a just-created row. Empty array = verified. */
export function verifyCreatedRow({ expectedRole, expectedUpline, role, balanceText, rowText }) {
  const problems = [];
  if (role !== expectedRole) problems.push(`role is "${role}", expected "${expectedRole}"`);
  if (!isZeroBalance(balanceText)) problems.push('starting balance is not zero');
  if (expectedUpline && !hasUsername(rowText, expectedUpline)) problems.push(`upline @${expectedUpline} not shown on the row`);
  return problems;
}

export function newPassword() {
  for (;;) {
    const p = crypto.randomBytes(18).toString('base64url').slice(0, 22);
    if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) return p;
  }
}
