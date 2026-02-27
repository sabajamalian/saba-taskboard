"""Tests for list API endpoints"""
import pytest
import json


class TestListsAPI:
    """Test /api/v1/lists endpoints"""
    
    def test_list_lists_empty(self, auth_client):
        """Should return empty list when user has no lists"""
        response = auth_client.get('/api/v1/lists')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data'] == []
    
    def test_create_list(self, auth_client):
        """Should create a new list"""
        response = auth_client.post('/api/v1/lists',
            data=json.dumps({'title': 'Shopping List'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['title'] == 'Shopping List'
        assert data['data']['color_theme'] == 'gray'  # Default
    
    def test_create_list_with_color(self, auth_client):
        """Should create list with custom color"""
        response = auth_client.post('/api/v1/lists',
            data=json.dumps({'title': 'Groceries', 'color_theme': 'green'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['color_theme'] == 'green'
    
    def test_create_list_no_title(self, auth_client):
        """Should reject list without title"""
        response = auth_client.post('/api/v1/lists',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_get_list_with_items(self, auth_client):
        """Should get list with items included"""
        # Create list
        create_resp = auth_client.post('/api/v1/lists',
            data=json.dumps({'title': 'Test List'}),
            content_type='application/json'
        )
        list_id = json.loads(create_resp.data)['data']['id']
        
        # Add items
        auth_client.post(f'/api/v1/lists/{list_id}/items',
            data=json.dumps({'content': 'Item 1'}),
            content_type='application/json'
        )
        auth_client.post(f'/api/v1/lists/{list_id}/items',
            data=json.dumps({'content': 'Item 2'}),
            content_type='application/json'
        )
        
        # Get list
        response = auth_client.get(f'/api/v1/lists/{list_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['data']['items']) == 2
    
    def test_delete_list(self, auth_client):
        """Should delete list and all items"""
        # Create
        create_resp = auth_client.post('/api/v1/lists',
            data=json.dumps({'title': 'Delete Me'}),
            content_type='application/json'
        )
        list_id = json.loads(create_resp.data)['data']['id']
        
        # Delete
        response = auth_client.delete(f'/api/v1/lists/{list_id}')
        assert response.status_code == 200
        
        # Verify
        get_resp = auth_client.get(f'/api/v1/lists/{list_id}')
        assert get_resp.status_code == 404


class TestListItemsAPI:
    """Test /api/v1/lists/:id/items endpoints"""
    
    @pytest.fixture
    def test_list(self, auth_client):
        """Create a list for item tests"""
        response = auth_client.post('/api/v1/lists',
            data=json.dumps({'title': 'Item Test List'}),
            content_type='application/json'
        )
        return json.loads(response.data)['data']['id']
    
    def test_add_item(self, auth_client, test_list):
        """Should add item to list"""
        response = auth_client.post(f'/api/v1/lists/{test_list}/items',
            data=json.dumps({'content': 'Buy milk'}),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['data']['content'] == 'Buy milk'
        assert data['data']['is_checked'] == False
    
    def test_add_item_no_content(self, auth_client, test_list):
        """Should reject item without content"""
        response = auth_client.post(f'/api/v1/lists/{test_list}/items',
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
    
    def test_toggle_item(self, auth_client, test_list):
        """Should toggle item checkbox"""
        # Add item
        add_resp = auth_client.post(f'/api/v1/lists/{test_list}/items',
            data=json.dumps({'content': 'Toggle me'}),
            content_type='application/json'
        )
        item_id = json.loads(add_resp.data)['data']['id']
        
        # Toggle on
        toggle_resp = auth_client.put(f'/api/v1/lists/{test_list}/items/{item_id}/toggle')
        assert toggle_resp.status_code == 200
        data = json.loads(toggle_resp.data)
        assert data['data']['is_checked'] == True
        
        # Toggle off
        toggle_resp2 = auth_client.put(f'/api/v1/lists/{test_list}/items/{item_id}/toggle')
        data2 = json.loads(toggle_resp2.data)
        assert data2['data']['is_checked'] == False
    
    def test_update_item(self, auth_client, test_list):
        """Should update item content"""
        # Add
        add_resp = auth_client.post(f'/api/v1/lists/{test_list}/items',
            data=json.dumps({'content': 'Original'}),
            content_type='application/json'
        )
        item_id = json.loads(add_resp.data)['data']['id']
        
        # Update
        response = auth_client.put(f'/api/v1/lists/{test_list}/items/{item_id}',
            data=json.dumps({'content': 'Updated'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['data']['content'] == 'Updated'
    
    def test_delete_item(self, auth_client, test_list):
        """Should delete item"""
        # Add
        add_resp = auth_client.post(f'/api/v1/lists/{test_list}/items',
            data=json.dumps({'content': 'Delete me'}),
            content_type='application/json'
        )
        item_id = json.loads(add_resp.data)['data']['id']
        
        # Delete
        response = auth_client.delete(f'/api/v1/lists/{test_list}/items/{item_id}')
        assert response.status_code == 200
        
        # Verify list has no items
        list_resp = auth_client.get(f'/api/v1/lists/{test_list}')
        data = json.loads(list_resp.data)
        assert len(data['data']['items']) == 0
