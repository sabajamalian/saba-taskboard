import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData } from '../app.js';

export async function renderList(container, params) {
    const listId = params.id;
    
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    
    try {
        const response = await api.get(`/lists/${listId}`);
        const list = response.data;
        setState({ currentList: list });
        
        const items = list.items || [];
        const checkedCount = items.filter(i => i.is_checked).length;
        const totalCount = items.length;
        const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
        
        let html = `
            <div class="board-header">
                <div>
                    <h2 style="margin-bottom: 0.25rem;">${escapeHtml(list.title)}</h2>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">Checklist</p>
                </div>
                <button id="delete-list-btn" class="btn btn-danger">Delete List</button>
            </div>
            
            <div class="list-container" style="max-width: 600px;">
                ${totalCount > 0 ? `
                    <div class="list-progress">
                        <div class="list-progress-bar">
                            <div class="list-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="list-progress-text">${checkedCount}/${totalCount}</span>
                    </div>
                ` : ''}
                
                <div class="add-item-form" id="add-item-form">
                    <input type="text" id="new-item-input" placeholder="Add a new item..." autocomplete="off">
                    <button type="button" id="add-item-btn" class="btn btn-primary">Add</button>
                </div>
                
                <ul class="checklist" id="checklist">
                    ${items.map(item => renderListItem(item, listId)).join('')}
                </ul>
                
                ${items.length === 0 ? `
                    <div class="empty-state" style="padding: 2rem;">
                        <p style="color: var(--text-tertiary);">No items yet. Add your first item above!</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add item - both button and Enter key
        const addInput = document.getElementById('new-item-input');
        const addBtn = document.getElementById('add-item-btn');
        
        const addItem = async () => {
            const value = addInput.value.trim();
            if (value) {
                addInput.disabled = true;
                addBtn.disabled = true;
                try {
                    await api.post(`/lists/${listId}/items`, { content: value });
                    toast.success('Item added');
                    renderList(container, params);
                } catch (err) {
                    toast.error('Failed to add item');
                    addInput.disabled = false;
                    addBtn.disabled = false;
                }
            }
        };
        
        addBtn.addEventListener('click', addItem);
        addInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addItem();
        });
        
        // Focus input on load
        addInput.focus();
        
        // Toggle items with animation
        document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async () => {
                const itemId = checkbox.dataset.id;
                const item = checkbox.closest('.checklist-item');
                const text = item.querySelector('.checklist-text');
                
                // Optimistic UI update
                text.classList.toggle('checked');
                
                try {
                    await api.put(`/lists/${listId}/items/${itemId}/toggle`);
                    // Refresh to update progress bar
                    setTimeout(() => renderList(container, params), 300);
                } catch (err) {
                    text.classList.toggle('checked'); // Revert
                    toast.error('Failed to update item');
                }
            });
        });
        
        // Inline edit on text click
        document.querySelectorAll('.checklist-text').forEach(text => {
            text.addEventListener('click', () => {
                const item = text.closest('.checklist-item');
                const itemId = item.querySelector('.checklist-checkbox').dataset.id;
                startInlineEdit(item, text, listId, itemId, container, params);
            });
        });
        
        // Delete items
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                const item = btn.closest('.checklist-item');
                
                // Animate removal
                item.style.transform = 'translateX(100%)';
                item.style.opacity = '0';
                
                setTimeout(async () => {
                    try {
                        await api.delete(`/lists/${listId}/items/${itemId}`);
                        renderList(container, params);
                    } catch (err) {
                        toast.error('Failed to delete item');
                        item.style.transform = '';
                        item.style.opacity = '';
                    }
                }, 200);
            });
        });
        
        // Delete list
        document.getElementById('delete-list-btn').addEventListener('click', async () => {
            if (confirm('Delete this list and all items?')) {
                await api.delete(`/lists/${listId}`);
                toast.info('List deleted');
                await loadSidebarData();
                window.location.hash = '#/lists';
            }
        });
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading list: ${err.message}</div>`;
    }
}

function startInlineEdit(item, textEl, listId, itemId, container, params) {
    const currentText = textEl.textContent;
    item.classList.add('editing');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'checklist-edit-input';
    input.value = currentText;
    
    textEl.replaceWith(input);
    input.focus();
    input.select();
    
    const saveEdit = async () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            try {
                await api.put(`/lists/${listId}/items/${itemId}`, { content: newText });
                toast.success('Item updated');
            } catch (err) {
                toast.error('Failed to update item');
            }
        }
        renderList(container, params);
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            renderList(container, params);
        }
    });
}

function renderListItem(item, listId) {
    return `
        <li class="checklist-item" style="transition: all 0.2s ease;">
            <div class="checklist-checkbox-wrapper">
                <input type="checkbox" class="checklist-checkbox" data-id="${item.id}" ${item.is_checked ? 'checked' : ''}>
                <span class="checklist-checkbox-custom"></span>
            </div>
            <span class="checklist-text ${item.is_checked ? 'checked' : ''}">${escapeHtml(item.content)}</span>
            <button class="delete-item-btn" data-id="${item.id}" title="Delete item">×</button>
        </li>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
