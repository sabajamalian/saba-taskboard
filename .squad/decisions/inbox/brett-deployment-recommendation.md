# Deployment Recommendation

**By:** Brett (DevOps)  
**Date:** 2026-02-27  
**Type:** Recommendation (not yet approved)

---

## Summary

The deployment infrastructure is **70-80% complete** for Azure App Service. The scripts and templates are solid foundations but have gaps that need addressing before a real deploy. Below is my opinionated recommendation.

---

## 1. Where to Deploy: Azure App Service (Recommended — Stay the Course)

The existing scripts target **Azure App Service (Linux, B1 tier)** and this is the right call for this project. Here's why:

- **Managed platform** — no servers to patch, auto-HTTPS via `*.azurewebsites.net`
- **Python 3.11 native support** — no Docker needed
- **B1 tier** gives you always-on, custom domains, and SSL for ~$13/month
- **Zip deploy** is already scripted and works well for this app size
- Saba already has Azure-oriented scripts written — switching platforms would throw away real work

## 2. Architecture: How Components Map to Services

| Component | Azure Service | Notes |
|-----------|--------------|-------|
| Flask API + Frontend | App Service (B1, Linux, Python 3.11) | Frontend static files bundled into Flask `static/` |
| SQLite Database | Azure Files mount (`/home/data`) | Persistent across redeploys |
| Telegram Bot | App Service (B1, same plan) | Optional, shares the App Service Plan (no extra plan cost) |
| Secrets | App Settings (env vars) | Key Vault mentioned in README but not implemented |

**This is already defined in the scripts and Bicep template — nothing to redesign.**

## 3. Database Considerations: SQLite in Production

### It works, with caveats:

- **Azure Files mount adds latency** (~2-5ms per I/O op vs <1ms for local disk). For a personal/small-team task board, this is fine.
- **No concurrent write scaling** — SQLite uses file-level locking. With collaboration/sharing features, simultaneous writes from multiple users could cause "database is locked" errors under moderate load.
- **No built-in backup** — need to script periodic copies of the `.db` file from the Azure Files share.

### When to upgrade to PostgreSQL:
- More than ~5 concurrent active users
- If "database is locked" errors appear in logs
- If you want proper backup/restore, point-in-time recovery

### How to upgrade (when ready):
- Azure Database for PostgreSQL Flexible Server (Burstable B1ms): ~$13/month
- Change `DATABASE_URL` env var from `sqlite:///...` to `postgresql://...`
- Add `psycopg2-binary` to requirements.txt
- SQLAlchemy handles the rest — no code changes needed

**My recommendation: Start with SQLite. It's fine for launch. Migrate if/when needed.**

## 4. Cost Estimate

| Resource | SKU | Monthly Cost |
|----------|-----|-------------|
| App Service Plan (Linux) | B1 | ~$13 |
| App Service – Backend + Frontend | (included in plan) | $0 |
| App Service – Telegram Bot | (shares plan) | $0 |
| Azure Storage (Files) | Standard LRS, <1GB | ~$0.05 |
| **Total without bot** | | **~$13/month** |
| **Total with bot** | | **~$13/month** |

The bot shares the App Service Plan, so it adds no cost. Storage for a tiny SQLite DB is essentially free.

**If you switch to PostgreSQL later:** Add ~$13/month for Flexible Server B1ms.

**Free tier alternative:** Azure App Service F1 (free) exists but has no always-on, no custom domains, and sleeps after 20 min of inactivity. Not recommended for OAuth callbacks.

## 5. What's Already Done vs. What Needs Work

### ✅ Already Done (Working)
- `config.sample.sh` with all required env vars
- `deploy.sh` — creates resource group, App Service Plan, backend app, storage mount, optional bot app
- `deploy-backend.sh` — zips backend + frontend, deploys via `az webapp deploy`
- `deploy-bot.sh` — zips bot, deploys, sets Telegram webhook
- `main.bicep` — full declarative Bicep template (alternative to shell scripts)
- `deploy.yml` — GitHub Actions CI/CD pipeline (build, test, deploy)
- `deploy/README.md` — comprehensive documentation

### ⚠️ Needs Work (Before First Real Deploy)
1. **No production WSGI server** — Flask's dev server should NOT be used in production. Need to add Gunicorn startup command: `gunicorn --bind=0.0.0.0 --timeout 600 run:app`
2. **Shell scripts and Bicep are redundant** — `deploy.sh` does the same thing as `main.bicep` but imperatively. Should pick one. I recommend keeping `deploy.sh` for simplicity and dropping Bicep, OR switching fully to Bicep and simplifying `deploy.sh` to just call `az deployment group create`.
3. **No health check endpoint** — should add a `/health` or `/api/v1/health` route for Azure health probes
4. **No database backup** — need a simple script or scheduled task to copy the SQLite file
5. **Key Vault not actually used** — mentioned in README but secrets are just in App Settings. Fine for now, but should be addressed for production security.
6. **Bicep modules directory is empty** — started modular approach but never completed
7. **GitHub Actions needs secrets configured** — `AZURE_CREDENTIALS` service principal needs to be created and added to repo secrets
8. **No startup command configured** — Azure App Service needs to know to run Gunicorn, not Flask dev server
9. **Frontend API base URL** — need to verify `api.js` uses relative URLs or the correct base URL for production

## 6. Alternative Options (Simpler/Cheaper)

### Option A: Railway.app (~$5/month)
- One-click deploy from GitHub
- Supports Python + SQLite (with persistent volumes)
- Simpler than Azure, good for personal projects
- Would need to rewrite deploy scripts

### Option B: Fly.io (~$0-5/month)
- Container-based, but has a generous free tier
- Persistent volumes for SQLite
- Good for small apps, global edge deployment
- Needs a Dockerfile

### Option C: Render.com (~$0-7/month)
- Free tier with auto-sleep (like Azure F1)
- Paid tier ($7/month) for always-on
- Easy GitHub integration
- Built-in PostgreSQL option

### Option D: Self-hosted VPS (DigitalOcean/Hetzner, ~$4-6/month)
- Full control, cheapest option
- More ops work (nginx, SSL, systemd, backups)
- Good if comfortable with Linux admin

**My recommendation: Stick with Azure App Service.** The scripts are already written, cost is reasonable (~$13/month), and it's a professional-grade platform. The alternatives save a few dollars but require rewriting the deployment setup from scratch.

## 7. Recommended Next Steps (Priority Order)

1. **Add Gunicorn** to `requirements.txt` and configure startup command
2. **Add a `/health` endpoint** to the Flask app
3. **Decide: shell scripts OR Bicep** (not both)
4. **Create `config.sh`** from the sample and fill in real values
5. **Test deploy** to a dev resource group
6. **Configure GitHub Actions secrets** for CI/CD
7. **Add SQLite backup script** (cron job or Azure Automation)

---

**Status:** RECOMMENDATION — awaiting Saba's review and approval before any implementation.
