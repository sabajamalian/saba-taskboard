import os
from datetime import datetime, timedelta
import jwt
from flask import Blueprint, redirect, url_for, session, request, jsonify, current_app
from authlib.integrations.flask_client import OAuth
from app import db
from app.models.user import User
from app.utils.auth import login_required, get_current_user

bp = Blueprint('auth', __name__)

# OAuth setup
oauth = OAuth()


def init_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name='google',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )


@bp.route('/login')
def login():
    """Redirect to Google OAuth"""
    redirect_uri = request.url_root.rstrip('/') + '/api/v1/auth/callback'
    return oauth.google.authorize_redirect(redirect_uri)


@bp.route('/dev-login')
def dev_login():
    """Development-only login bypass - creates a test user"""
    if not current_app.debug:
        return jsonify({'error': {'code': 'FORBIDDEN', 'message': 'Dev login only available in debug mode'}}), 403
    
    # Create or get dev user
    user = User.query.filter_by(email='dev@taskboard.local').first()
    if not user:
        user = User(
            google_id='dev-user-local',
            email='dev@taskboard.local',
            name='Dev User',
            avatar_url=None
        )
        db.session.add(user)
        db.session.commit()
    
    session['user_id'] = user.id
    return redirect('/#/boards')


@bp.route('/callback')
def callback():
    """Handle OAuth callback"""
    token = oauth.google.authorize_access_token()
    user_info = token.get('userinfo')
    
    if not user_info:
        return {'error': {'code': 'AUTH_FAILED', 'message': 'Failed to get user info'}}, 400
    
    user = User.query.filter_by(google_id=user_info['sub']).first()
    
    if not user:
        user = User(
            google_id=user_info['sub'],
            email=user_info['email'],
            name=user_info.get('name', user_info['email']),
            avatar_url=user_info.get('picture')
        )
        db.session.add(user)
    else:
        user.last_login = datetime.utcnow()
        user.name = user_info.get('name', user.name)
        user.avatar_url = user_info.get('picture', user.avatar_url)
    
    db.session.commit()
    
    session['user_id'] = user.id
    session.permanent = True
    
    # Redirect to frontend
    return redirect('/')


@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """End session"""
    session.clear()
    return {'data': {'message': 'Logged out successfully'}}


@bp.route('/me')
@login_required
def me():
    """Get current user info"""
    user = get_current_user()
    return {'data': user.to_dict()}


@bp.route('/token', methods=['POST'])
@login_required
def generate_token():
    """Generate JWT for API access"""
    user = get_current_user()
    
    payload = {
        'sub': str(user.id),  # JWT spec requires sub to be a string
        'email': user.email,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    
    token = jwt.encode(
        payload,
        current_app.config.get('JWT_SECRET_KEY', 'jwt-dev-secret'),
        algorithm='HS256'
    )
    
    return {'data': {'token': token, 'expires_in': 30 * 24 * 60 * 60}}
