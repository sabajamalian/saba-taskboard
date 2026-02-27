from flask import Blueprint, request, g
from app import db
from app.models.user import User
from app.models.board_share import BoardShare
from app.utils.auth import login_required, require_board_access

bp = Blueprint('sharing', __name__)


@bp.route('/<int:board_id>/shares', methods=['GET'])
@login_required
@require_board_access('view')
def list_shares(board_id):
    """List users board is shared with"""
    shares = g.board.shares.all()
    return {'data': [s.to_dict() for s in shares]}


@bp.route('/<int:board_id>/shares', methods=['POST'])
@login_required
@require_board_access('edit')
def create_share(board_id):
    """Share board with user (by email)"""
    if g.board_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only owner can share board'}}, 403
    
    data = request.get_json() or {}
    
    email = data.get('email')
    if not email:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Email is required'}}, 400
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    if not user:
        return {'error': {'code': 'NOT_FOUND', 'message': 'User not found'}}, 404
    
    if user.id == g.current_user.id:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Cannot share with yourself'}}, 400
    
    # Check if already shared
    existing = BoardShare.query.filter_by(board_id=board_id, user_id=user.id).first()
    if existing:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Already shared with this user'}}, 400
    
    share = BoardShare(
        board_id=board_id,
        user_id=user.id,
        permission=data.get('permission', 'view')
    )
    
    db.session.add(share)
    db.session.commit()
    
    return {'data': share.to_dict()}, 201


@bp.route('/<int:board_id>/shares/<int:user_id>', methods=['DELETE'])
@login_required
@require_board_access('edit')
def delete_share(board_id, user_id):
    """Remove user's access"""
    if g.board_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only owner can manage shares'}}, 403
    
    share = BoardShare.query.filter_by(board_id=board_id, user_id=user_id).first_or_404()
    db.session.delete(share)
    db.session.commit()
    
    return {'data': {'message': 'Share removed'}}
