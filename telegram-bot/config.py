import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TASKBOARD_API_URL = os.getenv('TASKBOARD_API_URL', 'http://localhost:5000/api/v1')
WEBHOOK_URL = os.getenv('WEBHOOK_URL')  # For production
