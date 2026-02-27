// TaskBoard Azure Infrastructure
// Deploy with: az deployment group create -g taskboard-rg -f main.bicep

@description('Location for all resources')
param location string = resourceGroup().location

@description('Prefix for resource names')
param namePrefix string = 'taskboard'

@description('App Service Plan SKU')
param appServiceSku string = 'B1'

@description('Google OAuth Client ID')
@secure()
param googleClientId string

@description('Google OAuth Client Secret')
@secure()
param googleClientSecret string

@description('Telegram Bot Token (optional)')
@secure()
param telegramBotToken string = ''

@description('Deploy Telegram Bot')
param deployBot bool = false

// Generate secrets
var secretKey = uniqueString(resourceGroup().id, 'secret')
var jwtSecretKey = uniqueString(resourceGroup().id, 'jwt')

// Storage account name (must be lowercase, no hyphens)
var storageAccountName = toLower(replace('${namePrefix}storage', '-', ''))

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${namePrefix}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: appServiceSku
  }
  properties: {
    reserved: true
  }
}

// Storage Account for SQLite persistence
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
  }
}

// File share for database
resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2022-09-01' = {
  parent: storageAccount
  name: 'default'
}

resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2022-09-01' = {
  parent: fileService
  name: 'taskboard-data'
}

// Backend Web App
resource backendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: '${namePrefix}-api'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      alwaysOn: true
      appSettings: [
        {
          name: 'SECRET_KEY'
          value: secretKey
        }
        {
          name: 'JWT_SECRET_KEY'
          value: jwtSecretKey
        }
        {
          name: 'GOOGLE_CLIENT_ID'
          value: googleClientId
        }
        {
          name: 'GOOGLE_CLIENT_SECRET'
          value: googleClientSecret
        }
        {
          name: 'DATABASE_URL'
          value: 'sqlite:///data/taskboard.db'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
      azureStorageAccounts: {
        'taskboard-data': {
          type: 'AzureFiles'
          accountName: storageAccount.name
          shareName: 'taskboard-data'
          mountPath: '/home/data'
          accessKey: storageAccount.listKeys().keys[0].value
        }
      }
    }
  }
}

// Telegram Bot Web App (optional)
resource botApp 'Microsoft.Web/sites@2022-09-01' = if (deployBot) {
  name: '${namePrefix}-bot'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      alwaysOn: true
      appSettings: [
        {
          name: 'TELEGRAM_BOT_TOKEN'
          value: telegramBotToken
        }
        {
          name: 'TASKBOARD_API_URL'
          value: 'https://${backendApp.properties.defaultHostName}/api/v1'
        }
        {
          name: 'WEBHOOK_URL'
          value: 'https://${namePrefix}-bot.azurewebsites.net'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
    }
  }
}

// Outputs
output backendUrl string = 'https://${backendApp.properties.defaultHostName}'
output botUrl string = deployBot ? 'https://${botApp.properties.defaultHostName}' : ''
output oauthCallbackUrl string = 'https://${backendApp.properties.defaultHostName}/api/v1/auth/callback'
