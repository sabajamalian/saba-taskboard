# Ripley — History

## Project Context
**Project:** TaskBoard — Flask/JS/SQLite web app for task management
**User:** Saba
**Stack:** Flask backend, Vanilla JS frontend, SQLite database
**Key Features:** Gmail OAuth, boards/stages/tasks, custom fields, lists, Telegram bot, collaboration

## Learnings

### 2026-02-27: Initial Architecture Proposals
- Created comprehensive architecture decisions document at `docs/architecture-decisions.md`
- Proposed 6 key decisions for Saba's review:
  1. Flat monorepo structure (backend/, frontend/, telegram-bot/, docs/, deploy/)
  2. Hybrid custom fields (JSON column + definitions table for validation/UI)
  3. Session + JWT hybrid auth (sessions for web, JWT for API/bot)
  4. URL-based API versioning (/api/v1/)
  5. SPA with vanilla JS (client-side routing, no framework)
  6. Webhook-based Telegram bot as separate service
- Key file paths: `docs/architecture-decisions.md`, `docs/diagrams/`
- Decision protocol: ALL decisions require Saba's approval before implementation
