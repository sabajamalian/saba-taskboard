from datetime import datetime
from app import db


class Stage(db.Model):
    __tablename__ = 'stages'
    
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, default=0)
    color = db.Column(db.String(20), default='#6B7280')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    tasks = db.relationship('Task', backref='stage', lazy='dynamic')
    
    def to_dict(self, include_tasks=False):
        data = {
            'id': self.id,
            'board_id': self.board_id,
            'name': self.name,
            'position': self.position,
            'color': self.color,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_tasks:
            data['tasks'] = [task.to_dict() for task in self.tasks.order_by('position')]
        return data
