"""Tests for stage API endpoints"""
import pytest
import json


class TestStagesAPI:
    """Test /api/v1/boards/:id/stages endpoints"""
    
    @pytest.fixture
    def board(self, auth_client):
        """Create a board for stage tests"""
        response = auth_client.post('/api/v1/boards',
            data=json.dumps({'title': 'Stage Test Board'}),
            content_type='application/json'
        )
        return json.loads(response.data)['data']
    
    def test_list_default_stages(self, auth_client, board):
        """Should have 3 default stages"""
        response = auth_client.get(f'/api/v1/boards/{board["id"]}/stages')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']) == 3
        names = [s['name'] for s in data['data']]
        assert 'To Do' in names
        assert 'In Progress' in names
        assert 'Done' in names
    
    def test_create_stage(self, auth_client, board):
        """Should create new stage"""
        response = auth_client.post(f'/api/v1/boards/{board["id"]}/stages',
            data=json.dumps({'name': 'Review'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['name'] == 'Review'
        assert data['data']['position'] == 3  # After default 3
    
    def test_create_stage_with_color(self, auth_client, board):
        """Should create stage with custom color"""
        response = auth_client.post(f'/api/v1/boards/{board["id"]}/stages',
            data=json.dumps({'name': 'Blocked', 'color': '#EF4444'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['color'] == '#EF4444'
    
    def test_create_stage_no_name(self, auth_client, board):
        """Should reject stage without name"""
        response = auth_client.post(f'/api/v1/boards/{board["id"]}/stages',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_update_stage(self, auth_client, board):
        """Should update stage name and color"""
        stages_resp = auth_client.get(f'/api/v1/boards/{board["id"]}/stages')
        stage_id = json.loads(stages_resp.data)['data'][0]['id']
        
        response = auth_client.put(f'/api/v1/boards/{board["id"]}/stages/{stage_id}',
            data=json.dumps({'name': 'Backlog', 'color': '#8B5CF6'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['name'] == 'Backlog'
        assert data['data']['color'] == '#8B5CF6'
    
    def test_delete_empty_stage(self, auth_client, board):
        """Should delete stage with no tasks"""
        # Create new stage
        create_resp = auth_client.post(f'/api/v1/boards/{board["id"]}/stages',
            data=json.dumps({'name': 'Temp'}),
            content_type='application/json'
        )
        stage_id = json.loads(create_resp.data)['data']['id']
        
        # Delete it
        response = auth_client.delete(f'/api/v1/boards/{board["id"]}/stages/{stage_id}')
        assert response.status_code == 200
    
    def test_delete_stage_with_tasks(self, auth_client, board):
        """Should reject deleting stage that has tasks"""
        stages_resp = auth_client.get(f'/api/v1/boards/{board["id"]}/stages')
        stage_id = json.loads(stages_resp.data)['data'][0]['id']
        
        # Add a task to the stage
        auth_client.post(f'/api/v1/boards/{board["id"]}/tasks',
            data=json.dumps({'title': 'Blocker task', 'stage_id': stage_id}),
            content_type='application/json'
        )
        
        # Try to delete
        response = auth_client.delete(f'/api/v1/boards/{board["id"]}/stages/{stage_id}')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'tasks' in data['error']['message'].lower()
    
    def test_reorder_stage(self, auth_client, board):
        """Should reorder stage position"""
        stages_resp = auth_client.get(f'/api/v1/boards/{board["id"]}/stages')
        stages = json.loads(stages_resp.data)['data']
        
        # Move first stage (position 0) to position 2
        stage_id = stages[0]['id']
        response = auth_client.put(f'/api/v1/boards/{board["id"]}/stages/{stage_id}/reorder',
            data=json.dumps({'position': 2}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['position'] == 2
