from datetime import datetime
from app import db


class List(db.Model):
    __tablename__ = 'lists'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    color_theme = db.Column(db.String(50), default='gray')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    items = db.relationship('ListItem', backref='list', lazy='dynamic',
                           cascade='all, delete-orphan', order_by='ListItem.position')
    
    def to_dict(self, include_items=False):
        data = {
            'id': self.id,
            'owner_id': self.owner_id,
            'title': self.title,
            'color_theme': self.color_theme,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_items:
            data['items'] = [item.to_dict() for item in self.items]
        return data
