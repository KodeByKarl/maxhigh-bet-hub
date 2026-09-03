# MaxHigh continuous deploy (auto-update from GitHub)

When the app + updater are running on the server, every push to `main` is pulled,
built, and hot-reloaded. You do not need to SSH for routine updates.

## What runs

| PM2 process         | Role                                      |
|---------------------|-------------------------------------------|
| `maxhigh-app`       | Production Node server (`.output/...`)    |
| `maxhigh-updater`   | Polls GitHub + optional webhook → deploy  |

Deploy steps (automatic):

1. `git fetch` / compare to `origin/main`
2. `git pull --ff-only`
3. `npm ci`
4. `npm run build`
5. `pm2 reload maxhigh-app`

## One-time server setup

### Linux

```bash
cd /path/to/maxhigh-bet-hub
cp .env.example .env   # fill MySQL + DEPLOY_WEBHOOK_SECRET
chmod +x deploy/install.sh
./deploy/install.sh
pm2 startup            # run the command it prints
pm2 save
```

### Windows Server

```powershell
cd D:\Projects\maxhigh-bet-hub
copy .env.example .env   # fill secrets
.\deploy\install.ps1
pm2 startup
pm2 save
```

## `.env` knobs

```env
DEPLOY_BRANCH=main
DEPLOY_POLL_SECONDS=90
DEPLOY_WEBHOOK_ENABLED=1
DEPLOY_WEBHOOK_PORT=9090
DEPLOY_WEBHOOK_SECRET=change-me-long-random
DEPLOY_PM2_APP=maxhigh-app
# Optional: run schema sync after each pull (off by default)
# DEPLOY_DB_SYNC=1
```

## GitHub webhook (instant; optional)

Polling alone is enough (default every 90s). For instant deploys on push:

1. Open port `9090` (or your `DEPLOY_WEBHOOK_PORT`) to the server  
2. GitHub → repo → **Settings → Webhooks → Add webhook**
   - **Payload URL:** `http://YOUR_SERVER_IP:9090/hooks/github`  
     (or reverse-proxy `https://maxhigh.online/hooks/github` → `9090`)
   - **Content type:** `application/json`
   - **Secret:** same as `DEPLOY_WEBHOOK_SECRET`
   - **Events:** Just the **push** event

Manual trigger (same secret as token):

```bash
curl -X POST "http://127.0.0.1:9090/hooks/deploy?token=YOUR_SECRET"
```

Health:

```bash
curl -s http://127.0.0.1:9090/health
```

## Day-to-day workflow

1. Develop locally → `git commit` → `git push origin main`
2. Within ~90s (or instantly via webhook) the server updates itself
3. Check: `pm2 status` · `pm2 logs maxhigh-updater` · `deploy/logs/auto-update.log`

## Manual commands

```bash
npm run deploy:check    # are we behind origin/main?
npm run deploy:now      # run one deploy cycle now
npm run deploy:force    # rebuild/reload even if already up to date
pm2 logs maxhigh-updater
pm2 reload maxhigh-app
```

## Safety notes

- Uses `git pull --ff-only` — will **not** overwrite unexpected local commits on the server.
- `.env` is gitignored — secrets stay on the box.
- Jackpot / player data is in MySQL — deploys do not wipe the DB.
- Set `DEPLOY_DB_SYNC=1` only if you want `npm run db:sync` after every pull.
