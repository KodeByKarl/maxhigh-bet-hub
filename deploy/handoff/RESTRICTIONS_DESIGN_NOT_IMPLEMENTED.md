# Payment-dependent restrictions (50 locked games, 2 client accounts) - design and status

**Status: NOT IMPLEMENTED, NOT ACTIVE anywhere.** Nothing in this document has been built, deployed or enabled on UAT.

## Why it was not built in this session
1. **No approved locked-game list exists** in the repository, the QA catalog or the evidence folders (searched). The brief forbids inventing the final selection. A deterministic *proposal* is below; it needs owner confirmation.
2. **Contract authorization is unconfirmed.** The brief says: if authorization is unclear, prepare locally and do not activate on UAT until reviewed. No signed agreement text was available to me.
3. **Safety of a half-built version.** Server-side game locks touch every spin/deal/fishing/settlement entry point (419 server functions) and user limits touch registration, owner/superadmin creation and a DB integrity layer. A partial implementation could strand open rounds or block legitimate settlement - the exact data-hostage failure the brief prohibits. It must be built, reviewed and tested as one change.
4. The Windows desktop shutdown at 04:00 PHT bounded the session.

## Design (ready to implement after approval)
### A. Game lock (server-authoritative, not a client-editable flag)
* **Policy source:** a developer-signed policy file shipped *inside the release artifact* (`deploy/policy/locked-games.json` + detached Ed25519 signature; public key compiled into the server). The DB holds no lock state, so a client with DB or admin access cannot edit it. Unlock = ship a new signed release (separately authorized, audited operation controlled by the developer).
* **Enforcement point:** one guard, `assertGameAccessible(gameId)`, called from the shared entry used by every game server function *before any debit* (`withFinancialOperation(..., gameId)` already receives the game id for all 100 games, so the choke point exists). Locked => refuse with the approved client message, no wallet write, audit row `game.locked_attempt`.
* **All roles:** the guard ignores role (owner and superadmin included). No UI unlock control.
* **Active sessions:** a lock never strands money. Rule: a locked game still permits *settlement of an already-open session* (free spins, open hand, open fishing round, lucky-drop climb) and cash-out, but refuses new bets. This is checked by `play_sessions.status='open'`.
* **Direct URLs/API:** same guard; the lobby only *renders* "Locked" from a server-provided list (display, not security).
* **History:** read-only transaction/audit views stay available for locked games.
* **Client message (exact):** "Game temporarily unavailable. Additional games will be activated after final payment confirmation."

### B. Two client-facing accounts
* Add `users.account_class ENUM('client','internal_qa','system') NOT NULL DEFAULT 'internal_qa'` (additive, reversible migration, no data change). Existing 1 superadmin + 5 synthetic players are classified `system` / `internal_qa` so nothing is removed or restricted.
* **Atomic cap:** creating or activating a `client` account runs `SELECT ... FOR UPDATE` on a single `account_limits` row inside the creating transaction and refuses when active clients >= 2; concurrent requests serialise on that row. A DB-level backstop: trigger refusing a third active `client` row (MariaDB has no partial unique index).
* **Bypass paths covered:** `superCreateUserFn`, registration, role-change, reactivation, and any direct insert; owner/superadmin cannot override (cap value is part of the signed policy, same as A).
* **Audit:** rejected attempts write `account.create_rejected` with actor, IP and requested role.
* **Messages (exact):** user-facing "User registration is temporarily unavailable. Additional users will be enabled after the remaining payment is completed."; admin screen only "Waiting for Last Payment Before Adding New Users." Not shown on public login unless approved.
* **Lift:** signed policy release, as in A.

### C. Required tests before activation
Per-game direct-call refusal for all 50 locked ids x {spin, deal, fire, session create}; owner/superadmin bypass attempts; open-session settle-but-not-rebet; concurrent create x 20 -> exactly 2 succeed; migration up/down on a clone; backup/restore round-trip; wallet/ledger reconciliation unchanged.

## Proposed (NOT approved) split for owner confirmation
A deterministic proposal cannot be responsibly chosen without the contract: which 50 games the client paid for is a commercial fact. If the owner wants a mechanical default, say so and one can be generated (e.g. ordered by catalog position: first 50 available, last 50 locked) - but that would be an arbitrary choice, not a contractual one.

## Decisions needed from the owner
1. The exact list of 50 games to keep available (or confirmation of an arbitrary split).
2. Written confirmation that activating both restrictions on UAT is authorized by the signed agreement.
3. Who holds the unlock signing key (must not be stored on the VPS).
4. Whether the 2 client accounts are new or two of the existing ones.
