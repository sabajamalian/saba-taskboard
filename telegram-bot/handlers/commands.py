from telegram import Update
from telegram.ext import ContextTypes
from api_client import TaskBoardAPI

# Simple in-memory token storage (use Redis or DB in production)
user_tokens = {}


def get_api(telegram_user_id: int) -> TaskBoardAPI | None:
    token = user_tokens.get(telegram_user_id)
    if token:
        return TaskBoardAPI(token)
    return None


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to TaskBoard Bot!\n\n"
        "I help you manage your tasks and boards from Telegram.\n\n"
        "First, link your account:\n"
        "1. Log in to TaskBoard web app\n"
        "2. Go to Settings > API Token\n"
        "3. Copy your token and send: /settoken YOUR_TOKEN\n\n"
        "Use /help to see available commands."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📋 *TaskBoard Bot Commands*\n\n"
        "/start - Welcome message\n"
        "/help - Show this help\n"
        "/settoken TOKEN - Link your account\n"
        "/boards - List your boards\n"
        "/tasks BOARD_ID - List tasks in a board\n"
        "/add BOARD_ID Title - Create a new task\n"
        "/lists - List your standalone lists\n"
        "/list LIST_ID - View list items",
        parse_mode='Markdown'
    )


async def set_token(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /settoken YOUR_JWT_TOKEN")
        return
    
    token = context.args[0]
    user_id = update.effective_user.id
    
    # Verify token works
    try:
        api = TaskBoardAPI(token)
        await api.get('/auth/me')
        user_tokens[user_id] = token
        await update.message.reply_text("✅ Account linked successfully!")
    except Exception:
        await update.message.reply_text("❌ Invalid token. Please check and try again.")


async def boards(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = get_api(update.effective_user.id)
    if not api:
        await update.message.reply_text("Please link your account first with /settoken")
        return
    
    try:
        data = await api.get_boards()
        owned = data.get('owned', [])
        shared = data.get('shared', [])
        
        if not owned and not shared:
            await update.message.reply_text("You don't have any boards yet.")
            return
        
        msg = "📋 *Your Boards*\n\n"
        
        if owned:
            msg += "*Owned:*\n"
            for board in owned:
                msg += f"• `{board['id']}` - {board['title']}\n"
        
        if shared:
            msg += "\n*Shared with you:*\n"
            for board in shared:
                msg += f"• `{board['id']}` - {board['title']}\n"
        
        msg += "\nUse `/tasks BOARD_ID` to see tasks"
        await update.message.reply_text(msg, parse_mode='Markdown')
        
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")


async def tasks(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = get_api(update.effective_user.id)
    if not api:
        await update.message.reply_text("Please link your account first with /settoken")
        return
    
    if not context.args:
        await update.message.reply_text("Usage: /tasks BOARD_ID")
        return
    
    try:
        board_id = int(context.args[0])
        board = await api.get_board(board_id)
        tasks_list = await api.get_tasks(board_id)
        
        if not tasks_list:
            await update.message.reply_text(f"No tasks in '{board['title']}'")
            return
        
        msg = f"📝 *Tasks in {board['title']}*\n\n"
        
        # Group by stage
        stages = {s['id']: s['name'] for s in board.get('stages', [])}
        for stage_id, stage_name in stages.items():
            stage_tasks = [t for t in tasks_list if t['stage_id'] == stage_id]
            if stage_tasks:
                msg += f"*{stage_name}:*\n"
                for task in stage_tasks:
                    due = f" 📅 {task['due_date']}" if task.get('due_date') else ""
                    msg += f"• {task['title']}{due}\n"
                msg += "\n"
        
        await update.message.reply_text(msg, parse_mode='Markdown')
        
    except ValueError:
        await update.message.reply_text("Invalid board ID. Use /boards to see your boards.")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")


async def add_task(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = get_api(update.effective_user.id)
    if not api:
        await update.message.reply_text("Please link your account first with /settoken")
        return
    
    if len(context.args) < 2:
        await update.message.reply_text("Usage: /add BOARD_ID Task title here")
        return
    
    try:
        board_id = int(context.args[0])
        title = ' '.join(context.args[1:])
        
        task = await api.create_task(board_id, title)
        await update.message.reply_text(f"✅ Task created: {task['title']}")
        
    except ValueError:
        await update.message.reply_text("Invalid board ID.")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")


async def lists(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = get_api(update.effective_user.id)
    if not api:
        await update.message.reply_text("Please link your account first with /settoken")
        return
    
    try:
        lists_data = await api.get_lists()
        
        if not lists_data:
            await update.message.reply_text("You don't have any lists yet.")
            return
        
        msg = "📝 *Your Lists*\n\n"
        for lst in lists_data:
            msg += f"• `{lst['id']}` - {lst['title']}\n"
        
        msg += "\nUse `/list LIST_ID` to view items"
        await update.message.reply_text(msg, parse_mode='Markdown')
        
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")


async def view_list(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = get_api(update.effective_user.id)
    if not api:
        await update.message.reply_text("Please link your account first with /settoken")
        return
    
    if not context.args:
        await update.message.reply_text("Usage: /list LIST_ID")
        return
    
    try:
        list_id = int(context.args[0])
        lst = await api.get_list(list_id)
        
        msg = f"📝 *{lst['title']}*\n\n"
        
        items = lst.get('items', [])
        if not items:
            msg += "_No items yet_"
        else:
            for item in items:
                check = "✅" if item['is_checked'] else "⬜"
                msg += f"{check} {item['content']}\n"
        
        await update.message.reply_text(msg, parse_mode='Markdown')
        
    except ValueError:
        await update.message.reply_text("Invalid list ID.")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")
