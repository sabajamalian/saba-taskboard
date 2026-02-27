from functools import wraps
import jwt
from flask import session, request, g, current_app
from app.models.user import User


def get_current_user():
    """Get current user from session or JWT"""
    # Check session first
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    
    # Check JWT header
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        try:
            payload = jwt.decode(
                token,
                current_app.config.get('JWT_SECRET_KEY', 'jwt-dev-secret'),
                algorithms=['HS256']
            )
            # sub can be string or int depending on how token was created
            user_id = payload.get('sub')
            if isinstance(user_id, str):
                user_id = int(user_id)
            return User.query.get(user_id)
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    return None


def login_required(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return {'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}}, 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def get_project_access(project, user):
    """Check if user has access to project"""
    if project.owner_id == user.id:
        return 'owner'
    
    share = project.shares.filter_by(user_id=user.id).first()
    if share:
        return 'shared'
    
    return None


def require_project_access():
    """Decorator to require project access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from app.models.project import Project
            project_id = kwargs.get('project_id')
            project = Project.query.get_or_404(project_id)
            
            access = get_project_access(project, g.current_user)
            if not access:
                return {'error': {'code': 'FORBIDDEN', 'message': 'Access denied'}}, 403
            
            g.project = project
            g.project_access = access
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_board_access():
    """Decorator to require board access (via project)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from app.models.board import Board
            board_id = kwargs.get('board_id')
            board = Board.query.get_or_404(board_id)
            
            # Access is determined by project membership
            access = get_project_access(board.project, g.current_user)
            if not access:
                return {'error': {'code': 'FORBIDDEN', 'message': 'Access denied'}}, 403
            
            g.board = board
            g.project = board.project
            g.project_access = access
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_list_access():
    """Decorator to require list access (via project)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from app.models.list import List
            list_id = kwargs.get('list_id')
            list_obj = List.query.get_or_404(list_id)
            
            # Access is determined by project membership
            access = get_project_access(list_obj.project, g.current_user)
            if not access:
                return {'error': {'code': 'FORBIDDEN', 'message': 'Access denied'}}, 403
            
            g.list = list_obj
            g.project = list_obj.project
            g.project_access = access
            return f(*args, **kwargs)
        return decorated_function
    return decorator
