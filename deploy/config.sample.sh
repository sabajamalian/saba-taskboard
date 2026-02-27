#!/bin/bash
# Sample configuration for TaskBoard Azure deployment
# Copy this file to config.sh and fill in your values

# Azure Configuration
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_RESOURCE_GROUP="taskboard-rg"
export AZURE_LOCATION="eastus"

# App Names (must be globally unique)
export APP_NAME_PREFIX="taskboard"
export BACKEND_APP_NAME="${APP_NAME_PREFIX}-api"
export BOT_APP_NAME="${APP_NAME_PREFIX}-bot"

# Google OAuth (from Google Cloud Console)
export GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Telegram Bot (optional - from @BotFather)
export TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# Application Secrets (generate random strings)
export SECRET_KEY=$(openssl rand -hex 32)
export JWT_SECRET_KEY=$(openssl rand -hex 32)

# App Service Plan
export APP_SERVICE_PLAN="${APP_NAME_PREFIX}-plan"
export APP_SERVICE_SKU="B1"  # B1, B2, B3, S1, S2, S3, P1v2, P2v2, P3v2
