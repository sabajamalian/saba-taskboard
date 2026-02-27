import httpx
from config import TASKBOARD_API_URL


class TaskBoardAPI:
    def __init__(self, jwt_token: str):
        self.token = jwt_token
        self.base_url = TASKBOARD_API_URL
        self.headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        }
    
    async def get(self, endpoint: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'{self.base_url}{endpoint}',
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def post(self, endpoint: str, data: dict):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.base_url}{endpoint}',
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
    
    async def get_boards(self):
        result = await self.get('/boards')
        return result.get('data', {})
    
    async def get_board(self, board_id: int):
        result = await self.get(f'/boards/{board_id}')
        return result.get('data', {})
    
    async def get_tasks(self, board_id: int):
        result = await self.get(f'/boards/{board_id}/tasks')
        return result.get('data', [])
    
    async def create_task(self, board_id: int, title: str, description: str = None):
        data = {'title': title}
        if description:
            data['description'] = description
        result = await self.post(f'/boards/{board_id}/tasks', data)
        return result.get('data', {})
    
    async def get_lists(self):
        result = await self.get('/lists')
        return result.get('data', [])
    
    async def get_list(self, list_id: int):
        result = await self.get(f'/lists/{list_id}')
        return result.get('data', {})
