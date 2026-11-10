# MaxHigh private UAT - administrator guide, account management, unlocking and access

Audience: the client's administrators and the developer. **Status of the payment-dependent restrictions: implemented, NOT activated.** Where this guide describes locked games or the two-account limit, it describes how they work *when activated*; today (release 2294d79 on UAT) all 100 games are accessible and no account limit is enforced.

## 1. Accessing the private UAT
* UAT is private: it listens only on the VPS loopback (`127.0.0.1:18080`) and is reached through an SSH tunnel; it is not exposed publicly and has no public DNS.
* Developer/operator opens the tunnel: `ssh -i <key> -N -L 127.0.0.1:18080:127.0.0.1:18080 maxhigh-ops@<vps-address>` then browses `http://127.0.0.1:18080`. (A client-facing access method - for example a reviewed, access-controlled reverse proxy - is a separate decision; none is configured.)
* Accounts: 1 superadmin (`uat_owner`) and 5 synthetic QA players (`uat_player` .. `uat_player5`), each funded with 100,000.00 **test credits** (no real money; no payment or withdrawal system is connected). Passwords are random and stored only in a private file on the developer's machine; they are handed over through a secure channel, never by email or chat.
* Change the superadmin password on first use.

## 2. Roles
| Role | What it can do |
|---|---|
| player | play games, view own history and wallet |
| agent / master_agent | create and manage players in their own downline, transfer chips |
| admin | manage users and support within their permissions |
| superadmin | everything above plus game controls, risk limits, platform settings, audited balance adjustments (password re-confirmation) |
Account **class** (separate from role): `client`, `admin`, `qa`. The class is set by the system, never from a form field, and cannot be changed through the application.

## 3. Everyday administration
* **Create a user:** Admin/Superadmin -> Users -> Create. New accounts always start with balance 0; credits are added through audited adjustments (type `adjust`, with a note and password confirmation). Direct balance edits do not exist.
* **Disable / re-enable an account:** Lock / Unlock on the user. Disabled accounts keep all history. (When the client-account limit is active, re-enabling a disabled client account while the limit is full is refused.)
* **Risk limits (UAT-only values approved):** Superadmin -> Risk controls: max single bet 100,000.00, daily payout 100,000,000.00, weekly 1,000,000,000.00, large-win flag threshold 10,000.00. These are strictly for the staging environment and must never be copied to production.
* **Game controls:** enable/disable individual games in Superadmin -> Games. A `game_controls` row for a game overrides its code defaults (relevant for Wild Panther: check there is no stale override).
* **Audit log:** every sensitive action is recorded (user create/lock/unlock, balance adjust, role change, risk change, large wins, locked-game attempts, rejected account creations, entitlement grants). Entries cannot be edited in the application.

## 4. Locked games (when activated)
* Locked games show a **Locked** badge in the lobby and the message *"Game Locked. Please settle the remaining project payment to activate this game."* They cannot be played by anyone, including owners and superadmins.
* A round that was already paid for (free spins, an open hand, a climb in progress) can still be **finished** so no one loses a paid round or a win. New bets and feature purchases are refused.
* History, balances and audit records for locked games remain readable.
* **Unlocking is not an admin setting.** It needs a grant signed by the developer (an Ed25519 signature) that a superadmin applies: Superadmin -> Entitlements -> paste the grant (payload, signature, key id), re-enter the password and type `APPLY SIGNED GRANT`. The grant is single-use, bound to this environment, recorded and audited. There is no master password and no hidden control. *(The Entitlements screen is not built; today the grant is applied through the audited `applyEntitlementGrantFn` server call by the developer. A small admin form is a recommended follow-up.)*

## 5. Client accounts (when activated)
* Up to **2 active client accounts**. Administrative accounts (`admin` class) and synthetic QA accounts (`qa` class) do not count and are never removed.
* A third client account is refused with *"Account Limit Reached. Please settle the remaining project payment to add more client accounts."* Admin screens show *"Waiting for Last Payment Before Adding New Users."* (not shown on the public login page).
* Replacing a client account: disable the old one (it stops counting), then create the new one.
* Raising the limit, or authorizing an extra QA/admin account, is a developer-signed grant (same mechanism as unlocking).

## 6. Data safety
No restriction deletes data, changes balances, blocks backups, restore, export or read-only access, or blocks security updates and emergency maintenance. Backups are encrypted (age); the permanent recovery key is held offline by the developer; restore is rehearsed into an isolated schema before anything is trusted.

## 7. Where to get help
Developer-controlled items (grants, activation, deployment) go through the developer. Contract questions (what may be restricted and when it is lifted) are governed by the signed agreement, not by this software.
