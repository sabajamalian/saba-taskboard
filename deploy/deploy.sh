#!/bin/bash
set -e

# TaskBoard Azure Infrastructure Deployment
# This script creates all required Azure resources

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "Error: config.sh not found. Copy config.sample.sh to config.sh and configure it."
    exit 1
fi

echo "🚀 TaskBoard Azure Deployment"
echo "=============================="
echo "Resource Group: $AZURE_RESOURCE_GROUP"
echo "Location: $AZURE_LOCATION"
echo "Backend App: $BACKEND_APP_NAME"
echo ""

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "Error: Azure CLI not found. Install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
az account show &> /dev/null || {
    echo "Please login to Azure first:"
    az login
}

# Set subscription
echo "📋 Setting subscription..."
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# Create resource group
echo "📦 Creating resource group..."
az group create \
    --name "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --output none

# Create App Service Plan
echo "📋 Creating App Service Plan..."
az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --sku "$APP_SERVICE_SKU" \
    --is-linux \
    --output none

# Create Backend Web App
echo "🔧 Creating Backend Web App..."
az webapp create \
    --name "$BACKEND_APP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --runtime "PYTHON:3.11" \
    --output none

# Configure Backend App Settings
echo "⚙️ Configuring Backend App Settings..."
az webapp config appsettings set \
    --name "$BACKEND_APP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --settings \
        SECRET_KEY="$SECRET_KEY" \
        JWT_SECRET_KEY="$JWT_SECRET_KEY" \
        GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
        GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
        DATABASE_URL="sqlite:///data/taskboard.db" \
        SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    --output none

# Enable HTTPS only
az webapp update \
    --name "$BACKEND_APP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --https-only true \
    --output none

# Create storage for SQLite persistence
echo "💾 Creating storage for database..."
STORAGE_ACCOUNT="${APP_NAME_PREFIX}storage"
# Remove hyphens and lowercase (storage account naming rules)
STORAGE_ACCOUNT=$(echo "$STORAGE_ACCOUNT" | tr -d '-' | tr '[:upper:]' '[:lower:]')

az storage account create \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --sku Standard_LRS \
    --output none

# Create file share
az storage share create \
    --name "taskboard-data" \
    --account-name "$STORAGE_ACCOUNT" \
    --output none

# Get storage key
STORAGE_KEY=$(az storage account keys list \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --account-name "$STORAGE_ACCOUNT" \
    --query "[0].value" \
    --output tsv)

# Mount storage to web app
az webapp config storage-account add \
    --name "$BACKEND_APP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --custom-id "taskboard-data" \
    --storage-type AzureFiles \
    --share-name "taskboard-data" \
    --account-name "$STORAGE_ACCOUNT" \
    --access-key "$STORAGE_KEY" \
    --mount-path "/home/data" \
    --output none

# Create Telegram Bot App (optional)
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    echo "🤖 Creating Telegram Bot Web App..."
    az webapp create \
        --name "$BOT_APP_NAME" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --plan "$APP_SERVICE_PLAN" \
        --runtime "PYTHON:3.11" \
        --output none

    BOT_URL="https://${BOT_APP_NAME}.azurewebsites.net"
    
    az webapp config appsettings set \
        --name "$BOT_APP_NAME" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --settings \
            TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
            TASKBOARD_API_URL="https://${BACKEND_APP_NAME}.azurewebsites.net/api/v1" \
            WEBHOOK_URL="$BOT_URL" \
            SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
        --output none
    
    az webapp update \
        --name "$BOT_APP_NAME" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --https-only true \
        --output none
fi

# Output results
echo ""
echo "✅ Infrastructure deployment complete!"
echo ""
echo "📋 Resource Summary:"
echo "   Resource Group: $AZURE_RESOURCE_GROUP"
echo "   Backend URL: https://${BACKEND_APP_NAME}.azurewebsites.net"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    echo "   Bot URL: https://${BOT_APP_NAME}.azurewebsites.net"
fi
echo ""
echo "📝 Next Steps:"
echo "   1. Run ./deploy-backend.sh to deploy the Flask API"
echo "   2. Run ./deploy-frontend.sh to deploy the frontend"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    echo "   3. Run ./deploy-bot.sh to deploy the Telegram bot"
fi
echo ""
echo "🔐 Don't forget to:"
echo "   - Update Google OAuth redirect URI to:"
echo "     https://${BACKEND_APP_NAME}.azurewebsites.net/api/v1/auth/callback"
