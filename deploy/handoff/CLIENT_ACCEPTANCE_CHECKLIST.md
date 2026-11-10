# Client acceptance checklist - private UAT

Tick each item after witnessing it. Items marked (D) are performed by the developer on request; items marked (P) need a physical phone. Everything uses synthetic test credits.

## A. Access and accounts
- [ ] A1 Sign in as an administrator; change the initial password.
- [ ] A2 Create a player; add test credits through an audited adjustment; confirm the ledger shows an `adjust` row and the audit log an entry.
- [ ] A3 Disable and re-enable a player; history is preserved.
- [ ] A4 (After activation only) Create the 3rd client account: refused with the approved message; admin screen shows the waiting message.

## B. Games (100 in the catalog)
- [ ] B1 Lobby shows the games with correct thumbnails, names, categories and bet ranges.
- [ ] B2 Play at least 5 slots, 2 fishing rooms and 3 card/table games end to end (spin/deal/shoot, win, loss, free spins/feature where available).
- [ ] B3 Bets below the minimum, above the maximum, zero and negative are refused; a refused bet changes no balance.
- [ ] B4 Wallet balance after each round equals the previous balance plus the ledger entries (Transactions page).
- [ ] B5 **Wild Panther** (gameplay changed - client sign-off required): hits often with small wins, free spins are rare (about 1 in 240), features last ~10 spins, Buy Bonus costs 41x the bet, Ante costs 1.25x. RTP target 96.5%.
- [ ] B6 **Color Game / Color Game Pro:** the wheel spins smoothly, stops on the winning color, and the payout matches the shown result (P).
- [ ] B7 (After activation only) 50 games show **Locked**; each refuses play with the approved message; the other 50 play normally.

## C. Mobile (P)
- [ ] C1 Lobby and games usable on a 360-412 px wide Android phone, portrait and landscape, no horizontal scrolling, no cut-off buttons.
- [ ] C2 Android Back closes the open dialog/game first, then returns to the lobby; it does not leave the app unexpectedly.
- [ ] C3 With gesture navigation and with three-button navigation, in-app controls are not hidden behind the system bar.
- [ ] C4 Keyboard opening in a login/amount field does not cover the field.

## D. Safety and records
- [ ] D1 Audit log shows the actions performed above.
- [ ] D2 (D) Ledger reconciliation report: every balance equals opening + ledger sum; no negative balances.
- [ ] D3 (D) Backup + isolated restore evidence presented (hashes match).
- [ ] D4 (D) Security probe report presented.

## E. Known limitations acknowledged
- [ ] E1 UAT is reachable only through a private tunnel; production deployment, public routing, payments and withdrawals are out of scope.
- [ ] E2 Physical Android sign-off (section C) is outstanding until performed on real devices.
- [ ] E3 The payment-dependent restrictions are implemented but not active; activation needs the agreed game list and the written authorization.

Signed (client): ____________________  Date: __________    Signed (developer): ____________________  Date: __________
