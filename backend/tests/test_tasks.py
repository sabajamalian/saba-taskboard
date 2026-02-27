"""Tests for task API endpoints"""
import pytest
import json
from datetime import date, timedelta


class TestTasksAPI:
    """Test /api/v1/boards/:id/tasks endpoints"""
    
    @pytest.fixture
    def board_with_stages(self, auth_client):
        """Create a board and return board_id and stage_ids"""
        response = auth_client.post('/api/v1/boards',
            data=json.dumps({'title': 'Task Test Board'}),
            content_type='application/json'
        )
        data = json.loads(response.data)['data']
        return {
            'board_id': data['id'],
            'stages': {s['name']: s['id'] for s in data['stages']}
        }
    
    def test_list_tasks_empty(self, auth_client, board_with_stages):
        """Should return empty list when no tasks"""
        board_id = board_with_stages['board_id']
        response = auth_client.get(f'/api/v1/boards/{board_id}/tasks')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data'] == []
    
    def test_create_task(self, auth_client, board_with_stages):
        """Should create task in first stage by default"""
        board_id = board_with_stages['board_id']
        response = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'New Task'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['title'] == 'New Task'
        assert data['data']['stage_id'] == board_with_stages['stages']['To Do']
    
    def test_create_task_with_stage(self, auth_client, board_with_stages):
        """Should create task in specified stage"""
        board_id = board_with_stages['board_id']
        stage_id = board_with_stages['stages']['In Progress']
        
        response = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'In Progress Task', 'stage_id': stage_id}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['stage_id'] == stage_id
    
    def test_create_task_with_due_date(self, auth_client, board_with_stages):
        """Should create task with due date"""
        board_id = board_with_stages['board_id']
        due_date = (date.today() + timedelta(days=7)).isoformat()
        
        response = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'Due Task', 'due_date': due_date}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['due_date'] == due_date
    
    def test_create_task_no_title(self, auth_client, board_with_stages):
        """Should reject task without title"""
        board_id = board_with_stages['board_id']
        response = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'description': 'No title'}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_create_task_with_custom_fields(self, auth_client, board_with_stages):
        """Should create task with custom fields"""
        board_id = board_with_stages['board_id']
        response = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({
                'title': 'Custom Task',
                'custom_fields': {'priority': 'high', 'estimate': 5}
            }),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['custom_fields'] == {'priority': 'high', 'estimate': 5}
    
    def test_update_task(self, auth_client, board_with_stages):
        """Should update task"""
        board_id = board_with_stages['board_id']
        
        # Create
        create_resp = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'Original'}),
            content_type='application/json'
        )
        task_id = json.loads(create_resp.data)['data']['id']
        
        # Update
        response = auth_client.put(f'/api/v1/boards/{board_id}/tasks/{task_id}',
            data=json.dumps({'title': 'Updated', 'description': 'New desc'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['title'] == 'Updated'
        assert data['data']['description'] == 'New desc'
    
    def test_move_task(self, auth_client, board_with_stages):
        """Should move task to different stage"""
        board_id = board_with_stages['board_id']
        done_stage = board_with_stages['stages']['Done']
        
        # Create in To Do
        create_resp = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'Move Me'}),
            content_type='application/json'
        )
        task_id = json.loads(create_resp.data)['data']['id']
        
        # Move to Done
        response = auth_client.put(f'/api/v1/boards/{board_id}/tasks/{task_id}/move',
            data=json.dumps({'stage_id': done_stage}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['stage_id'] == done_stage
    
    def test_delete_task(self, auth_client, board_with_stages):
        """Should delete task"""
        board_id = board_with_stages['board_id']
        
        # Create
        create_resp = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'Delete Me'}),
            content_type='application/json'
        )
        task_id = json.loads(create_resp.data)['data']['id']
        
        # Delete
        response = auth_client.delete(f'/api/v1/boards/{board_id}/tasks/{task_id}')
        assert response.status_code == 200
        
        # Verify deleted
        get_resp = auth_client.get(f'/api/v1/boards/{board_id}/tasks/{task_id}')
        assert get_resp.status_code == 404
    
    def test_dynamic_color_overdue(self, auth_client, board_with_stages, app):
        """Should return red dynamic color for overdue tasks"""
        board_id = board_with_stages['board_id']
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        
        response = auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'Overdue', 'due_date': yesterday}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['dynamic_color'] == '#EF4444'  # Red
    
    def test_filter_tasks_by_stage(self, auth_client, board_with_stages):
        """Should filter tasks by stage_id"""
        board_id = board_with_stages['board_id']
        todo_stage = board_with_stages['stages']['To Do']
        done_stage = board_with_stages['stages']['Done']
        
        # Create in To Do
        auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'Todo Task'}),
            content_type='application/json'
        )
        
        # Create in Done
        auth_client.post(f'/api/v1/boards/{board_id}/tasks',
            data=json.dumps({'title': 'Done Task', 'stage_id': done_stage}),
            content_type='application/json'
        )
        
        # Filter by To Do
        response = auth_client.get(f'/api/v1/boards/{board_id}/tasks?stage_id={todo_stage}')
        data = json.loads(response.data)
        assert len(data['data']) == 1
        assert data['data'][0]['title'] == 'Todo Task'
