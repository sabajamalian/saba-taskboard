from flask import Blueprint, request, g
from app import db
from app.models.list import List
from app.models.list_item import ListItem
from app.utils.auth import login_required, require_project_access, require_list_access

bp = Blueprint('lists', __name__)


@bp.route('', methods=['GET'])
@login_required
@require_project_access()
def list_lists(project_id):
    """List lists in a project"""
    lists = g.project.lists.all()
    return {'data': [l.to_dict() for l in lists]}


@bp.route('', methods=['POST'])
@login_required
@require_project_access()
def create_list(project_id):
    """Create a new list in project"""
    data = request.get_json() or {}
    
    if not data.get('title'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Title is required'}}, 400
    
    list_obj = List(
        project_id=project_id,
        title=data['title'],
        color_theme=data.get('color_theme', 'gray')
    )
    
    db.session.add(list_obj)
    db.session.commit()
    
    return {'data': list_obj.to_dict()}, 201


@bp.route('/<int:list_id>', methods=['GET'])
@login_required
@require_list_access()
def get_list(project_id, list_id):
    """Get list with items"""
    return {'data': g.list.to_dict(include_items=True)}


@bp.route('/<int:list_id>', methods=['PUT'])
@login_required
@require_list_access()
def update_list(project_id, list_id):
    """Update list"""
    data = request.get_json() or {}
    
    if 'title' in data:
        g.list.title = data['title']
    if 'color_theme' in data:
        g.list.color_theme = data['color_theme']
    
    db.session.commit()
    return {'data': g.list.to_dict()}


@bp.route('/<int:list_id>', methods=['DELETE'])
@login_required
@require_list_access()
def delete_list(project_id, list_id):
    """Delete list (project owner only)"""
    if g.project_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only project owner can delete list'}}, 403
    
    db.session.delete(g.list)
    db.session.commit()
    return {'data': {'message': 'List deleted'}}


# List Items

@bp.route('/<int:list_id>/items', methods=['GET'])
@login_required
@require_list_access()
def list_items(project_id, list_id):
    """List items in list"""
    items = g.list.items.order_by(ListItem.position).all()
    return {'data': [i.to_dict() for i in items]}


@bp.route('/<int:list_id>/items', methods=['POST'])
@login_required
@require_list_access()
def create_item(project_id, list_id):
    """Add item to list"""
    data = request.get_json() or {}
    
    if not data.get('content'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Content is required'}}, 400
    
    max_pos = db.session.query(db.func.max(ListItem.position)).filter_by(list_id=list_id).scalar() or -1
    
    item = ListItem(
        list_id=list_id,
        content=data['content'],
        assigned_to=data.get('assigned_to'),
        position=max_pos + 1
    )
    
    db.session.add(item)
    db.session.commit()
    
    return {'data': item.to_dict()}, 201


@bp.route('/<int:list_id>/items/<int:item_id>', methods=['PUT'])
@login_required
@require_list_access()
def update_item(project_id, list_id, item_id):
    """Update item"""
    item = ListItem.query.filter_by(id=item_id, list_id=list_id).first_or_404()
    data = request.get_json() or {}
    
    if 'content' in data:
        item.content = data['content']
    if 'is_checked' in data:
        item.is_checked = data['is_checked']
    if 'assigned_to' in data:
        item.assigned_to = data['assigned_to'] if data['assigned_to'] else None
    
    db.session.commit()
    return {'data': item.to_dict()}


@bp.route('/<int:list_id>/items/<int:item_id>', methods=['DELETE'])
@login_required
@require_list_access()
def delete_item(project_id, list_id, item_id):
    """Delete item"""
    item = ListItem.query.filter_by(id=item_id, list_id=list_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return {'data': {'message': 'Item deleted'}}


@bp.route('/<int:list_id>/items/<int:item_id>/toggle', methods=['PUT'])
@login_required
@require_list_access()
def toggle_item(project_id, list_id, item_id):
    """Toggle checkbox"""
    item = ListItem.query.filter_by(id=item_id, list_id=list_id).first_or_404()
    
    item.is_checked = not item.is_checked
    db.session.commit()
    
    return {'data': item.to_dict()}
