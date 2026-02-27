from flask import Blueprint, request, g
from app import db
from app.models.project import Project, ProjectShare
from app.models.user import User
from app.utils.auth import login_required, require_project_access

bp = Blueprint('projects', __name__)


@bp.route('', methods=['GET'])
@login_required
def list_projects():
    """List user's projects (owned + shared)"""
    user = g.current_user
    
    # Get owned projects
    owned = Project.query.filter_by(owner_id=user.id).all()
    
    # Get shared projects
    shared_ids = [s.project_id for s in user.shared_projects]
    shared = Project.query.filter(Project.id.in_(shared_ids)).all() if shared_ids else []
    
    return {
        'data': {
            'owned': [p.to_dict() for p in owned],
            'shared': [p.to_dict() for p in shared]
        }
    }


@bp.route('', methods=['POST'])
@login_required
def create_project():
    """Create a new project"""
    data = request.get_json() or {}
    
    if not data.get('name'):
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Name is required'}}, 400
    
    project = Project(
        owner_id=g.current_user.id,
        name=data['name'],
        description=data.get('description'),
        color_theme=data.get('color_theme', 'blue')
    )
    
    db.session.add(project)
    db.session.commit()
    
    return {'data': project.to_dict()}, 201


@bp.route('/<int:project_id>', methods=['GET'])
@login_required
@require_project_access()
def get_project(project_id):
    """Get project with all boards and lists"""
    return {'data': g.project.to_dict(include_contents=True)}


@bp.route('/<int:project_id>', methods=['PUT'])
@login_required
@require_project_access()
def update_project(project_id):
    """Update project"""
    data = request.get_json() or {}
    
    if 'name' in data:
        g.project.name = data['name']
    if 'description' in data:
        g.project.description = data['description']
    if 'color_theme' in data:
        g.project.color_theme = data['color_theme']
    
    db.session.commit()
    return {'data': g.project.to_dict()}


@bp.route('/<int:project_id>', methods=['DELETE'])
@login_required
@require_project_access()
def delete_project(project_id):
    """Delete project (owner only)"""
    if g.project_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only owner can delete project'}}, 403
    
    db.session.delete(g.project)
    db.session.commit()
    return {'data': {'message': 'Project deleted'}}


@bp.route('/<int:project_id>/members', methods=['GET'])
@login_required
@require_project_access()
def list_members(project_id):
    """List all members of a project (owner + shared users)"""
    owner = User.query.get(g.project.owner_id)
    members = [owner.to_dict()] if owner else []
    
    shares = g.project.shares.all()
    for share in shares:
        if share.user:
            members.append(share.user.to_dict())
    
    return {'data': members}


# ============ Project Sharing ============

@bp.route('/<int:project_id>/shares', methods=['GET'])
@login_required
@require_project_access()
def list_shares(project_id):
    """List users project is shared with"""
    shares = g.project.shares.all()
    return {'data': [s.to_dict() for s in shares]}


@bp.route('/<int:project_id>/shares', methods=['POST'])
@login_required
@require_project_access()
def create_share(project_id):
    """Share project with user (by email)"""
    if g.project_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only owner can share project'}}, 403
    
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
    existing = ProjectShare.query.filter_by(project_id=project_id, user_id=user.id).first()
    if existing:
        return {'error': {'code': 'VALIDATION_ERROR', 'message': 'Already shared with this user'}}, 400
    
    share = ProjectShare(
        project_id=project_id,
        user_id=user.id
    )
    
    db.session.add(share)
    db.session.commit()
    
    return {'data': share.to_dict()}, 201


@bp.route('/<int:project_id>/shares/<int:user_id>', methods=['DELETE'])
@login_required
@require_project_access()
def delete_share(project_id, user_id):
    """Remove user's access"""
    if g.project_access != 'owner':
        return {'error': {'code': 'FORBIDDEN', 'message': 'Only owner can manage shares'}}, 403
    
    share = ProjectShare.query.filter_by(project_id=project_id, user_id=user_id).first_or_404()
    db.session.delete(share)
    db.session.commit()
    
    return {'data': {'message': 'Share removed'}}
