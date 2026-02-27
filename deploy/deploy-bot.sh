#!/bin/bash
set -e

# Deploy TaskBoard Telegram Bot to Azure App Service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load configuration
source "$SCRIPT_DIR/config.sh"

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN not set in config.sh"
    exit 1
fi

echo "🤖 Deploying TaskBoard Telegram Bot"
echo "===================================="

# Navigate to bot directory
cd "$PROJECT_ROOT/telegram-bot"

# Create deployment package
echo "📦 Creating deployment package..."
rm -f deploy.zip

zip -r deploy.zip . \
    -x "*.pyc" \
    -x "__pycache__/*" \
    -x "venv/*" \
    -x ".env"

# Deploy to Azure
echo "🚀 Deploying to Azure App Service..."
az webapp deploy \
    --name "$BOT_APP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --src-path deploy.zip \
    --type zip

# Cleanup
rm -f deploy.zip

# Set up webhook
BOT_URL="https://${BOT_APP_NAME}.azurewebsites.net"
WEBHOOK_URL="${BOT_URL}/${TELEGRAM_BOT_TOKEN}"

echo "🔗 Setting up Telegram webhook..."
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}" | jq .

echo ""
echo "✅ Bot deployment complete!"
echo "   Bot URL: $BOT_URL"
echo ""
echo "🔍 View logs with:"
echo "   az webapp log tail --name $BOT_APP_NAME --resource-group $AZURE_RESOURCE_GROUP"
echo ""
echo "📱 Test your bot by messaging it on Telegram!"
