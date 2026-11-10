// Builds the client-facing 7-day testing handover from evidence files only (no credentials, no hand-typed game lists).
//   node scripts/qa/make-client-handover.mjs <outDir>
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? "deploy/handoff";
const proposal = JSON.parse(fs.readFileSync("deploy/handoff/PROPOSED_GAME_ALLOCATION.json", "utf8"));
const catalog = new Map(
  fs.readFileSync("deploy/diagnostics/uat-game-catalog.tsv", "utf8").trim().split("\n").slice(1).map((l) => {
    const [id, category, title] = l.split("\t");
    return [id, { id, category, title }];
  }),
);
const row = (id, i) => `| ${i + 1} | ${catalog.get(id)?.title ?? id} | ${catalog.get(id)?.category ?? ""} |`;
const table = (ids) => ["| # | Game | Category |", "|---|---|---|", ...ids.map(row)].join("\n");
if (proposal.available.length !== 50 || proposal.locked.length !== 50) throw new Error("proposal is not 50/50");

const md = `# MaxHigh - 7-day private client testing handover

**STATUS: DRAFT - NOT YET ACTIVE.** This package describes the limited testing configuration. The 50-game lock is **built and tested but NOT activated** on the testing system until the owner confirms (1) the contractual basis, (2) the exact game list below. Do not send this document or any login to the client before then. Credentials are never written in this document.

## 1. What the client receives
* A private testing system with synthetic (test) credits only. No real money, no real payments, no public access.
* Private URL: provided separately by the owner (HTTPS, protected access) - not listed here.
* Testing period: **7 days starting on the day the owner confirms the start** (start date and expiry date to be entered by the owner: ____ to ____).
* Client administrator accounts (client_admin01 and client_admin02). **There is no limit on accounts**: client administrators can create further staff and player accounts for testing, within their normal role permissions.

## 2. Playable games (50) - proposal awaiting owner approval
${table(proposal.available)}

## 3. Locked games (50) - proposal awaiting owner approval
Visible in the administrator catalog with a **Locked** status. They cannot be activated or played during testing.
${table(proposal.locked)}

## 4. Payment-related unlock terms
* Outstanding project balance: **PHP 50,000**.
* Attempting to activate or play a locked game shows: "Game Locked. Please settle the remaining project payment to activate this game."
* The 50 locked games are enabled after the remaining payment is settled, by a new reviewed release or a developer-signed entitlement. Nothing is deleted, no balance is touched, and existing accounts and history stay available.

## 5. How the client tests
1. Sign in with the staff account you receive; review the lobby, the administrator dashboard and the game catalog (locked games show a Locked badge).
2. Play several of the 50 available games on desktop and on a phone (portrait and landscape).
3. Try to open a locked game to see the notice.
4. Create staff and player accounts as needed, add synthetic credits through the normal administrator tools, configure the playable games, and play.
5. Report anything unexpected using section 7.

## 6. Known limitations
* All mobile verification so far is browser emulation; no physical Android device has been used.
* Wild Panther gameplay was recalibrated (about 96% return, 41x feature buy); the client should confirm the new feel.
* Grant expiry is applied when a grant is entered; there is no admin screen for unlock grants (done by the developer).
* Restrictions are a commercial control, not tamper-proof copy protection.
* The system is a private test environment; it is not a production or real-money deployment.

## 7. Support and issue reporting
Report issues to the developer (KodeByKarl) with: the time, the account name, the game, what you did and what you saw (a screenshot helps). Never send passwords in a report.

## 8. Final acceptance checklist (client)
- [ ] I can sign in with my staff account on desktop and phone.
- [ ] The lobby shows 50 playable games and the other 50 as Locked.
- [ ] Three or more of the playable games work as expected (bet, win, history).
- [ ] A locked game shows the payment notice and cannot be played.
- [ ] I can create further staff and player accounts and configure the playable games.
- [ ] Balances and the transaction history look correct.
- [ ] I understand the remaining payment (PHP 50,000) unlocks the remaining 50 games.

## 9. Secure credential delivery (owner only)
Send each login through a separate private channel chosen by the owner (never together with the URL, never by this tool). Require a password change at first sign-in and rotate the temporary passwords at the end of testing.
`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "CLIENT_TESTING_HANDOVER.md"), md);
console.log(JSON.stringify({ available: proposal.available.length, locked: proposal.locked.length, file: path.join(out, "CLIENT_TESTING_HANDOVER.md") }));
