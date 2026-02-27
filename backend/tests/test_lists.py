"""Tests for list API endpoints"""
import pytest
import json


class TestListsAPI:
    """Test /api/v1/projects/:project_id/lists endpoints"""
    
    def test_list_lists_empty(self, auth_client, test_project):
        """Should return empty list when project has no lists"""
        project_id = test_project['id']
        response = auth_client.get(f'/api/v1/projects/{project_id}/lists')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data'] == []
    
    def test_create_list(self, auth_client, test_project):
        """Should create a new list"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/lists',
            data=json.dumps({'title': 'Shopping List'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['title'] == 'Shopping List'
        assert data['data']['color_theme'] == 'gray'  # Default
    
    def test_create_list_with_color(self, auth_client, test_project):
        """Should create list with custom color"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/lists',
            data=json.dumps({'title': 'Groceries', 'color_theme': 'green'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['color_theme'] == 'green'
    
    def test_create_list_no_title(self, auth_client, test_project):
        """Should reject list without title"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/lists',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_get_list_with_items(self, auth_client, test_project):
        """Should get list with items included"""
        project_id = test_project['id']
        # Create list
        create_resp = auth_client.post(f'/api/v1/projects/{project_id}/lists',
            data=json.dumps({'title': 'Test List'}),
            content_type='application/json'
        )
        list_id = json.loads(create_resp.data)['data']['id']
        
        # Add items
        auth_client.post(f'/api/v1/projects/{project_id}/lists/{list_id}/items',
            data=json.dumps({'content': 'Item 1'}),
            content_type='application/json'
        )
        auth_client.post(f'/api/v1/projects/{project_id}/lists/{list_id}/items',
            data=json.dumps({'content': 'Item 2'}),
            content_type='application/json'
        )
        
        # Get list
        response = auth_client.get(f'/api/v1/projects/{project_id}/lists/{list_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['items']) == 2
    
    def test_delete_list(self, auth_client, test_project):
        """Should delete list and all items"""
        project_id = test_project['id']
        # Create
        create_resp = auth_client.post(f'/api/v1/projects/{project_id}/lists',
            data=json.dumps({'title': 'Delete Me'}),
            content_type='application/json'
        )
        list_id = json.loads(create_resp.data)['data']['id']
        
        # Delete
        response = auth_client.delete(f'/api/v1/projects/{project_id}/lists/{list_id}')
        assert response.status_code == 200
        
        # Verify
        get_resp = auth_client.get(f'/api/v1/projects/{project_id}/lists/{list_id}')
        assert get_resp.status_code == 404


class TestListItemsAPI:
    """Test /api/v1/projects/:project_id/lists/:id/items endpoints"""
    
    @pytest.fixture
    def test_list(self, auth_client, test_project):
        """Create a list for item tests"""
        project_id = test_project['id']
        response = auth_client.post(f'/api/v1/projects/{project_id}/lists',
            data=json.dumps({'title': 'Item Test List'}),
            content_type='application/json'
        )
        list_data = json.loads(response.data)['data']
        return {'id': list_data['id'], 'project_id': project_id}
    
    def test_add_item(self, auth_client, test_list):
        """Should add item to list"""
        response = auth_client.post(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items',
            data=json.dumps({'content': 'Buy milk'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['content'] == 'Buy milk'
        assert data['data']['is_checked'] == False
    
    def test_add_item_no_content(self, auth_client, test_list):
        """Should reject item without content"""
        response = auth_client.post(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_toggle_item(self, auth_client, test_list):
        """Should toggle item checkbox"""
        # Add item
        add_resp = auth_client.post(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items',
            data=json.dumps({'content': 'Toggle me'}),
            content_type='application/json'
        )
        item_id = json.loads(add_resp.data)['data']['id']
        
        # Toggle on
        toggle_resp = auth_client.put(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items/{item_id}/toggle')
        assert toggle_resp.status_code == 200
        data = json.loads(toggle_resp.data)
        assert data['data']['is_checked'] == True
        
        # Toggle off
        toggle_resp2 = auth_client.put(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items/{item_id}/toggle')
        data2 = json.loads(toggle_resp2.data)
        assert data2['data']['is_checked'] == False
    
    def test_update_item(self, auth_client, test_list):
        """Should update item content"""
        # Add
        add_resp = auth_client.post(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items',
            data=json.dumps({'content': 'Original'}),
            content_type='application/json'
        )
        item_id = json.loads(add_resp.data)['data']['id']
        
        # Update
        response = auth_client.put(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items/{item_id}',
            data=json.dumps({'content': 'Updated'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['content'] == 'Updated'
    
    def test_delete_item(self, auth_client, test_list):
        """Should delete item"""
        # Add
        add_resp = auth_client.post(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items',
            data=json.dumps({'content': 'Delete me'}),
            content_type='application/json'
        )
        item_id = json.loads(add_resp.data)['data']['id']
        
        # Delete
        response = auth_client.delete(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}/items/{item_id}')
        assert response.status_code == 200
        
        # Verify list has no items
        list_resp = auth_client.get(f'/api/v1/projects/{test_list["project_id"]}/lists/{test_list["id"]}')
        data = json.loads(list_resp.data)
        assert len(data['data']['items']) == 0
