from datetime import datetime
from app import db


class ListItem(db.Model):
    __tablename__ = 'list_items'
    
    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('lists.id'), nullable=False)
    content = db.Column(db.String(500), nullable=False)
    is_checked = db.Column(db.Boolean, default=False)
    position = db.Column(db.Integer, default=0)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    assignee = db.relationship('User', foreign_keys=[assigned_to], lazy='joined')
    
    def to_dict(self):
        return {
            'id': self.id,
            'list_id': self.list_id,
            'content': self.content,
            'is_checked': self.is_checked,
            'position': self.position,
            'assigned_to': self.assigned_to,
            'assignee': self.assignee.to_dict() if self.assignee else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
