from functools import wraps
import os
import jwt
from flask import session, request, g
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
                os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret'),
                algorithms=['HS256']
            )
            return User.query.get(payload.get('sub'))
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


def get_board_access(board, user):
    """Check if user has access to board and what level"""
    if board.owner_id == user.id:
        return 'owner'
    
    share = board.shares.filter_by(user_id=user.id).first()
    if share:
        return share.permission  # 'view' or 'edit'
    
    return None


def require_board_access(permission='view'):
    """Decorator to require board access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from app.models.board import Board
            board_id = kwargs.get('board_id')
            board = Board.query.get_or_404(board_id)
            
            access = get_board_access(board, g.current_user)
            if not access:
                return {'error': {'code': 'FORBIDDEN', 'message': 'Access denied'}}, 403
            
            if permission == 'edit' and access == 'view':
                return {'error': {'code': 'FORBIDDEN', 'message': 'Edit access required'}}, 403
            
            g.board = board
            g.board_access = access
            return f(*args, **kwargs)
        return decorated_function
    return decorator
