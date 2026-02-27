import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadProjectContents } from '../app.js';

let projectMembers = [];

export async function renderList(container, params) {
    const projectId = params.projectId;
    const listId = params.listId;
    
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    
    try {
        const [response, membersRes] = await Promise.all([
            api.get(`/projects/${projectId}/lists/${listId}`),
            api.get(`/projects/${projectId}/members`)
        ]);
        const list = response.data;
        projectMembers = membersRes.data || [];
        setState({ currentList: list });
        
        const items = list.items || [];
        const checkedCount = items.filter(i => i.is_checked).length;
        const totalCount = items.length;
        const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
        
        let html = `
            <div class="board-header">
                <div>
                    <a href="#/projects/${projectId}" class="breadcrumb">← Back to project</a>
                    <h2 style="margin-bottom: 0.25rem;">${escapeHtml(list.title)}</h2>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">Checklist</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="save-as-template-btn" class="btn btn-secondary">📋 Save as Template</button>
                    <button id="delete-list-btn" class="btn btn-danger">Delete List</button>
                </div>
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
                    await api.post(`/projects/${projectId}/lists/${listId}/items`, { content: value });
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
                    await api.put(`/projects/${projectId}/lists/${listId}/items/${itemId}/toggle`);
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
                startInlineEdit(item, text, projectId, listId, itemId, container, params);
            });
        });
        
        // Assign item buttons
        document.querySelectorAll('.assign-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.id;
                const item = items.find(i => i.id === parseInt(itemId));
                showAssignItemModal(projectId, listId, item, container, params);
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
                        await api.delete(`/projects/${projectId}/lists/${listId}/items/${itemId}`);
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
                await api.delete(`/projects/${projectId}/lists/${listId}`);
                toast.info('List deleted');
                await loadProjectContents(projectId);
                window.location.hash = `#/projects/${projectId}`;
            }
        });
        
        // Save as template
        document.getElementById('save-as-template-btn').addEventListener('click', () => {
            showSaveAsListTemplateModal(list);
        });
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading list: ${err.message}</div>`;
    }
}

function startInlineEdit(item, textEl, projectId, listId, itemId, container, params) {
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
                await api.put(`/projects/${projectId}/lists/${listId}/items/${itemId}`, { content: newText });
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
    const assigneeBadge = item.assignee ? `
        <span class="item-assignee-badge" title="${escapeHtml(item.assignee.name)}">
            ${item.assignee.avatar_url ? `<img src="${escapeHtml(item.assignee.avatar_url)}" class="item-assignee-avatar">` : `<span class="item-assignee-initial">${escapeHtml(item.assignee.name.charAt(0))}</span>`}
        </span>
    ` : '';
    
    return `
        <li class="checklist-item" style="transition: all 0.2s ease;">
            <div class="checklist-checkbox-wrapper">
                <input type="checkbox" class="checklist-checkbox" data-id="${item.id}" ${item.is_checked ? 'checked' : ''}>
                <span class="checklist-checkbox-custom"></span>
            </div>
            <span class="checklist-text ${item.is_checked ? 'checked' : ''}">${escapeHtml(item.content)}</span>
            <button class="assign-item-btn" data-id="${item.id}" title="${item.assignee ? escapeHtml(item.assignee.name) : 'Assign'}">
                ${assigneeBadge || '👤'}
            </button>
            <button class="delete-item-btn" data-id="${item.id}" title="Delete item">×</button>
        </li>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAssignItemModal(projectId, listId, item, container, params) {
    showModal({
        title: 'Assign Item',
        content: `
            <form id="assign-item-form">
                <div class="form-group">
                    <label class="form-label">Assign To</label>
                    <select name="assigned_to" class="form-input">
                        <option value="">Unassigned</option>
                        ${projectMembers.map(m => `<option value="${m.id}" ${item.assigned_to === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
                    </select>
                </div>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('assign-item-form');
            const formData = new FormData(form);
            const assignedTo = formData.get('assigned_to');
            
            await api.put(`/projects/${projectId}/lists/${listId}/items/${item.id}`, {
                assigned_to: assignedTo ? parseInt(assignedTo) : null
            });
            
            toast.success(assignedTo ? 'Item assigned' : 'Assignment removed');
            hideModal();
            renderList(container, params);
        }
    });
}

function showSaveAsListTemplateModal(list) {
    showModal({
        title: 'Save List as Template',
        content: `
            <form id="save-list-template-form">
                <div class="form-group">
                    <label class="form-label">Template Name *</label>
                    <input type="text" name="name" class="form-input" value="${escapeHtml(list.title)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" style="min-height: 60px;" placeholder="Describe this template..."></textarea>
                </div>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">
                    This will save the list's items as a reusable template. All items will be unchecked when creating a new list from this template.
                </p>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('save-list-template-form');
            const formData = new FormData(form);
            
            await api.post(`/templates/lists/from-list/${list.id}`, {
                name: formData.get('name'),
                description: formData.get('description')
            });
            
            toast.success('List saved as template');
            hideModal();
        }
    });
}
