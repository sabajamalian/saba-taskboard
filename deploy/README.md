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

Copy the workflow template to your repo:

```bash
cp deploy/github-actions/deploy.yml .github/workflows/deploy.yml
```

Configure GitHub secrets:
- `AZURE_CREDENTIALS` - Service principal JSON
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TELEGRAM_BOT_TOKEN` (optional)

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
