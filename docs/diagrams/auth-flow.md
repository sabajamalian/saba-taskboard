# Authentication Flow

> **Status:** ✅ APPROVED  
> **Prepared by:** Parker (Architect/Diagrammer)  
> **Date:** 2026-02-27

## Gmail OAuth Flow (Web)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Browser
    participant FlaskAPI as Flask API
    participant Google as Google OAuth

    User->>Browser: Click "Login with Google"
    Browser->>FlaskAPI: GET /api/v1/auth/login
    FlaskAPI->>Browser: Redirect to Google OAuth URL
    Browser->>Google: OAuth consent screen
    User->>Google: Grant permission
    Google->>Browser: Redirect with auth code
    Browser->>FlaskAPI: GET /api/v1/auth/callback?code=XXX
    FlaskAPI->>Google: Exchange code for tokens
    Google->>FlaskAPI: Access token + ID token
    FlaskAPI->>Google: Get user info (email, name, avatar)
    Google->>FlaskAPI: User profile
    FlaskAPI->>FlaskAPI: Create/update user in DB
    FlaskAPI->>FlaskAPI: Create session
    FlaskAPI->>Browser: Set session cookie + redirect to app
    Browser->>User: Logged in, show dashboard
```

## JWT Token Flow (API/Telegram Bot)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant TelegramBot as Telegram Bot
    participant FlaskAPI as Flask API

    Note over User,TelegramBot: One-time setup
    User->>TelegramBot: /login
    TelegramBot->>User: Link to web login with bot token
    User->>FlaskAPI: Complete OAuth (web flow)
    FlaskAPI->>FlaskAPI: Generate JWT for bot
    FlaskAPI->>User: Display JWT (or auto-link)
    User->>TelegramBot: /settoken JWT_HERE
    TelegramBot->>TelegramBot: Store JWT for user

    Note over User,TelegramBot: Normal usage
    User->>TelegramBot: /boards
    TelegramBot->>FlaskAPI: GET /api/v1/boards<br/>Authorization: Bearer JWT
    FlaskAPI->>FlaskAPI: Validate JWT
    FlaskAPI->>TelegramBot: 200 OK + boards list
    TelegramBot->>User: Your boards: ...
```

## Session vs JWT Decision Points

```mermaid
flowchart TD
    Request["Incoming Request"] --> CheckCookie{"Has Session Cookie?"}
    
    CheckCookie -->|Yes| ValidateSession["Validate Session"]
    CheckCookie -->|No| CheckHeader{"Has Authorization Header?"}
    
    ValidateSession -->|Valid| Authenticated["✅ Authenticated"]
    ValidateSession -->|Invalid| Unauthorized["❌ 401 Unauthorized"]
    
    CheckHeader -->|Yes| ValidateJWT["Validate JWT"]
    CheckHeader -->|No| Unauthorized
    
    ValidateJWT -->|Valid| Authenticated
    ValidateJWT -->|Expired| Unauthorized
    ValidateJWT -->|Invalid| Unauthorized
    
    Authenticated --> ProcessRequest["Process API Request"]
```

## Token Contents

### Session (stored server-side)
```json
{
  "user_id": 123,
  "email": "saba@gmail.com",
  "created_at": "2026-02-27T10:00:00Z"
}
```

### JWT (stateless, in token)
```json
{
  "sub": 123,
  "email": "saba@gmail.com",
  "iat": 1740672000,
  "exp": 1743264000
}
```

## Security Considerations

| Aspect | Session | JWT |
|--------|---------|-----|
| Storage | Server-side (file/memory) | Client-side |
| Cookie flags | HttpOnly, Secure, SameSite=Lax | N/A (header) |
| Expiration | Server controls | Token expiry claim |
| Revocation | Delete session | Requires blocklist or short expiry |
| Use case | Web browser | API clients, Telegram bot |
