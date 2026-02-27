# TaskBoard Azure Deployment

This directory contains automation scripts and infrastructure-as-code for deploying TaskBoard to Azure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Azure Resource Group                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐      ┌─────────────────┐             │
│   │  App Service    │      │  App Service    │             │
│   │  (Flask API)    │◄────►│  (Telegram Bot) │             │
│   │  + Frontend     │      │                 │             │
│   └────────┬────────┘      └─────────────────┘             │
│            │                                                │
│            ▼                                                │
│   ┌─────────────────┐      ┌─────────────────┐             │
│   │  SQLite on      │      │  Key Vault      │             │
│   │  Mounted Storage│      │  (Secrets)      │             │
│   └─────────────────┘      └─────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Azure subscription with appropriate permissions
- Git installed
- Python 3.11+ (for local testing)

## Quick Start

### 1. Configure Variables

Copy the sample config and edit with your values:

```bash
cp deploy/config.sample.sh deploy/config.sh
# Edit config.sh with your values
```

### 2. Deploy Infrastructure

```bash
# Login to Azure
az login

# Run the deployment script
./deploy/deploy.sh
```

### 3. Deploy Application Code

```bash
# Deploy backend
./deploy/deploy-backend.sh

# Deploy frontend (static files)
./deploy/deploy-frontend.sh

# Deploy Telegram bot (optional)
./deploy/deploy-bot.sh
```

## Directory Structure

```
deploy/
├── README.md              # This file
├── config.sample.sh       # Sample configuration
├── deploy.sh              # Main deployment script
├── deploy-backend.sh      # Deploy Flask API
├── deploy-frontend.sh     # Deploy frontend static files
├── deploy-bot.sh          # Deploy Telegram bot
├── bicep/
│   ├── main.bicep         # Main infrastructure template
│   └── modules/           # Modular Bicep components
└── github-actions/
    └── deploy.yml         # CI/CD workflow template
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | Resource group name |
| `AZURE_LOCATION` | Azure region (e.g., `eastus`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (optional) |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API" and "Google Identity"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `https://<your-app>.azurewebsites.net/api/v1/auth/callback`
6. Copy Client ID and Client Secret

### Telegram Bot Setup (Optional)

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token
4. Set webhook after deployment: `https://<your-bot-app>.azurewebsites.net/<BOT_TOKEN>`

## Deployment Scripts

### deploy.sh

Main deployment script that:
- Creates resource group
- Deploys Azure resources via Bicep
- Configures app settings
- Sets up secrets in Key Vault

### deploy-backend.sh

Deploys the Flask API:
- Creates Python virtual environment
- Installs dependencies
- Zips and deploys to App Service

### deploy-frontend.sh

Deploys the frontend:
- Copies static files to backend's static folder
- Alternatively can deploy to Azure Static Web Apps

### deploy-bot.sh

Deploys the Telegram bot:
- Creates separate App Service
- Configures webhook URL
- Sets environment variables

## CI/CD with GitHub Actions

TaskBoard uses three separate, manually-triggered GitHub Actions workflows for deployment:

| Workflow | Purpose | When to Use |
|----------|---------|-------------|
| **Deploy Azure Infrastructure** | Creates/updates Azure resources | First-time setup, or infrastructure changes |
| **Deploy Backend Application** | Deploys Flask API + frontend | Code changes, configuration updates |
| **Deploy Telegram Bot** | Deploys Telegram bot | Bot code changes (optional) |

All workflows are **idempotent** — you can run them multiple times safely without creating duplicate resources.

### Step 1: Create Azure Service Principal

Create a service principal for GitHub Actions to authenticate with Azure:

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"

# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "github-actions-taskboard" \
  --role Contributor \
  --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID> \
  --sdk-auth
