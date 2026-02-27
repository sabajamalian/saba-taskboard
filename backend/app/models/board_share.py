from datetime import datetime
from app import db


class BoardShare(db.Model):
    __tablename__ = 'board_shares'
    
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('boards.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    permission = db.Column(db.String(20), default='view')  # view, edit
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('board_id', 'user_id', name='unique_board_user_share'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'permission': self.permission,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
