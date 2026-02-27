from flask import Blueprint, request, g
from app import db
from app.models.list import List
from app.models.list_item import ListItem
from app.utils.auth import login_required

bp = Blueprint('lists', __name__)


@bp.route('', methods=['GET'])
@login_required
def list_lists():
    """List user's standalone lists"""
    lists = List.query.filter_by(owner_id=g.current_user.id).all()
    return {'data': [l.to_dict() for l in lists]}


@bp.route('', methods=['POST'])
@login_required
def create_list():
    """Create a new list"""
    data = request.get_json() or {}
    
    if not data.get('title'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Title is required'}}, 400
    
    list_obj = List(
        owner_id=g.current_user.id,
        title=data['title'],
        color_theme=data.get('color_theme', 'gray')
    )
    
    db.session.add(list_obj)
    db.session.commit()
    
    return {'data': list_obj.to_dict()}, 201


@bp.route('/<int:list_id>', methods=['GET'])
@login_required
def get_list(list_id):
    """Get list with items"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    return {'data': list_obj.to_dict(include_items=True)}


@bp.route('/<int:list_id>', methods=['PUT'])
@login_required
def update_list(list_id):
    """Update list"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    data = request.get_json() or {}
    
    if 'title' in data:
        list_obj.title = data['title']
    if 'color_theme' in data:
        list_obj.color_theme = data['color_theme']
    
    db.session.commit()
    return {'data': list_obj.to_dict()}


@bp.route('/<int:list_id>', methods=['DELETE'])
@login_required
def delete_list(list_id):
    """Delete list"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    db.session.delete(list_obj)
    db.session.commit()
    return {'data': {'message': 'List deleted'}}


# List Items

@bp.route('/<int:list_id>/items', methods=['GET'])
@login_required
def list_items(list_id):
    """List items in list"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    items = list_obj.items.order_by(ListItem.position).all()
    return {'data': [i.to_dict() for i in items]}


@bp.route('/<int:list_id>/items', methods=['POST'])
@login_required
def create_item(list_id):
    """Add item to list"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    data = request.get_json() or {}
    
    if not data.get('content'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Content is required'}}, 400
    
    max_pos = db.session.query(db.func.max(ListItem.position)).filter_by(list_id=list_id).scalar() or -1
    
    item = ListItem(
        list_id=list_id,
        content=data['content'],
        position=max_pos + 1
    )
    
    db.session.add(item)
    db.session.commit()
    
    return {'data': item.to_dict()}, 201


@bp.route('/<int:list_id>/items/<int:item_id>', methods=['PUT'])
@login_required
def update_item(list_id, item_id):
    """Update item"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    item = ListItem.query.filter_by(id=item_id, list_id=list_id).first_or_404()
    data = request.get_json() or {}
    
    if 'content' in data:
        item.content = data['content']
    if 'is_checked' in data:
        item.is_checked = data['is_checked']
    
    db.session.commit()
    return {'data': item.to_dict()}


@bp.route('/<int:list_id>/items/<int:item_id>', methods=['DELETE'])
@login_required
def delete_item(list_id, item_id):
    """Delete item"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    item = ListItem.query.filter_by(id=item_id, list_id=list_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return {'data': {'message': 'Item deleted'}}


@bp.route('/<int:list_id>/items/<int:item_id>/toggle', methods=['PUT'])
@login_required
def toggle_item(list_id, item_id):
    """Toggle checkbox"""
    list_obj = List.query.filter_by(id=list_id, owner_id=g.current_user.id).first_or_404()
    item = ListItem.query.filter_by(id=item_id, list_id=list_id).first_or_404()
    
    item.is_checked = not item.is_checked
    db.session.commit()
    
    return {'data': item.to_dict()}
