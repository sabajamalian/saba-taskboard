from flask import Blueprint, request, g
from app import db
from app.models.stage import Stage
from app.utils.auth import login_required, require_board_access

bp = Blueprint('stages', __name__)


@bp.route('/<int:board_id>/stages', methods=['GET'])
@login_required
@require_board_access('view')
def list_stages(board_id):
    """List stages in board"""
    stages = g.board.stages.order_by(Stage.position).all()
    return {'data': [s.to_dict() for s in stages]}


@bp.route('/<int:board_id>/stages', methods=['POST'])
@login_required
@require_board_access('edit')
def create_stage(board_id):
    """Create a new stage"""
    data = request.get_json() or {}
    
    if not data.get('name'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Name is required'}}, 400
    
    # Get max position
    max_pos = db.session.query(db.func.max(Stage.position)).filter_by(board_id=board_id).scalar() or -1
    
    stage = Stage(
        board_id=board_id,
        name=data['name'],
        position=max_pos + 1,
        color=data.get('color', '#6B7280')
    )
    
    db.session.add(stage)
    db.session.commit()
    
    return {'data': stage.to_dict()}, 201


@bp.route('/<int:board_id>/stages/<int:stage_id>', methods=['PUT'])
@login_required
@require_board_access('edit')
def update_stage(board_id, stage_id):
    """Update stage"""
    stage = Stage.query.filter_by(id=stage_id, board_id=board_id).first_or_404()
    data = request.get_json() or {}
    
    if 'name' in data:
        stage.name = data['name']
    if 'color' in data:
        stage.color = data['color']
    
    db.session.commit()
    return {'data': stage.to_dict()}


@bp.route('/<int:board_id>/stages/<int:stage_id>', methods=['DELETE'])
@login_required
@require_board_access('edit')
def delete_stage(board_id, stage_id):
    """Delete stage"""
    stage = Stage.query.filter_by(id=stage_id, board_id=board_id).first_or_404()
    
    # Check if stage has tasks
    if stage.tasks.count() > 0:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Cannot delete stage with tasks'}}, 400
    
    db.session.delete(stage)
    db.session.commit()
    return {'data': {'message': 'Stage deleted'}}


@bp.route('/<int:board_id>/stages/<int:stage_id>/reorder', methods=['PUT'])
@login_required
@require_board_access('edit')
def reorder_stage(board_id, stage_id):
    """Change stage position"""
    stage = Stage.query.filter_by(id=stage_id, board_id=board_id).first_or_404()
    data = request.get_json() or {}
    
    new_position = data.get('position')
    if new_position is None:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Position is required'}}, 400
    
    old_position = stage.position
    
    if new_position > old_position:
        # Moving down
        Stage.query.filter(
            Stage.board_id == board_id,
            Stage.position > old_position,
            Stage.position <= new_position
        ).update({Stage.position: Stage.position - 1})
    else:
        # Moving up
        Stage.query.filter(
            Stage.board_id == board_id,
            Stage.position >= new_position,
            Stage.position < old_position
        ).update({Stage.position: Stage.position + 1})
    
    stage.position = new_position
    db.session.commit()
    
    return {'data': stage.to_dict()}
