from flask import Blueprint, request, g
from app import db
from app.models.template import BoardTemplate, ListTemplate
from app.models.board import Board
from app.models.stage import Stage
from app.models.task import Task
from app.models.list import List
from app.models.list_item import ListItem
from app.utils.auth import login_required, require_board_access

bp = Blueprint('templates', __name__)


# ============ Board Templates ============

@bp.route('/boards', methods=['GET'])
@login_required
def list_board_templates():
    """List user's board templates"""
    templates = BoardTemplate.query.filter_by(owner_id=g.current_user.id).all()
    return {'data': [t.to_dict() for t in templates]}


@bp.route('/boards', methods=['POST'])
@login_required
def create_board_template():
    """Create a new board template"""
    data = request.get_json() or {}
    
    if not data.get('name'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Name is required'}}, 400
    
    template = BoardTemplate(
        owner_id=g.current_user.id,
        name=data['name'],
        description=data.get('description'),
        color_theme=data.get('color_theme', 'blue'),
        template_data=data.get('template_data', {'stages': [], 'tasks': []})
    )
    
    db.session.add(template)
    db.session.commit()
    
    return {'data': template.to_dict()}, 201


@bp.route('/boards/from-board/<int:board_id>', methods=['POST'])
@login_required
@require_board_access('view')
def create_template_from_board(board_id):
    """Create a template from an existing board"""
    data = request.get_json() or {}
    board = g.board
    
    # Build template data from board
    stages_data = []
    for stage in board.stages:
        stages_data.append({
            'name': stage.name,
            'position': stage.position,
            'color': stage.color
        })
    
    tasks_data = []
    for task in board.tasks:
        stage = Stage.query.get(task.stage_id)
        tasks_data.append({
            'title': task.title,
            'description': task.description,
            'color_theme': task.color_theme,
            'stage_position': stage.position if stage else 0,
            'custom_fields': task.custom_fields
        })
    
    template = BoardTemplate(
        owner_id=g.current_user.id,
        name=data.get('name', f"Template from {board.title}"),
        description=data.get('description', board.description),
        color_theme=board.color_theme,
        template_data={
            'stages': stages_data,
            'tasks': tasks_data
        }
    )
    
    db.session.add(template)
    db.session.commit()
    
    return {'data': template.to_dict()}, 201


@bp.route('/boards/<int:template_id>', methods=['GET'])
@login_required
def get_board_template(template_id):
    """Get board template details"""
    template = BoardTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    return {'data': template.to_dict()}


@bp.route('/boards/<int:template_id>', methods=['PUT'])
@login_required
def update_board_template(template_id):
    """Update board template"""
    template = BoardTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    data = request.get_json() or {}
    
    if 'name' in data:
        template.name = data['name']
    if 'description' in data:
        template.description = data['description']
    if 'color_theme' in data:
        template.color_theme = data['color_theme']
    if 'template_data' in data:
        template.template_data = data['template_data']
    
    db.session.commit()
    return {'data': template.to_dict()}


@bp.route('/boards/<int:template_id>', methods=['DELETE'])
@login_required
def delete_board_template(template_id):
    """Delete board template"""
    template = BoardTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    db.session.delete(template)
    db.session.commit()
    return {'data': {'message': 'Template deleted'}}


@bp.route('/boards/<int:template_id>/apply', methods=['POST'])
@login_required
def apply_board_template(template_id):
    """Create a new board from template"""
    template = BoardTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    data = request.get_json() or {}
    
    # Create board
    board = Board(
        owner_id=g.current_user.id,
        title=data.get('title', template.name),
        description=data.get('description', template.description),
        color_theme=template.color_theme
    )
    db.session.add(board)
    db.session.flush()
    
    # Create stages from template
    template_data = template.template_data or {}
    stages = template_data.get('stages', [])
    stage_map = {}  # position -> stage_id
    
    if stages:
        for stage_data in stages:
            stage = Stage(
                board_id=board.id,
                name=stage_data.get('name', 'New Stage'),
                position=stage_data.get('position', 0),
                color=stage_data.get('color', '#6B7280')
            )
            db.session.add(stage)
            db.session.flush()
            stage_map[stage.position] = stage.id
    else:
        # Create default stages if none in template
        board.create_default_stages()
        db.session.flush()
        for stage in board.stages:
            stage_map[stage.position] = stage.id
    
    # Create tasks from template
    tasks = template_data.get('tasks', [])
    for task_data in tasks:
        stage_pos = task_data.get('stage_position', 0)
        stage_id = stage_map.get(stage_pos, list(stage_map.values())[0] if stage_map else None)
        
        if stage_id:
            task = Task(
                board_id=board.id,
                stage_id=stage_id,
                title=task_data.get('title', 'New Task'),
                description=task_data.get('description'),
                color_theme=task_data.get('color_theme', 'blue'),
                custom_fields=task_data.get('custom_fields')
            )
            db.session.add(task)
    
    db.session.commit()
    return {'data': board.to_dict(include_stages=True)}, 201


# ============ List Templates ============

@bp.route('/lists', methods=['GET'])
@login_required
def list_list_templates():
    """List user's list templates"""
    templates = ListTemplate.query.filter_by(owner_id=g.current_user.id).all()
    return {'data': [t.to_dict() for t in templates]}


@bp.route('/lists', methods=['POST'])
@login_required
def create_list_template():
    """Create a new list template"""
    data = request.get_json() or {}
    
    if not data.get('name'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Name is required'}}, 400
    
    template = ListTemplate(
        owner_id=g.current_user.id,
        name=data['name'],
        description=data.get('description'),
        color_theme=data.get('color_theme', 'gray'),
        template_data=data.get('template_data', {'items': []})
    )
    
    db.session.add(template)
    db.session.commit()
    
    return {'data': template.to_dict()}, 201


@bp.route('/lists/from-list/<int:list_id>', methods=['POST'])
@login_required
def create_template_from_list(list_id):
    """Create a template from an existing list"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    data = request.get_json() or {}
    
    items_data = []
    for item in list_obj.items:
        items_data.append({
            'content': item.content,
            'position': item.position
        })
    
    template = ListTemplate(
        owner_id=g.current_user.id,
        name=data.get('name', f"Template from {list_obj.title}"),
        description=data.get('description'),
        color_theme=list_obj.color_theme,
        template_data={'items': items_data}
    )
    
    db.session.add(template)
    db.session.commit()
    
    return {'data': template.to_dict()}, 201


@bp.route('/lists/<int:template_id>', methods=['GET'])
@login_required
def get_list_template(template_id):
    """Get list template details"""
    template = ListTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    return {'data': template.to_dict()}


@bp.route('/lists/<int:template_id>', methods=['PUT'])
@login_required
def update_list_template(template_id):
    """Update list template"""
    template = ListTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    data = request.get_json() or {}
    
    if 'name' in data:
        template.name = data['name']
    if 'description' in data:
        template.description = data['description']
    if 'color_theme' in data:
        template.color_theme = data['color_theme']
    if 'template_data' in data:
        template.template_data = data['template_data']
    
    db.session.commit()
    return {'data': template.to_dict()}


@bp.route('/lists/<int:template_id>', methods=['DELETE'])
@login_required
def delete_list_template(template_id):
    """Delete list template"""
    template = ListTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    db.session.delete(template)
    db.session.commit()
    return {'data': {'message': 'Template deleted'}}


@bp.route('/lists/<int:template_id>/apply', methods=['POST'])
@login_required
def apply_list_template(template_id):
    """Create a new list from template"""
    template = ListTemplate.query.filter_by(
        id=template_id, owner_id=g.current_user.id
    ).first_or_404()
    data = request.get_json() or {}
    
    # Create list
    list_obj = List(
        owner_id=g.current_user.id,
        title=data.get('title', template.name),
        color_theme=template.color_theme
    )
    db.session.add(list_obj)
    db.session.flush()
    
    # Create items from template
    template_data = template.template_data or {}
    items = template_data.get('items', [])
    
    for item_data in items:
        item = ListItem(
            list_id=list_obj.id,
            content=item_data.get('content', ''),
            position=item_data.get('position', 0),
            is_checked=False
        )
        db.session.add(item)
    
    db.session.commit()
    return {'data': list_obj.to_dict(include_items=True)}, 201
