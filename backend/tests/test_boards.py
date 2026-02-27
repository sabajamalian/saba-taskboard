"""Tests for board API endpoints"""
import pytest
import json


class TestBoardsAPI:
    """Test /api/v1/boards endpoints"""
    
    def test_list_boards_unauthenticated(self, client):
        """Should return 401 when not authenticated"""
        response = client.get('/api/v1/boards')
        assert response.status_code == 401
    
    def test_list_boards_empty(self, auth_client):
        """Should return empty lists when user has no boards"""
        response = auth_client.get('/api/v1/boards')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['owned'] == []
        assert data['data']['shared'] == []
    
    def test_create_board(self, auth_client):
        """Should create a new board with default stages"""
        response = auth_client.post('/api/v1/boards',
            data=json.dumps({'title': 'Test Board', 'description': 'A test board'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['title'] == 'Test Board'
        assert data['data']['description'] == 'A test board'
        assert len(data['data']['stages']) == 3  # Default stages
    
    def test_create_board_with_color(self, auth_client):
        """Should create board with custom color theme"""
        response = auth_client.post('/api/v1/boards',
            data=json.dumps({'title': 'Purple Board', 'color_theme': 'purple'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['color_theme'] == 'purple'
    
    def test_create_board_no_title(self, auth_client):
        """Should reject board without title"""
        response = auth_client.post('/api/v1/boards',
            data=json.dumps({'description': 'No title'}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error']['code'] == 'VALIDATION_ERROR'
    
    def test_get_board(self, auth_client):
        """Should get board by ID"""
        # Create board
        create_resp = auth_client.post('/api/v1/boards',
            data=json.dumps({'title': 'Get Test'}),
            content_type='application/json'
        )
        board_id = json.loads(create_resp.data)['data']['id']
        
        # Get board
        response = auth_client.get(f'/api/v1/boards/{board_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Get Test'
    
    def test_get_board_not_found(self, auth_client):
        """Should return 404 for non-existent board"""
        response = auth_client.get('/api/v1/boards/99999')
        assert response.status_code == 404
    
    def test_update_board(self, auth_client):
        """Should update board title and description"""
        # Create
        create_resp = auth_client.post('/api/v1/boards',
            data=json.dumps({'title': 'Original'}),
            content_type='application/json'
        )
        board_id = json.loads(create_resp.data)['data']['id']
        
        # Update
        response = auth_client.put(f'/api/v1/boards/{board_id}',
            data=json.dumps({'title': 'Updated', 'description': 'New desc'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Updated'
        assert data['data']['description'] == 'New desc'
    
    def test_delete_board(self, auth_client):
        """Should delete board"""
        # Create
        create_resp = auth_client.post('/api/v1/boards',
            data=json.dumps({'title': 'To Delete'}),
            content_type='application/json'
        )
        board_id = json.loads(create_resp.data)['data']['id']
        
        # Delete
        response = auth_client.delete(f'/api/v1/boards/{board_id}')
        assert response.status_code == 200
        
        # Verify deleted
        get_resp = auth_client.get(f'/api/v1/boards/{board_id}')
        assert get_resp.status_code == 404
