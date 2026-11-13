// Run: node --test deploy/production/qa-staff-plan.test.mjs   (no browser, network or credentials needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN, hasUsername, checkRoleOptions, uplineStatus, decideAccount, isZeroBalance, verifyCreatedRow, newPassword } from './qa-staff-plan.mjs';

const planned = PLAN.map((p) => p.username);

test('plan order: master agent first, agent second with the master agent as upline', () => {
  assert.deepEqual(planned, ['qa_master_agent', 'qa_agent']);
  assert.equal(PLAN[0].role, 'master_agent');
  assert.equal(PLAN[1].role, 'agent');
  assert.equal(PLAN[1].upline, 'qa_master_agent');
});

test('dry run: an upline that this plan will create is PENDING UNTIL APPLY, not a failure', () => {
  assert.equal(uplineStatus({ apply: false, upline: 'qa_master_agent', optionTexts: ['Direct Superadmin @owner (no upline)'], plannedUplines: planned }), 'PENDING UNTIL APPLY');
});
test('apply: a missing upline is a FAIL (stop before creating the agent)', () => {
  assert.equal(uplineStatus({ apply: true, upline: 'qa_master_agent', optionTexts: ['Direct Superadmin @owner (no upline)'], plannedUplines: planned }), 'FAIL');
});
test('upline present in the dropdown is OK in both modes', () => {
  for (const apply of [false, true]) assert.equal(uplineStatus({ apply, upline: 'qa_master_agent', optionTexts: ['@qa_master_agent '], plannedUplines: planned }), 'OK');
});
test('dry run: an upline NOT in the plan and not in the dropdown still FAILS', () => {
  assert.equal(uplineStatus({ apply: false, upline: 'someone_else', optionTexts: [], plannedUplines: planned }), 'FAIL');
});
test('no upline required -> OK', () => assert.equal(uplineStatus({ apply: false, upline: undefined, optionTexts: [], plannedUplines: planned }), 'OK'));

test('username matching is whole-name (qa_agent does not match qa_agent2 or qa_master_agent)', () => {
  assert.equal(hasUsername('@qa_agent2', 'qa_agent'), false);
  assert.equal(hasUsername('@qa_master_agent', 'qa_agent'), false);
  assert.equal(hasUsername('Staff @qa_agent (Agent)', 'qa_agent'), true);
  assert.equal(hasUsername('@QA_AGENT', 'qa_agent'), true);
});

test('supported role values are verified before submitting', () => {
  assert.equal(checkRoleOptions(['agent', 'master_agent', 'superadmin'], 'master_agent').ok, true);
  assert.equal(checkRoleOptions(['agent', 'master_agent', 'superadmin'], 'admin').ok, false);
});

test('duplicate protection: never create over, adopt or reuse an unrelated account', () => {
  assert.equal(decideAccount({ existsInApp: false, inRecord: false, hasCredLine: false }).action, 'CREATE');
  assert.equal(decideAccount({ existsInApp: true, inRecord: false, hasCredLine: false }).action, 'ABORT');
  assert.equal(decideAccount({ existsInApp: true, inRecord: false, hasCredLine: true }).action, 'ABORT');
  assert.equal(decideAccount({ existsInApp: true, inRecord: true, hasCredLine: false }).action, 'ABORT');
  assert.equal(decideAccount({ existsInApp: false, inRecord: false, hasCredLine: true }).action, 'ABORT');
  assert.equal(decideAccount({ existsInApp: true, inRecord: true, hasCredLine: true }).action, 'REUSE'); // resume after a partial apply
});

test('zero-balance detection', () => {
  for (const ok of ['₱0.00', '0', 'PHP 0.00', ' ₱ 0 ']) assert.equal(isZeroBalance(ok), true, ok);
  for (const bad of ['₱1,000.00', '₱0.01', '', '—', undefined]) assert.equal(isZeroBalance(bad), false, String(bad));
});

test('post-creation verification: role, zero balance, upline', () => {
  const good = { expectedRole: 'agent', expectedUpline: 'qa_master_agent', role: 'agent', balanceText: '₱0.00', rowText: '@qa_agent @qa_master_agent' };
  assert.deepEqual(verifyCreatedRow(good), []);
  assert.equal(verifyCreatedRow({ ...good, role: 'player' }).length, 1);
  assert.equal(verifyCreatedRow({ ...good, balanceText: '₱5.00' }).length, 1);
  assert.equal(verifyCreatedRow({ ...good, rowText: '@qa_agent No upline' }).length, 1);
});

test('generated passwords are strong and unique', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const p = newPassword();
    assert.ok(p.length >= 20 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p));
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});
