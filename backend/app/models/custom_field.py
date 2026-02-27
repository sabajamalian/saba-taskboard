import json
from datetime import datetime
from app import db


class CustomFieldDefinition(db.Model):
    __tablename__ = 'custom_field_definitions'
    
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id'), nullable=False)
    field_name = db.Column(db.String(100), nullable=False)
    field_type = db.Column(db.String(50), nullable=False)  # text, number, date, select
    options = db.Column(db.Text)  # JSON for select options
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_options(self):
        """Parse and return options as list"""
        if self.options:
            return json.loads(self.options)
        return []
    
    def set_options(self, options_list):
        """Set options from list"""
        self.options = json.dumps(options_list)
    
    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'field_name': self.field_name,
            'field_type': self.field_type,
            'options': self.get_options(),
            'position': self.position,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
