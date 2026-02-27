from app.api.auth import bp as auth_bp, init_oauth
from app.api.projects import bp as projects_bp
from app.api.boards import bp as boards_bp
from app.api.stages import bp as stages_bp
from app.api.tasks import bp as tasks_bp
from app.api.lists import bp as lists_bp
from app.api.templates import bp as templates_bp

__all__ = [
    'auth_bp', 'init_oauth',
    'projects_bp', 'boards_bp', 'stages_bp', 'tasks_bp',
    'lists_bp', 'templates_bp'
]
