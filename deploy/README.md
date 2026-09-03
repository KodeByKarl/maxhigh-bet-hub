# MaxHigh continuous deploy (auto-update from GitHub)

## Windows — one click

Double-click **`MaxHigh.bat`**. It will:

1. Install npm dependencies  
2. Start MariaDB  
3. DB sync + seed  
4. Pull latest from GitHub  
5. Build **Node server** (`nitro.preset = node-server`)  
6. Start PM2: `maxhigh-app` + `maxhigh-updater`  
7. Start **Caddy** → **https://maxhigh.online** → `127.0.0.1:8080`  

### Domain checklist

| Need | Detail |
|------|--------|
| DNS | `maxhigh.online` (+ `www`) **A/AAAA** → this server's public IP |
| Firewall | TCP **80** + **443** open (Let's Encrypt + HTTPS) |
| Caddy | `caddy.exe` on PATH, or in `deploy\caddy.exe` |
| `.env` | `CADDY_DOMAIN=maxhigh.online`, `PORT=8080`, `PUBLIC_URL=https://maxhigh.online` |

Config file: `deploy/Caddyfile`

```bat
MaxHigh.bat
```

Useful:

```bat
pm2 status
pm2 logs maxhigh-caddy
pm2 logs maxhigh-app
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
