# TaskBoard Telegram Bot

Telegram bot for interacting with TaskBoard via chat.

## Setup

```bash
cd telegram-bot
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file:

```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TASKBOARD_API_URL=https://your-taskboard-api.azurewebsites.net/api/v1
```

## Running

For development (polling mode):
```bash
python bot.py --polling
```

For production (webhook mode):
```bash
python bot.py
```

## Commands

- `/start` - Welcome message
- `/help` - Show available commands
- `/login` - Link your TaskBoard account
- `/boards` - List your boards
- `/tasks [board_id]` - List tasks in a board
- `/add [board_id] [title]` - Create a new task
- `/lists` - List your standalone lists
