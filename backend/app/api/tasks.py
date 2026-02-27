import json
from datetime import datetime
from flask import Blueprint, request, g
from app import db
from app.models.task import Task
from app.models.stage import Stage
from app.utils.auth import login_required, require_board_access

bp = Blueprint('tasks', __name__)


@bp.route('/<int:board_id>/tasks', methods=['GET'])
@login_required
@require_board_access('view')
def list_tasks(board_id):
    """List tasks (optional: ?stage_id=)"""
    query = Task.query.filter_by(board_id=board_id)
    
    stage_id = request.args.get('stage_id', type=int)
    if stage_id:
        query = query.filter_by(stage_id=stage_id)
    
    tasks = query.order_by(Task.position).all()
    return {'data': [t.to_dict() for t in tasks]}


@bp.route('/<int:board_id>/tasks', methods=['POST'])
@login_required
@require_board_access('edit')
def create_task(board_id):
    """Create a new task"""
    data = request.get_json() or {}
    
    if not data.get('title'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Title is required'}}, 400
    
    # Get stage - use first stage if not specified
    stage_id = data.get('stage_id')
    if not stage_id:
        first_stage = Stage.query.filter_by(board_id=board_id).order_by(Stage.position).first()
        if not first_stage:
            return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Board has no stages'}}, 400
        stage_id = first_stage.id
    
    # Get max position in stage
    max_pos = db.session.query(db.func.max(Task.position)).filter_by(stage_id=stage_id).scalar() or -1
    
    task = Task(
        board_id=board_id,
        stage_id=stage_id,
        title=data['title'],
        description=data.get('description'),
        color_theme=data.get('color_theme'),
        position=max_pos + 1
    )
    
    # Parse dates
    if data.get('due_date'):
        task.due_date = datetime.fromisoformat(data['due_date']).date()
    if data.get('scheduled_start'):
        task.scheduled_start = datetime.fromisoformat(data['scheduled_start']).date()
    
    # Set custom fields
    if data.get('custom_fields'):
        task.set_custom_fields(data['custom_fields'])
    
    db.session.add(task)
    db.session.commit()
    
    return {'data': task.to_dict()}, 201


@bp.route('/<int:board_id>/tasks/<int:task_id>', methods=['GET'])
@login_required
@require_board_access('view')
def get_task(board_id, task_id):
    """Get task details"""
    task = Task.query.filter_by(id=task_id, board_id=board_id).first_or_404()
    return {'data': task.to_dict()}


@bp.route('/<int:board_id>/tasks/<int:task_id>', methods=['PUT'])
@login_required
@require_board_access('edit')
def update_task(board_id, task_id):
    """Update task"""
    task = Task.query.filter_by(id=task_id, board_id=board_id).first_or_404()
    data = request.get_json() or {}
    
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'color_theme' in data:
        task.color_theme = data['color_theme']
    if 'due_date' in data:
        task.due_date = datetime.fromisoformat(data['due_date']).date() if data['due_date'] else None
    if 'scheduled_start' in data:
        task.scheduled_start = datetime.fromisoformat(data['scheduled_start']).date() if data['scheduled_start'] else None
    if 'custom_fields' in data:
        task.set_custom_fields(data['custom_fields'])
    
    db.session.commit()
    return {'data': task.to_dict()}


@bp.route('/<int:board_id>/tasks/<int:task_id>', methods=['DELETE'])
@login_required
@require_board_access('edit')
def delete_task(board_id, task_id):
    """Delete task"""
    task = Task.query.filter_by(id=task_id, board_id=board_id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return {'data': {'message': 'Task deleted'}}


@bp.route('/<int:board_id>/tasks/<int:task_id>/move', methods=['PUT'])
@login_required
@require_board_access('edit')
def move_task(board_id, task_id):
    """Move task to different stage"""
    task = Task.query.filter_by(id=task_id, board_id=board_id).first_or_404()
    data = request.get_json() or {}
    
    new_stage_id = data.get('stage_id')
    if not new_stage_id:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'stage_id is required'}}, 400
    
    # Verify stage belongs to same board
    new_stage = Stage.query.filter_by(id=new_stage_id, board_id=board_id).first()
    if not new_stage:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Invalid stage'}}, 400
    
    # Get max position in new stage
    max_pos = db.session.query(db.func.max(Task.position)).filter_by(stage_id=new_stage_id).scalar() or -1
    
    task.stage_id = new_stage_id
    task.position = data.get('position', max_pos + 1)
    
    db.session.commit()
    return {'data': task.to_dict()}
