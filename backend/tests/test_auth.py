"""Tests for authentication"""
import pytest
import json


class TestAuthAPI:
    """Test /api/v1/auth endpoints"""
    
    def test_me_unauthenticated(self, client):
        """Should return 401 when not authenticated"""
        response = client.get('/api/v1/auth/me')
        assert response.status_code == 401
    
    def test_me_authenticated(self, auth_client, auth_user):
        """Should return user info when authenticated"""
        response = auth_client.get('/api/v1/auth/me')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['email'] == auth_user['email']
        assert data['data']['name'] == auth_user['name']
    
    def test_logout(self, auth_client):
        """Should clear session on logout"""
        response = auth_client.post('/api/v1/auth/logout')
        assert response.status_code == 200
        
        # Should now be unauthenticated
        me_resp = auth_client.get('/api/v1/auth/me')
        assert me_resp.status_code == 401
    
    def test_generate_token(self, auth_client):
        """Should generate JWT token"""
        response = auth_client.post('/api/v1/auth/token')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'token' in data['data']
        assert data['data']['expires_in'] == 30 * 24 * 60 * 60  # 30 days
    
    def test_jwt_authentication(self, client, jwt_headers, auth_user):
        """Should authenticate with JWT"""
        response = client.get('/api/v1/auth/me', headers=jwt_headers)
        assert response.status_code == 200
    
    def test_jwt_invalid(self, client):
        """Should reject invalid JWT"""
        headers = {
            'Authorization': 'Bearer invalid-token',
            'Content-Type': 'application/json'
        }
        response = client.get('/api/v1/auth/me', headers=headers)
        assert response.status_code == 401
    
    def test_jwt_expired(self, client, app, auth_user):
        """Should reject expired JWT"""
        import jwt
        from datetime import datetime, timedelta
        
        payload = {
            'sub': str(auth_user['id']),  # JWT spec requires sub to be a string
            'email': auth_user['email'],
            'iat': datetime.utcnow() - timedelta(days=60),
            'exp': datetime.utcnow() - timedelta(days=30)  # Expired
        }
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        response = client.get('/api/v1/auth/me', headers=headers)
        assert response.status_code == 401
