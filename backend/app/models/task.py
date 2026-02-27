import json
from datetime import datetime, date
from app import db


class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id'), nullable=False)
    stage_id = db.Column(db.Integer, db.ForeignKey('stages.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.Date)
    scheduled_start = db.Column(db.Date)
    color_theme = db.Column(db.String(50))
    custom_fields = db.Column(db.Text, default='{}')  # JSON storage
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_custom_fields(self):
        """Parse and return custom fields as dict"""
        if self.custom_fields:
            return json.loads(self.custom_fields)
        return {}
    
    def set_custom_fields(self, fields_dict):
        """Set custom fields from dict"""
        self.custom_fields = json.dumps(fields_dict)
    
    def get_dynamic_color(self):
        """Calculate color based on days until deadline"""
        if not self.due_date:
            return self.color_theme
        
        days_until = (self.due_date - date.today()).days
        
        if days_until < 0:
            return '#EF4444'  # Red - overdue
        elif days_until <= 1:
            return '#F97316'  # Orange - due soon
        elif days_until <= 3:
            return '#EAB308'  # Yellow - approaching
        else:
            return self.color_theme or '#3B82F6'  # Default blue or custom
    
    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'stage_id': self.stage_id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'scheduled_start': self.scheduled_start.isoformat() if self.scheduled_start else None,
            'color_theme': self.color_theme,
            'dynamic_color': self.get_dynamic_color(),
            'custom_fields': self.get_custom_fields(),
            'position': self.position,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
