import pytest
from app import create_app, db


@pytest.fixture
def app(tmp_path):
    """Create application for testing with file-based SQLite"""
    db_path = tmp_path / "test.db"
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SECRET_KEY': 'test-secret-key',
        'JWT_SECRET_KEY': 'test-jwt-secret',
        'WTF_CSRF_ENABLED': False
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Test client"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """CLI test runner"""
    return app.test_cli_runner()


@pytest.fixture
def auth_user(app):
    """Create and return an authenticated test user"""
    from app.models.user import User
    
    # app fixture already has app_context active (via yield)
    user = User(
        google_id='test-google-id-123',
        email='test@example.com',
        name='Test User'
    )
    db.session.add(user)
    db.session.commit()
    
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'google_id': user.google_id
    }


@pytest.fixture
def auth_client(client, app, auth_user):
    """Client with authenticated session"""
    with client.session_transaction() as session:
        session['user_id'] = auth_user['id']
    return client


@pytest.fixture
def test_project(auth_client):
    """Create a project for tests that require one"""
    import json
    response = auth_client.post('/api/v1/projects',
        data=json.dumps({'name': 'Test Project'}),
        content_type='application/json'
    )
    return json.loads(response.data)['data']


@pytest.fixture
def jwt_headers(app, auth_user):
    """Get JWT auth headers for API testing"""
    import jwt as pyjwt
    from datetime import datetime, timedelta
    
    payload = {
        'sub': str(auth_user['id']),  # JWT spec requires sub to be a string
        'email': auth_user['email'],
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    
    token = pyjwt.encode(payload, 'test-jwt-secret', algorithm='HS256')
    
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
