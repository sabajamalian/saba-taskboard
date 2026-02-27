from telegram import Update
from telegram.ext import ContextTypes
from handlers.commands import get_api


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle natural language messages for quick task creation"""
    text = update.message.text.strip()
    
    api = get_api(update.effective_user.id)
    if not api:
        # Ignore messages from unlinked users
        return
    
    # Quick add pattern: "add to [board]: [task]"
    if text.lower().startswith('add to '):
        parts = text[7:].split(':', 1)
        if len(parts) == 2:
            board_ref = parts[0].strip()
            task_title = parts[1].strip()
            
            try:
                # Try to parse as board ID
                board_id = int(board_ref)
                task = await api.create_task(board_id, task_title)
                await update.message.reply_text(f"✅ Added: {task['title']}")
            except ValueError:
                await update.message.reply_text(
                    "Use board ID: `add to 1: My task`\n"
                    "Use /boards to see your board IDs",
                    parse_mode='Markdown'
                )
            except Exception as e:
                await update.message.reply_text(f"Error: {str(e)}")
