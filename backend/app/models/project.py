from datetime import datetime
from app import db


class Project(db.Model):
    """Projects are the top-level containers that own boards and lists"""
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    color_theme = db.Column(db.String(50), default='blue')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    boards = db.relationship('Board', backref='project', lazy='dynamic',
                            cascade='all, delete-orphan')
    lists = db.relationship('List', backref='project', lazy='dynamic',
                           cascade='all, delete-orphan')
    shares = db.relationship('ProjectShare', backref='project', lazy='dynamic',
                            cascade='all, delete-orphan')
    
    def to_dict(self, include_contents=False):
        data = {
            'id': self.id,
            'owner_id': self.owner_id,
            'name': self.name,
            'description': self.description,
            'color_theme': self.color_theme,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'board_count': self.boards.count(),
            'list_count': self.lists.count()
        }
        if include_contents:
            data['boards'] = [b.to_dict() for b in self.boards]
            data['lists'] = [l.to_dict() for l in self.lists]
        return data


class ProjectShare(db.Model):
    """Sharing a project shares all its boards and lists"""
    __tablename__ = 'project_shares'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('project_id', 'user_id', name='unique_project_user_share'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
