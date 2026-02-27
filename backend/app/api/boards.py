from flask import Blueprint, request, g
from app import db
from app.models.board import Board
from app.models.board_share import BoardShare
from app.utils.auth import login_required, require_board_access

bp = Blueprint('boards', __name__)


@bp.route('', methods=['GET'])
@login_required
def list_boards():
    """List user's boards (owned + shared)"""
    user = g.current_user
    
    # Get owned boards
    owned = Board.query.filter_by(owner_id=user.id).all()
    
    # Get shared boards
    shared_ids = [s.board_id for s in user.shared_boards]
    shared = Board.query.filter(Board.id.in_(shared_ids)).all() if shared_ids else []
    
    return {
        'data': {
            'owned': [b.to_dict() for b in owned],
            'shared': [b.to_dict() for b in shared]
        }
    }


@bp.route('', methods=['POST'])
@login_required
def create_board():
    """Create a new board"""
    data = request.get_json() or {}
    
    if not data.get('title'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Title is required'}}, 400
    
    board = Board(
        owner_id=g.current_user.id,
        title=data['title'],
        description=data.get('description'),
        color_theme=data.get('color_theme', 'blue')
    )
    
    db.session.add(board)
    db.session.flush()  # Get the board ID
    
    # Create default stages
    board.create_default_stages()
    db.session.commit()
    
    return {'data': board.to_dict(include_stages=True)}, 201


@bp.route('/<int:board_id>', methods=['GET'])
@login_required
@require_board_access('view')
def get_board(board_id):
    """Get board details"""
    return {'data': g.board.to_dict(include_stages=True)}


@bp.route('/<int:board_id>', methods=['PUT'])
@login_required
@require_board_access('edit')
def update_board(board_id):
    """Update board"""
    data = request.get_json() or {}
    
    if 'title' in data:
        g.board.title = data['title']
    if 'description' in data:
        g.board.description = data['description']
    if 'color_theme' in data:
        g.board.color_theme = data['color_theme']
    
    db.session.commit()
    return {'data': g.board.to_dict()}


@bp.route('/<int:board_id>', methods=['DELETE'])
@login_required
@require_board_access('edit')
def delete_board(board_id):
    """Delete board (owner only)"""
    if g.board_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only owner can delete board'}}, 403
    
    db.session.delete(g.board)
    db.session.commit()
    return {'data': {'message': 'Board deleted'}}
