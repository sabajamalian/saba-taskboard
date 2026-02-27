from flask import Blueprint, request, g
from app import db
from app.models.board import Board
from app.models.stage import Stage
from app.utils.auth import login_required, require_project_access, require_board_access

bp = Blueprint('boards', __name__)


@bp.route('', methods=['GET'])
@login_required
@require_project_access()
def list_boards(project_id):
    """List boards in a project"""
    boards = g.project.boards.all()
    return {'data': [b.to_dict() for b in boards]}


@bp.route('', methods=['POST'])
@login_required
@require_project_access()
def create_board(project_id):
    """Create a new board in project"""
    data = request.get_json() or {}
    
    if not data.get('title'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Title is required'}}, 400
    
    board = Board(
        project_id=project_id,
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
@require_board_access()
def get_board(project_id, board_id):
    """Get board details"""
    return {'data': g.board.to_dict(include_stages=True)}


@bp.route('/<int:board_id>', methods=['PUT'])
@login_required
@require_board_access()
def update_board(project_id, board_id):
    """Update board"""
    data = request.get_json() or {}
    
    if 'title' in data:
        g.board.title = data['title']
    if 'description' in data:
        g.board.description = data['description']
    if 'color_theme' in data:
        g.board.color_theme = data['color_theme']
    
    # Handle stages update
    if 'stages' in data:
        incoming_stages = data['stages']
        existing_stage_ids = {s.id for s in g.board.stages}
        incoming_ids = set()
        
        for stage_data in incoming_stages:
            stage_id = stage_data.get('id')
            
            # New stage (id is None or starts with 'new-')
            if stage_id is None or (isinstance(stage_id, str) and stage_id.startswith('new-')):
                stage = Stage(
                    board_id=board_id,
                    name=stage_data.get('name', 'New Stage'),
                    position=stage_data.get('position', 0),
                    color=stage_data.get('color', '#6B7280')
                )
                db.session.add(stage)
            else:
                # Existing stage - update it
                incoming_ids.add(stage_id)
                stage = Stage.query.filter_by(id=stage_id, board_id=board_id).first()
                if stage:
                    stage.name = stage_data.get('name', stage.name)
                    stage.position = stage_data.get('position', stage.position)
                    stage.color = stage_data.get('color', stage.color)
        
        # Delete stages that were removed (but not if they have tasks)
        for stage_id in existing_stage_ids - incoming_ids:
            stage = Stage.query.get(stage_id)
            if stage and stage.tasks.count() == 0:
                db.session.delete(stage)
    
    db.session.commit()
    return {'data': g.board.to_dict(include_stages=True)}


@bp.route('/<int:board_id>', methods=['DELETE'])
@login_required
@require_board_access()
def delete_board(project_id, board_id):
    """Delete board (project owner only)"""
    if g.project_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only project owner can delete board'}}, 403
    
    db.session.delete(g.board)
    db.session.commit()
    return {'data': {'message': 'Board deleted'}}
