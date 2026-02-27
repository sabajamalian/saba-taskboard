# TaskBoard

A web application for task and project management with boards, stages, tasks, and standalone lists.

## Features

- 🔐 **Gmail OAuth Authentication** — Secure login with Google accounts
- 📋 **Boards** — Create project boards with customizable color themes
- 📊 **Stages** — Kanban-style workflow (To Do, In Progress, Done) with drag-and-drop
- ✅ **Tasks** — Full task management with due dates, descriptions, and dynamic colors
- 🎨 **Custom Fields** — Add custom attributes to tasks (text, number, date, select)
- 📝 **Standalone Lists** — Shopping lists, groceries, checklists with checkbox items
- 👥 **Collaboration** — Share boards with other users (view/edit permissions)
- 🤖 **Telegram Bot** — Manage tasks via Telegram chat commands
- ☁️ **Azure Ready** — Deployment scripts for Azure App Service

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Flask (Python 3.11+) |
| Frontend | Vanilla JavaScript + HTML/CSS |
| Database | SQLite with SQLAlchemy |
| Auth | Google OAuth 2.0 + JWT |
| Bot | python-telegram-bot |
| Deployment | Azure App Service |

## Project Structure

```
saba-taskboard/
├── backend/           # Flask API
│   ├── app/
│   │   ├── api/       # REST endpoints
│   │   ├── models/    # SQLAlchemy models
│   │   ├── services/  # Business logic
│   │   └── utils/     # Auth helpers
│   ├── tests/
│   └── requirements.txt
├── frontend/          # Vanilla JS SPA
│   ├── css/
│   ├── js/
│   │   ├── views/     # Page components
│   │   └── components/
│   └── index.html
├── telegram-bot/      # Telegram integration
├── deploy/            # Azure deployment scripts
├── docs/              # Architecture & diagrams
└── .squad/            # AI team configuration
```

## Quick Start

### Prerequisites

- Python 3.11+
- Google OAuth credentials ([setup guide](https://console.cloud.google.com/))

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
DATABASE_URL=sqlite:///taskboard.db
EOF

# Run
python run.py
```

### Frontend

The frontend is served by Flask. Open `http://localhost:5000` in your browser.

For development with live reload, you can use any static file server:
```bash
cd frontend
python -m http.server 3000
```

### Telegram Bot (Optional)

```bash
cd telegram-bot
pip install -r requirements.txt

# Create .env
echo "TELEGRAM_BOT_TOKEN=your-bot-token" > .env
echo "TASKBOARD_API_URL=http://localhost:5000/api/v1" >> .env

# Run in polling mode
python bot.py --polling
```

## API Reference

Base URL: `/api/v1`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Redirect to Google OAuth |
| GET | `/auth/callback` | OAuth callback |
| POST | `/auth/logout` | End session |
| GET | `/auth/me` | Get current user |
| POST | `/auth/token` | Generate JWT |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/boards` | List boards |
| POST | `/boards` | Create board |
| GET | `/boards/:id` | Get board |
| PUT | `/boards/:id` | Update board |
| DELETE | `/boards/:id` | Delete board |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/boards/:id/tasks` | List tasks |
| POST | `/boards/:id/tasks` | Create task |
| PUT | `/boards/:id/tasks/:id` | Update task |
| DELETE | `/boards/:id/tasks/:id` | Delete task |
| PUT | `/boards/:id/tasks/:id/move` | Move to stage |

### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lists` | List all lists |
| POST | `/lists` | Create list |
| GET | `/lists/:id` | Get list with items |
| PUT | `/lists/:id/items/:id/toggle` | Toggle checkbox |

See [API Structure](docs/diagrams/api-structure.md) for full documentation.

## Deployment

### Azure

See [deploy/README.md](deploy/README.md) for detailed instructions.

Quick deploy:
```bash
# Configure
cp deploy/config.sample.sh deploy/config.sh
# Edit config.sh with your values

# Deploy infrastructure
./deploy/deploy.sh

# Deploy code
./deploy/deploy-backend.sh
./deploy/deploy-bot.sh  # Optional
```

## Documentation

- [Architecture Decisions](docs/architecture-decisions.md)
- [System Overview](docs/diagrams/system-overview.md)
- [Database ER Diagram](docs/diagrams/database-er.md)
- [Authentication Flow](docs/diagrams/auth-flow.md)
- [API Structure](docs/diagrams/api-structure.md)

## License

MIT
