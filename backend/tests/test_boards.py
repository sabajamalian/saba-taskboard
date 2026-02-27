"""Tests for board API endpoints"""
import pytest
import json


class TestBoardsAPI:
    """Test /api/v1/projects/:project_id/boards endpoints"""
    
    def test_list_boards_unauthenticated(self, client):
        """Should return 401 when not authenticated"""
        response = client.get('/api/v1/projects/1/boards')
        assert response.status_code == 401
    
    def test_list_boards_empty(self, auth_client, test_project):
        """Should return empty list when project has no boards"""
        project_id = test_project['id']
        response = auth_client.get(f'/api/v1/projects/{project_id}/boards')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data'] == []
    
    def test_create_board(self, auth_client, test_project):
        """Should create a new board with default stages"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/boards',
            data=json.dumps({'title': 'Test Board', 'description': 'A test board'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['title'] == 'Test Board'
        assert data['data']['description'] == 'A test board'
        assert len(data['data']['stages']) == 3  # Default stages
    
    def test_create_board_with_color(self, auth_client, test_project):
        """Should create board with custom color theme"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/boards',
            data=json.dumps({'title': 'Purple Board', 'color_theme': 'purple'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['color_theme'] == 'purple'
    
    def test_create_board_no_title(self, auth_client, test_project):
        """Should reject board without title"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/boards',
            data=json.dumps({'description': 'No title'}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error']['code'] == 'VALIDATION_ERROR'
    
    def test_get_board(self, auth_client, test_project):
        """Should get board by ID"""
        project_id = test_project['id']
        # Create board
        create_resp = auth_client.post(f'/api/v1/projects/{project_id}/boards',
            data=json.dumps({'title': 'Get Test'}),
            content_type='application/json'
        )
        board_id = json.loads(create_resp.data)['data']['id']
        
        # Get board
        response = auth_client.get(f'/api/v1/projects/{project_id}/boards/{board_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Get Test'
    
    def test_get_board_not_found(self, auth_client, test_project):
        """Should return 404 for non-existent board"""
        project_id = test_project['id']
        response = auth_client.get(f'/api/v1/projects/{project_id}/boards/99999')
        assert response.status_code == 404
    
    def test_update_board(self, auth_client, test_project):
        """Should update board title and description"""
        project_id = test_project['id']
        # Create
        create_resp = auth_client.post(f'/api/v1/projects/{project_id}/boards',
            data=json.dumps({'title': 'Original'}),
            content_type='application/json'
        )
        board_id = json.loads(create_resp.data)['data']['id']
        
        # Update
        response = auth_client.put(f'/api/v1/projects/{project_id}/boards/{board_id}',
            data=json.dumps({'title': 'Updated', 'description': 'New desc'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Updated'
        assert data['data']['description'] == 'New desc'
    
    def test_delete_board(self, auth_client, test_project):
        """Should delete board"""
        project_id = test_project['id']
        # Create
        create_resp = auth_client.post(f'/api/v1/projects/{project_id}/boards',
            data=json.dumps({'title': 'To Delete'}),
            content_type='application/json'
        )
        board_id = json.loads(create_resp.data)['data']['id']
        
        # Delete
        response = auth_client.delete(f'/api/v1/projects/{project_id}/boards/{board_id}')
        assert response.status_code == 200
        
        # Verify deleted
        get_resp = auth_client.get(f'/api/v1/projects/{project_id}/boards/{board_id}')
        assert get_resp.status_code == 404
