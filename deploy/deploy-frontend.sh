#!/bin/bash
set -e

# Deploy TaskBoard Frontend
# Frontend is served by the Flask backend as static files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load configuration
source "$SCRIPT_DIR/config.sh"

echo "⚛️ Deploying TaskBoard Frontend"
echo "================================"

echo "ℹ️  Frontend is bundled with backend deployment."
echo "   Run ./deploy-backend.sh to deploy both."
echo ""
echo "   Alternatively, for Azure Static Web Apps:"
echo ""
echo "   1. Create Static Web App in Azure Portal"
echo "   2. Connect to your GitHub repo"
echo "   3. Set app location to: /frontend"
echo "   4. Set output location to: (leave empty)"
echo ""
echo "   The frontend will be served at your Static Web App URL."
