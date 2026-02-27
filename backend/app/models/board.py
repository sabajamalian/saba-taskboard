from datetime import datetime
from app import db


class Board(db.Model):
    __tablename__ = 'boards'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    color_theme = db.Column(db.String(50), default='blue')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    stages = db.relationship('Stage', backref='board', lazy='dynamic',
                            cascade='all, delete-orphan', order_by='Stage.position')
    tasks = db.relationship('Task', backref='board', lazy='dynamic',
                           cascade='all, delete-orphan')
    custom_fields = db.relationship('CustomFieldDefinition', backref='board',
                                   lazy='dynamic', cascade='all, delete-orphan')
    shares = db.relationship('BoardShare', backref='board', lazy='dynamic',
                            cascade='all, delete-orphan')
    
    def to_dict(self, include_stages=False):
        data = {
            'id': self.id,
            'owner_id': self.owner_id,
            'title': self.title,
            'description': self.description,
            'color_theme': self.color_theme,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_stages:
            data['stages'] = [stage.to_dict() for stage in self.stages]
        return data
    
    def create_default_stages(self):
        """Create default stages: To Do, In Progress, Done"""
        from app.models.stage import Stage
        default_stages = [
            {'name': 'To Do', 'position': 0, 'color': '#6B7280'},
            {'name': 'In Progress', 'position': 1, 'color': '#3B82F6'},
            {'name': 'Done', 'position': 2, 'color': '#10B981'}
        ]
        for stage_data in default_stages:
            stage = Stage(board_id=self.id, **stage_data)
            db.session.add(stage)
