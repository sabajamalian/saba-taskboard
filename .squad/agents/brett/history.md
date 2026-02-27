# Brett — History

## Project Context
**Project:** TaskBoard — Flask/JS/SQLite web app for task management
**User:** Saba
**Stack:** Flask backend, Vanilla JS frontend, SQLite database
**Key Features:** Gmail OAuth, boards/stages/tasks, custom fields, lists, Telegram bot, collaboration

## Learnings

### 2026-02-27: Deployment Audit & Recommendation
- **Deployment target:** Azure App Service (Linux, Python 3.11), B1 SKU
- **Architecture:** Backend + frontend bundled on one App Service; Telegram bot on separate App Service (optional); SQLite persisted on Azure Files mount at `/home/data`
- **Two deployment paths exist:** Shell scripts (`deploy.sh` etc.) using `az` CLI AND a Bicep template (`main.bicep`). They are **not integrated** — `deploy.sh` does NOT invoke Bicep.
- **Bicep modules dir is empty** — modular approach was started but not completed
- **CI/CD:** GitHub Actions workflow `deploy.yml` exists; deploys backend + bot, runs tests. Needs `AZURE_CREDENTIALS` secret configured.
- **Frontend strategy:** Static files copied into backend's `static/` folder during deployment, served by Flask. Alternative is Azure Static Web Apps (documented but not scripted).
- **Missing pieces:** No Gunicorn/production WSGI startup command; no health check endpoint; no database backup strategy; no custom domain/SSL config; no Key Vault integration in scripts (mentioned in README but not implemented).
- **Cost estimate in README:** ~$13-26/month (B1 plan + optional bot instance + storage)
- **Key file paths:**
  - `deploy/config.sample.sh` — all required env vars
  - `deploy/deploy.sh` — main infra provisioning (174 lines)
  - `deploy/deploy-backend.sh` — backend zip deploy
  - `deploy/deploy-bot.sh` — bot zip deploy + webhook setup
  - `deploy/bicep/main.bicep` — declarative infra (157 lines)
  - `deploy/github-actions/deploy.yml` — CI/CD pipeline
  - `backend/app/__init__.py` — Flask app factory, reads `DATABASE_URL` env var
  - `backend/requirements.txt` — Flask 3.0+, SQLAlchemy, Authlib, PyJWT, CORS
- **SQLite concern:** Azure Files mount adds latency (~2-5ms per I/O). Fine for low-traffic personal/team use. Would need PostgreSQL for concurrent multi-user production.
