const API_BASE = '/api/v1';

async function request(method, endpoint, data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const json = await response.json();
    
    if (!response.ok) {
        throw new Error(json.error?.message || 'Request failed');
    }
    
    return json;
}

export const api = {
    get: (endpoint) => request('GET', endpoint),
    post: (endpoint, data) => request('POST', endpoint, data),
    put: (endpoint, data) => request('PUT', endpoint, data),
    delete: (endpoint) => request('DELETE', endpoint)
};
