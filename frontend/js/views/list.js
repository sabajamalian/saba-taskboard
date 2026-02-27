import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderList(container, params) {
    const listId = params.id;
    
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    
    try {
        const response = await api.get(`/lists/${listId}`);
        const list = response.data;
        setState({ currentList: list });
        
        let html = `
            <div class="board-header">
                <div>
                    <a href="#/lists" class="back-link">← Back to lists</a>
                    <h2 style="margin-top: 0.5rem;">${escapeHtml(list.title)}</h2>
                </div>
                <button id="delete-list-btn" class="btn btn-danger">Delete List</button>
            </div>
            
            <div class="list-container" style="max-width: 600px;">
                <form id="add-item-form" class="add-item-form">
                    <input type="text" id="new-item-input" class="form-input" placeholder="Add a new item...">
                    <button type="submit" class="btn btn-primary">Add</button>
                </form>
                
                <ul class="checklist" id="checklist">
                    ${(list.items || []).map(item => renderListItem(item)).join('')}
                </ul>
                
                ${(list.items || []).length === 0 ? `
                    <div class="empty-state" style="padding: 2rem;">
                        <p style="color: var(--text-tertiary);">No items yet. Add your first item above!</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add item
        document.getElementById('add-item-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('new-item-input');
            if (input.value.trim()) {
                await api.post(`/lists/${listId}/items`, { content: input.value.trim() });
                toast.success('Item added');
                renderList(container, params);
            }
        });
        
        // Toggle items
        document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async () => {
                const itemId = checkbox.dataset.id;
                await api.put(`/lists/${listId}/items/${itemId}/toggle`);
            });
        });
        
        // Delete items
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                await api.delete(`/lists/${listId}/items/${itemId}`);
                renderList(container, params);
            });
        });
        
        // Delete list
        document.getElementById('delete-list-btn').addEventListener('click', async () => {
            if (confirm('Delete this list and all items?')) {
                await api.delete(`/lists/${listId}`);
                toast.info('List deleted');
                window.location.hash = '#/lists';
            }
        });
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading list: ${err.message}</div>`;
    }
}

function renderListItem(item) {
    return `
        <li class="checklist-item">
            <input type="checkbox" class="checklist-checkbox" data-id="${item.id}" ${item.is_checked ? 'checked' : ''}>
            <span class="checklist-text ${item.is_checked ? 'checked' : ''}">${escapeHtml(item.content)}</span>
            <button class="delete-item-btn btn btn-secondary" data-id="${item.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">×</button>
        </li>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
