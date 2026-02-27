"""Tests for project sharing API endpoints"""
import pytest
import json


class TestSharingAPI:
    """Test /api/v1/projects/:id/shares endpoints"""
    
    @pytest.fixture
    def other_user(self, app):
        """Create another user to share with"""
        from app.models.user import User
        from app import db
        
        with app.app_context():
            user = User(
                google_id='other-google-id-456',
                email='other@example.com',
                name='Other User'
            )
            db.session.add(user)
            db.session.commit()
            return {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
    
    def test_list_shares_empty(self, auth_client, test_project):
        """Should return empty list when project not shared"""
        project_id = test_project['id']
        response = auth_client.get(f'/api/v1/projects/{project_id}/shares')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data'] == []
    
    def test_share_board(self, auth_client, test_project, other_user):
        """Should share project with another user"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({'email': other_user['email']}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['user']['email'] == other_user['email']
    
    def test_share_board_view_only(self, auth_client, test_project, other_user):
        """Should share project with user"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({'email': other_user['email']}),
            content_type='application/json'
        )
        assert response.status_code == 201
    
    def test_share_board_user_not_found(self, auth_client, test_project):
        """Should return 404 for non-existent user"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({'email': 'nonexistent@example.com'}),
            content_type='application/json'
        )
        assert response.status_code == 404
    
    def test_share_board_no_email(self, auth_client, test_project):
        """Should reject share without email"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_share_board_with_self(self, auth_client, test_project, auth_user):
        """Should reject sharing with yourself"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({'email': auth_user['email']}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_share_board_duplicate(self, auth_client, test_project, other_user):
        """Should reject duplicate share"""
        project_id = test_project['id']
        # First share
        auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({'email': other_user['email']}),
            content_type='application/json'
        )
        
        # Try again
        response = auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({'email': other_user['email']}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_remove_share(self, auth_client, test_project, other_user):
        """Should remove share"""
        project_id = test_project['id']
        # Share
        auth_client.post(f'/api/v1/projects/{project_id}/shares',
            data=json.dumps({'email': other_user['email']}),
            content_type='application/json'
        )
        
        # Remove
        response = auth_client.delete(f'/api/v1/projects/{project_id}/shares/{other_user["id"]}')
        assert response.status_code == 200
        
        # Verify removed
        list_resp = auth_client.get(f'/api/v1/projects/{project_id}/shares')
        data = json.loads(list_resp.data)
        assert len(data['data']) == 0