```

Copy the JSON output — this goes into `AZURE_CREDENTIALS` secret.

### Step 2: Configure GitHub Secrets

Go to **Repository Settings → Secrets and variables → Actions → Secrets**

Create these **Repository Secrets**:

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `AZURE_CREDENTIALS` | Service principal JSON | Output from `az ad sp create-for-rbac --sdk-auth` |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | `az account show --query id -o tsv` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Same location as Client ID |
| `SECRET_KEY` | Flask secret key | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_SECRET_KEY` | JWT signing key | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (optional) | [@BotFather](https://t.me/BotFather) on Telegram |

### Step 3: Configure GitHub Variables

Go to **Repository Settings → Secrets and variables → Actions → Variables**

Create these **Repository Variables**:

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `AZURE_RESOURCE_GROUP` | Azure resource group name | `taskboard-rg` |
| `AZURE_LOCATION` | Azure region | `eastus`, `westus2`, `northeurope` |
| `APP_NAME_PREFIX` | Prefix for all Azure resources | `taskboard` (creates `taskboard-api`, `taskboard-bot`) |
| `APP_SERVICE_SKU` | App Service tier | `B1` (Basic), `S1` (Standard), `P1v2` (Premium) |
| `DEPLOY_BOT` | Deploy Telegram bot | `true` or `false` |

### Step 4: Environment-Specific Configuration (Optional)

For staging/production environments with different configs:

1. Go to **Repository Settings → Environments**
2. Create environments: `production`, `staging`
3. Add environment-specific secrets/variables that override repository-level ones

Example for staging:
- `AZURE_RESOURCE_GROUP` = `taskboard-staging-rg`
- `APP_NAME_PREFIX` = `taskboard-staging`

### Step 5: Deploy

**All deployments are manual** — trigger them from the GitHub Actions UI:

1. Go to **Actions** tab in your repository
2. Select the workflow you want to run
3. Click **Run workflow**
4. Select the target environment
5. Click **Run workflow**

#### Deployment Order (First Time)

For initial setup, run workflows in this order:

1. **Deploy Azure Infrastructure** → Creates resource group, App Services, storage
2. **Deploy Backend Application** → Deploys the Flask API with frontend
3. **Deploy Telegram Bot** (optional) → Deploys bot and sets webhook

#### Deployment Order (Updates)

For code updates, just run the relevant workflow:

- Code changes → **Deploy Backend Application**
- Bot changes → **Deploy Telegram Bot**
- Infrastructure changes → **Deploy Azure Infrastructure** (then redeploy apps)

### Workflow Details

#### Deploy Azure Infrastructure

| Option | Description |
|--------|-------------|
| Environment | `production` or `staging` |

Creates/updates:
- Resource Group
- App Service Plan (Linux, Python 3.11)
- Web App for backend API
- Storage Account with Azure Files (for SQLite persistence)
- (Optional) Web App for Telegram bot

#### Deploy Backend Application

| Option | Description |
|--------|-------------|
| Environment | `production` or `staging` |
| Run tests | Run pytest before deployment (default: true) |

Deploys:
- Flask API
- Frontend static files
- App configuration and secrets

#### Deploy Telegram Bot

| Option | Description |
|--------|-------------|
| Environment | `production` or `staging` |

Deploys:
- Telegram bot application
- Configures webhook automatically

### Complete Setup Checklist

```
[ ] 1. Create Azure subscription
[ ] 2. Create service principal: az ad sp create-for-rbac --sdk-auth
[ ] 3. Create Google OAuth credentials
[ ] 4. (Optional) Create Telegram bot via @BotFather
[ ] 5. Add all GitHub Secrets
[ ] 6. Add all GitHub Variables
[ ] 7. Run "Deploy Azure Infrastructure" workflow
[ ] 8. Run "Deploy Backend Application" workflow
[ ] 9. Update Google OAuth redirect URI to deployed URL
[ ] 10. (Optional) Run "Deploy Telegram Bot" workflow
```

### First-Time Deployment

For initial setup:

1. Go to **Actions → Deploy Azure Infrastructure**
2. Click **Run workflow**, select **production**, click **Run workflow**
3. Wait for completion
4. Go to **Actions → Deploy Backend Application**
5. Click **Run workflow**, select **production**, click **Run workflow**
6. (Optional) Go to **Actions → Deploy Telegram Bot** and run

### After Deployment

1. **Update Google OAuth redirect URI:**
   ```
   https://<APP_NAME_PREFIX>-api.azurewebsites.net/api/v1/auth/callback
   ```

2. **Verify deployment:**
   ```bash
   curl https://<APP_NAME_PREFIX>-api.azurewebsites.net/api/v1/health
   ```

3. **View logs:**
   ```bash
   az webapp log tail -n <APP_NAME_PREFIX>-api -g <RESOURCE_GROUP>
   ```

## Monitoring

After deployment, monitor your app:

```bash
# View logs
az webapp log tail --name taskboard-api --resource-group taskboard-rg

# View metrics in Azure Portal
az portal open --resource-group taskboard-rg
```

## Costs

Estimated monthly costs (Basic tier):
- App Service (B1): ~$13/month
- App Service for bot (B1): ~$13/month (optional)
- Key Vault: ~$0.03/10k operations
- Storage (for SQLite): ~$0.02/GB

**Total: ~$13-26/month**

## Troubleshooting

### Common Issues

1. **OAuth redirect error**: Ensure redirect URI in Google Console matches your App Service URL
2. **Database locked**: SQLite requires persistent storage; ensure Azure Files is mounted
3. **Bot not responding**: Check webhook is set correctly, verify bot token

### Logs

```bash
# Backend logs
az webapp log tail -n taskboard-api -g taskboard-rg

# Bot logs
az webapp log tail -n taskboard-bot -g taskboard-rg
```

## Security Notes

- Never commit `config.sh` with real secrets
- Use Key Vault for all sensitive values
- Enable HTTPS only on App Services
- Rotate secrets regularly
