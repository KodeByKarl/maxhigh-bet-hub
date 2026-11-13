# MaxHigh Owner's Manual: deliverables

| File | What it is |
|---|---|
| `MAXHIGH_OWNER_GAME_CONFIGURATION_MANUAL.pdf` | The manual for the owner (29 pages, A4, page numbers). No passwords. |
| `MAXHIGH_OWNER_GAME_CONFIGURATION_MANUAL.html` | Editable source of the manual. |
| `MAXHIGH_50_GAMES_CONFIGURATION_REFERENCE.csv` / `.md` | Configuration reference for all 50 games (opens in Excel). |
| `screenshots/` | Real production screenshots used in the manual. |
| `data/live-engine-configs.json` | Live engine settings of all 50 games, read-only from https://maxhigh.online. |
| `credentials/` | Tools to create and open the encrypted `MAXHIGH_OWNER_CREDENTIALS.enc`. |

## Rebuild the PDF

From the repository root, after editing the HTML:

```sh
node docs/owner-manual/tools/read-live-configs.mjs   # optional: refresh live values (read-only GET requests)
node docs/owner-manual/tools/build-pdf.mjs           # regenerates the reference files and the PDF
```

## Create the encrypted credential file

The file is created by the person handing over the accounts, on their own computer (PowerShell 7):

```powershell
pwsh docs/owner-manual/credentials/Protect-MaxHighCredentials.ps1
```

* Edit `credentials/accounts.template.json` first if you want to add client staff usernames. It never holds passwords.
* You type each password (hidden input). Leave a password empty to mark the account **requires secure reset**.
* Choose a passphrase of 14 or more characters. Give it to the owner **in person or by phone**, never with the file.
* Encryption: AES-256-GCM, with the key derived from the passphrase by PBKDF2-SHA256 (600,000 iterations). Tampering is detected.
* The owner opens it with `pwsh docs/owner-manual/credentials/Unprotect-MaxHighCredentials.ps1`. It is shown on screen only.

`*.enc` files are git-ignored. Never commit them or send them in the same message as the passphrase.
