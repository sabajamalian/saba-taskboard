import sys
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

from config import TELEGRAM_BOT_TOKEN, WEBHOOK_URL
from handlers import (
    start, help_command, set_token, boards, tasks, 
    add_task, lists, view_list, handle_message
)

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


def main():
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set")
        sys.exit(1)
    
    # Create application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("settoken", set_token))
    application.add_handler(CommandHandler("boards", boards))
    application.add_handler(CommandHandler("tasks", tasks))
    application.add_handler(CommandHandler("add", add_task))
    application.add_handler(CommandHandler("lists", lists))
    application.add_handler(CommandHandler("list", view_list))
    
    # Add message handler for natural language
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Run bot
    if '--polling' in sys.argv or not WEBHOOK_URL:
        logger.info("Starting bot in polling mode...")
        application.run_polling(allowed_updates=Update.ALL_TYPES)
    else:
        logger.info(f"Starting bot with webhook at {WEBHOOK_URL}...")
        application.run_webhook(
            listen='0.0.0.0',
            port=8443,
            url_path=TELEGRAM_BOT_TOKEN,
            webhook_url=f"{WEBHOOK_URL}/{TELEGRAM_BOT_TOKEN}"
        )


if __name__ == '__main__':
    main()
