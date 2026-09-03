# MaxHigh continuous deploy (auto-update from GitHub)

## Windows — one click

Double-click **`MaxHigh.bat`**. It will:

1. Install npm dependencies  
2. Start MariaDB (if installed as a Windows service)  
3. Create/fix missing DB tables + seed accounts  
4. Pull latest from GitHub  
5. Build Frontend + Backend  
6. Start both processes with PM2:
   - `maxhigh-app` — the site/API  
   - `maxhigh-updater` — keeps fetching GitHub; on new commit → pull → build → reload  

After that you can close the log window anytime — the app **keeps running**.  
New pushes to `main` update the server by themselves.

```bat
MaxHigh.bat
```

Useful later:

```bat
pm2 status
pm2 logs
pm2 restart maxhigh-app
```

## Linux (VPS)

```bash
cd /path/to/maxhigh-bet-hub
cp .env.example .env   # fill MySQL + optional DEPLOY_WEBHOOK_SECRET
chmod +x deploy/install.sh
./deploy/install.sh
pm2 startup && pm2 save
```

## `.env` knobs

```env
PORT=8080
DEPLOY_BRANCH=main
DEPLOY_POLL_SECONDS=60
DEPLOY_WEBHOOK_ENABLED=1
DEPLOY_WEBHOOK_PORT=9090
DEPLOY_WEBHOOK_SECRET=change-me-to-a-long-random-string
```

## GitHub webhook (optional, instant)

Polling alone is enough (default every 60s). For instant deploys:

1. Open port `9090`  
2. GitHub → **Settings → Webhooks**
   - **Payload URL:** `http://YOUR_SERVER:9090/hooks/github`
   - **Content type:** `application/json`
   - **Secret:** same as `DEPLOY_WEBHOOK_SECRET`
   - **Events:** push

Health: `http://localhost:9090/health`

## Safety

- Uses `git pull --ff-only`  
- `.env` stays on the server (gitignored)  
- MySQL data is never wiped by a deploy  
