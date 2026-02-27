#!/bin/bash
set -e

# Deploy TaskBoard Backend to Azure App Service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load configuration
source "$SCRIPT_DIR/config.sh"

echo "🔧 Deploying TaskBoard Backend"
echo "==============================="

# Navigate to backend directory
cd "$PROJECT_ROOT/backend"

# Create deployment package
echo "📦 Creating deployment package..."
rm -f deploy.zip

# Copy frontend files to static directory for serving
echo "📁 Bundling frontend with backend..."
mkdir -p static
cp -r "$PROJECT_ROOT/frontend/"* static/

# Create zip excluding unnecessary files
zip -r deploy.zip . \
    -x "*.pyc" \
    -x "__pycache__/*" \
    -x "venv/*" \
    -x ".env" \
    -x "*.db" \
    -x "instance/*"

# Deploy to Azure
echo "🚀 Deploying to Azure App Service..."
az webapp deploy \
    --name "$BACKEND_APP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --src-path deploy.zip \
    --type zip

# Cleanup
rm -f deploy.zip
rm -rf static

echo ""
echo "✅ Backend deployment complete!"
echo "   URL: https://${BACKEND_APP_NAME}.azurewebsites.net"
echo ""
echo "🔍 View logs with:"
echo "   az webapp log tail --name $BACKEND_APP_NAME --resource-group $AZURE_RESOURCE_GROUP"
