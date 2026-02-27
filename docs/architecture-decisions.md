# TaskBoard Architecture Decisions

> **Status:** ✅ APPROVED  
> **Prepared by:** Ripley (Lead)  
> **Approved by:** Saba  
> **Date:** 2026-02-27

All architectural decisions in this document have been approved and implemented.

---

## Decision 1: Project Structure

### Options

| Option | Description |
|--------|-------------|
| **A. Monorepo (flat)** | Single repo with `backend/`, `frontend/`, `telegram-bot/`, `docs/` at root |
| **B. Monorepo (nested)** | Single repo with `src/` containing all code, configs at root |
| **C. Multi-repo** | Separate repos for backend, frontend, and bot |

### Recommendation: **Option A — Monorepo (flat)**

```
saba-taskboard/
├── backend/           # Flask API
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── models/    # SQLAlchemy models
│   │   ├── services/  # Business logic
│   │   └── utils/     # Helpers
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
├── frontend/          # Vanilla JS + HTML
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── index.html
├── telegram-bot/      # Telegram integration
│   ├── bot.py
│   └── handlers/
├── docs/              # Documentation & diagrams
├── deploy/            # Azure deployment scripts (Brett's domain)
└── .squad/            # Team configuration
```

### Rationale
- Simple navigation and shared tooling
- Easy to set up CI/CD for all components
- Keeps related code together for a small team

### Trade-offs
- ✅ Easy cross-component refactoring
- ✅ Single PR for full-stack changes
- ⚠️ Larger repo size over time (acceptable for this project scale)

**🔴 DECISION NEEDED:** Approve project structure?

---

## Decision 2: Database Schema for Custom Fields

### Options

| Option | Description | Query Complexity | Flexibility |
|--------|-------------|------------------|-------------|
| **A. JSON Column** | Store custom fields as JSON in tasks table | Low | High |
| **B. EAV (Entity-Attribute-Value)** | Separate table with task_id, field_name, field_value | Medium | High |
| **C. Hybrid** | JSON column + separate custom_field_definitions table | Low-Medium | Highest |

### Recommendation: **Option C — Hybrid Approach**

```sql
-- Defines what custom fields exist for a board
CREATE TABLE custom_field_definitions (
    id INTEGER PRIMARY KEY,
    board_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,  -- 'text', 'number', 'date', 'select'
    options TEXT,              -- JSON for select options
    created_at TIMESTAMP
);

-- Tasks store their custom field values as JSON
CREATE TABLE tasks (
    ...
    custom_fields TEXT  -- JSON: {"priority": "high", "estimate": 5}
);
```

### Rationale
- Field definitions give structure (validation, UI rendering)
- JSON storage keeps queries simple (no JOINs for custom data)
- SQLite has good JSON support via `json_extract()`

### Trade-offs
- ✅ Can validate field types on write
- ✅ Frontend knows what fields to render without parsing JSON
- ✅ Simpler queries than full EAV
- ⚠️ Harder to query across custom fields (acceptable — primary filtering will be on standard fields)

**🔴 DECISION NEEDED:** Approve hybrid custom fields approach?

---

## Decision 3: Authentication Strategy

### Options

| Option | API Auth | Session Storage | External API Use |
|--------|----------|-----------------|------------------|
| **A. Session-based** | Cookie with session ID | Server-side (file/redis) | Requires session |
| **B. JWT** | Bearer token | Stateless (token contains claims) | Easy |
| **C. Hybrid** | Session for web, JWT for API | Both | Most flexible |

### Recommendation: **Option C — Hybrid**

- **Web frontend:** Session-based (secure HttpOnly cookies)
- **API clients & Telegram bot:** JWT tokens

### Flow
1. User logs in via Gmail OAuth → Flask creates session + issues JWT
2. Web frontend uses session cookie automatically
3. Telegram bot stores JWT, includes in API requests
4. JWT includes: `user_id`, `email`, `exp` (expiration)

### Rationale
- Sessions are simpler and more secure for browser-based auth
- JWT enables the Telegram bot and any future integrations without session management
- Both can coexist — check for session first, then JWT header

### Trade-offs
- ✅ Best of both worlds
- ✅ Telegram bot doesn't need to maintain session state
- ⚠️ Slightly more complex auth middleware (acceptable)

**🔴 DECISION NEEDED:** Approve hybrid session + JWT auth?

---

## Decision 4: API Versioning

### Options

| Option | Example | Pros | Cons |
|--------|---------|------|------|
| **A. URL path** | `/api/v1/boards` | Clear, easy routing | URL clutter |
| **B. Header** | `Accept: application/vnd.taskboard.v1+json` | Clean URLs | Hidden, harder to test |
| **C. No versioning** | `/api/boards` | Simple | Breaking changes hard |

### Recommendation: **Option A — URL Path Versioning**

```
/api/v1/auth/...
/api/v1/boards/...
/api/v1/tasks/...
```

### Rationale
- Most explicit and debuggable
- Easy to run v1 and v2 side-by-side during migration
- Industry standard for REST APIs

### Trade-offs
- ✅ Clear which version is being used
- ✅ Can deprecate gracefully
- ⚠️ Slightly longer URLs (negligible)

**🔴 DECISION NEEDED:** Approve URL-based API versioning?

---

## Decision 5: Frontend Architecture

### Options

| Option | Description | Complexity |
|--------|-------------|------------|
| **A. Multi-page (MPA)** | Each view is a separate HTML page, full reload | Low |
| **B. Single-page (SPA)** | One HTML page, JS handles routing | Medium |
| **C. Hybrid** | Server-rendered pages with JS enhancements | Low-Medium |

### Recommendation: **Option B — Single Page Application**

### Approach
- Single `index.html` entry point
- Client-side routing via hash (`#/boards`, `#/boards/1/tasks`) or History API
- Modular JS: separate files per feature, bundled or loaded as ES modules
- State: Simple object store, no framework (keep it vanilla)

```
frontend/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # Entry point, router
│   ├── state.js        # Simple state management
│   ├── api.js          # Fetch wrapper
│   ├── components/     # Reusable UI components
│   └── views/          # Page-level views
└── assets/
```

### Rationale
- Smoother UX for a task management app (no full reloads)
- Vanilla JS SPA is achievable without a framework
- Good learning exercise and full control

### Trade-offs
- ✅ Fast, app-like experience
- ✅ No framework dependencies
- ⚠️ Manual routing and state management (acceptable for scope)
- ⚠️ SEO not important for this app (authenticated content)

**🔴 DECISION NEEDED:** Approve SPA approach with vanilla JS?

---

## Decision 6: Telegram Bot Architecture

### Options

| Option | Description | Hosting | Real-time |
|--------|-------------|---------|-----------|
| **A. Polling** | Bot polls Telegram servers for updates | Any | Slight delay |
| **B. Webhook** | Telegram pushes updates to our endpoint | Needs HTTPS | Instant |
| **C. Separate service** | Bot runs as independent process/container | Independent | Either |

### Recommendation: **Option B + C — Webhook as Separate Service**

### Architecture
- Telegram bot runs as a separate Python service
- Uses webhooks (Telegram pushes updates to `/telegram/webhook`)
- Bot service calls the main API (authenticated via JWT)
- Can be deployed independently from main app

```
telegram-bot/
├── bot.py              # Main bot setup, webhook handler
├── handlers/
│   ├── commands.py     # /start, /help, /boards, /tasks
│   └── messages.py     # Natural language task creation
├── api_client.py       # Wrapper for TaskBoard API calls
└── config.py           # Bot token, API URL
```

### Rationale
- Webhooks are more efficient (no constant polling)
- Separate service = independent scaling, deployment, failure isolation
- Bot authenticates to API like any other client

### Trade-offs
- ✅ Real-time responses
- ✅ Can deploy/restart bot without touching main app
- ⚠️ Requires public HTTPS endpoint for webhook (Azure provides this)
- ⚠️ Slightly more complex deployment (Brett will handle)

**🔴 DECISION NEEDED:** Approve webhook-based bot as separate service?

---

## Summary of Decisions Needed

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Project Structure | Flat monorepo |
| 2 | Custom Fields Storage | Hybrid (JSON + definitions table) |
| 3 | Authentication | Session (web) + JWT (API/bot) |
| 4 | API Versioning | URL path (`/api/v1/`) |
| 5 | Frontend Architecture | SPA with vanilla JS |
| 6 | Telegram Bot | Webhook + separate service |

**Please review and approve/modify each decision so the team can begin implementation.**
