import { api } from '../api.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData, setupColorPicker } from '../app.js';

export async function renderTemplates(container) {
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    
    try {
        const [boardTemplates, listTemplates] = await Promise.all([
            api.get('/templates/boards'),
            api.get('/templates/lists')
        ]);
        
        const boardTpls = boardTemplates.data || [];
        const listTpls = listTemplates.data || [];
        
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h2 class="page-title">Templates</h2>
                    <p class="page-subtitle">Save boards and lists as templates for quick reuse</p>
                </div>
            </div>
            
            <div class="templates-section">
                <div class="templates-header">
                    <h3 class="templates-title">📋 Board Templates</h3>
                    <button id="create-board-template-btn" class="btn btn-secondary">+ New Template</button>
                </div>
                <div id="board-templates-grid" class="templates-grid">
                    ${boardTpls.length === 0 ? `
                        <div class="template-empty">
                            <p>No board templates yet. Create one from an existing board or from scratch.</p>
                        </div>
                    ` : boardTpls.map(t => renderBoardTemplateCard(t)).join('')}
                </div>
            </div>
            
            <div class="templates-section" style="margin-top: 3rem;">
                <div class="templates-header">
                    <h3 class="templates-title">☑️ List Templates</h3>
                    <button id="create-list-template-btn" class="btn btn-secondary">+ New Template</button>
                </div>
                <div id="list-templates-grid" class="templates-grid">
                    ${listTpls.length === 0 ? `
                        <div class="template-empty">
                            <p>No list templates yet. Create one from an existing list or from scratch.</p>
                        </div>
                    ` : listTpls.map(t => renderListTemplateCard(t)).join('')}
                </div>
            </div>
        `;
        
        // Event listeners
        document.getElementById('create-board-template-btn')?.addEventListener('click', showNewBoardTemplateModal);
        document.getElementById('create-list-template-btn')?.addEventListener('click', showNewListTemplateModal);
        
        document.querySelectorAll('.template-card[data-type="board"]').forEach(card => {
            card.addEventListener('click', () => showBoardTemplateActions(boardTpls.find(t => t.id === parseInt(card.dataset.id))));
        });
        
        document.querySelectorAll('.template-card[data-type="list"]').forEach(card => {
            card.addEventListener('click', () => showListTemplateActions(listTpls.find(t => t.id === parseInt(card.dataset.id))));
        });
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading templates: ${err.message}</div>`;
        toast.error('Failed to load templates');
    }
}

function renderBoardTemplateCard(template) {
    const stageCount = template.template_data?.stages?.length || 0;
    const taskCount = template.template_data?.tasks?.length || 0;
    
    return `
        <div class="template-card" data-type="board" data-id="${template.id}">
            <div class="template-card-header">
                <span class="template-icon" style="background: ${getThemeColor(template.color_theme)}">📋</span>
                <h4 class="template-name">${escapeHtml(template.name)}</h4>
            </div>
            <p class="template-description">${escapeHtml(template.description || 'No description')}</p>
            <div class="template-meta">
                <span>${stageCount} stage${stageCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
            </div>
        </div>
    `;
}

function renderListTemplateCard(template) {
    const itemCount = template.template_data?.items?.length || 0;
    
    return `
        <div class="template-card" data-type="list" data-id="${template.id}">
            <div class="template-card-header">
                <span class="template-icon" style="background: ${getThemeColor(template.color_theme)}">☑️</span>
                <h4 class="template-name">${escapeHtml(template.name)}</h4>
            </div>
            <p class="template-description">${escapeHtml(template.description || 'No description')}</p>
            <div class="template-meta">
                <span>${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
            </div>
        </div>
    `;
}

function showBoardTemplateActions(template) {
    showModal({
        title: template.name,
        content: `
            <div class="template-actions">
                <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
                    ${escapeHtml(template.description || 'Create a new board from this template')}
                </p>
                
                <div class="template-preview">
                    <h5 style="margin-bottom: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">Stages:</h5>
                    <div class="stage-preview-list">
                        ${(template.template_data?.stages || []).map(s => `
                            <span class="stage-preview-badge" style="border-left: 3px solid ${s.color};">${escapeHtml(s.name)}</span>
                        `).join('')}
                    </div>
                </div>
                
                <form id="apply-board-template-form" style="margin-top: 1.5rem;">
                    <div class="form-group">
                        <label class="form-label">New Board Name</label>
                        <input type="text" name="title" class="form-input" value="${escapeHtml(template.name)}" required>
                    </div>
                </form>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button id="apply-template-btn" class="btn btn-primary" style="flex: 1;">Create Board</button>
                    <button id="delete-template-btn" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `,
        hideFooter: true
    });
    
    document.getElementById('apply-template-btn')?.addEventListener('click', async () => {
        const title = document.querySelector('input[name="title"]').value;
        try {
            const result = await api.post(`/templates/boards/${template.id}/apply`, { title });
            toast.success('Board created from template');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/boards/${result.data.id}`;
        } catch (err) {
            toast.error('Failed to create board');
        }
    });
    
    document.getElementById('delete-template-btn')?.addEventListener('click', async () => {
        if (confirm('Delete this template?')) {
            await api.delete(`/templates/boards/${template.id}`);
            toast.info('Template deleted');
            hideModal();
            renderTemplates(document.getElementById('main-content'));
        }
    });
}

function showListTemplateActions(template) {
    showModal({
        title: template.name,
        content: `
            <div class="template-actions">
                <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
                    ${escapeHtml(template.description || 'Create a new list from this template')}
                </p>
                
                <div class="template-preview">
                    <h5 style="margin-bottom: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">Items:</h5>
                    <ul class="item-preview-list">
                        ${(template.template_data?.items || []).slice(0, 5).map(i => `
                            <li>☐ ${escapeHtml(i.content)}</li>
                        `).join('')}
                        ${(template.template_data?.items?.length > 5) ? `<li style="color: var(--text-tertiary);">... and ${template.template_data.items.length - 5} more</li>` : ''}
                    </ul>
                </div>
                
                <form id="apply-list-template-form" style="margin-top: 1.5rem;">
                    <div class="form-group">
                        <label class="form-label">New List Name</label>
                        <input type="text" name="title" class="form-input" value="${escapeHtml(template.name)}" required>
                    </div>
                </form>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button id="apply-template-btn" class="btn btn-primary" style="flex: 1;">Create List</button>
                    <button id="delete-template-btn" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `,
        hideFooter: true
    });
    
    document.getElementById('apply-template-btn')?.addEventListener('click', async () => {
        const title = document.querySelector('input[name="title"]').value;
        try {
            const result = await api.post(`/templates/lists/${template.id}/apply`, { title });
            toast.success('List created from template');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/lists/${result.data.id}`;
        } catch (err) {
            toast.error('Failed to create list');
        }
    });
    
    document.getElementById('delete-template-btn')?.addEventListener('click', async () => {
        if (confirm('Delete this template?')) {
            await api.delete(`/templates/lists/${template.id}`);
            toast.info('Template deleted');
            hideModal();
            renderTemplates(document.getElementById('main-content'));
        }
    });
}

async function showNewBoardTemplateModal() {
    // First, get existing boards to offer "from board" option
    let boards = [];
    try {
        const res = await api.get('/boards');
        boards = res.data.owned || [];
    } catch (e) {}
    
    showModal({
        title: 'Create Board Template',
        content: `
            <form id="new-board-template-form">
                ${boards.length > 0 ? `
                    <div class="form-group">
                        <label class="form-label">Create from existing board (optional)</label>
                        <select name="from_board" class="form-input">
                            <option value="">Start from scratch</option>
                            ${boards.map(b => `<option value="${b.id}">${escapeHtml(b.title)}</option>`).join('')}
                        </select>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label class="form-label">Template Name *</label>
                    <input type="text" name="name" class="form-input" placeholder="e.g., Sprint Board" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" style="min-height: 60px;" placeholder="Describe this template..."></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="template-color-picker">
                        <button type="button" class="color-swatch active" data-color="blue" style="background: #6366F1"></button>
                        <button type="button" class="color-swatch" data-color="green" style="background: #10B981"></button>
                        <button type="button" class="color-swatch" data-color="purple" style="background: #8B5CF6"></button>
                        <button type="button" class="color-swatch" data-color="pink" style="background: #EC4899"></button>
                        <button type="button" class="color-swatch" data-color="yellow" style="background: #F59E0B"></button>
                        <button type="button" class="color-swatch" data-color="red" style="background: #EF4444"></button>
                    </div>
                    <input type="hidden" name="color_theme" value="blue">
                </div>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('new-board-template-form');
            const formData = new FormData(form);
            const fromBoard = formData.get('from_board');
            
            if (fromBoard) {
                await api.post(`/templates/boards/from-board/${fromBoard}`, {
                    name: formData.get('name'),
                    description: formData.get('description')
                });
            } else {
                await api.post('/templates/boards', {
                    name: formData.get('name'),
                    description: formData.get('description'),
                    color_theme: formData.get('color_theme'),
                    template_data: {
                        stages: [
                            { name: 'To Do', position: 0, color: '#6B7280' },
                            { name: 'In Progress', position: 1, color: '#3B82F6' },
                            { name: 'Done', position: 2, color: '#10B981' }
                        ],
                        tasks: []
                    }
                });
            }
            
            toast.success('Template created');
            hideModal();
            renderTemplates(document.getElementById('main-content'));
        }
    });
    
    setupColorPicker('template-color-picker', 'color_theme');
}

async function showNewListTemplateModal() {
    // Get existing lists
    let lists = [];
    try {
        const res = await api.get('/lists');
        lists = res.data || [];
    } catch (e) {}
    
    showModal({
        title: 'Create List Template',
        content: `
            <form id="new-list-template-form">
                ${lists.length > 0 ? `
                    <div class="form-group">
                        <label class="form-label">Create from existing list (optional)</label>
                        <select name="from_list" class="form-input">
                            <option value="">Start from scratch</option>
                            ${lists.map(l => `<option value="${l.id}">${escapeHtml(l.title)}</option>`).join('')}
                        </select>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label class="form-label">Template Name *</label>
                    <input type="text" name="name" class="form-input" placeholder="e.g., Weekly Groceries" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" style="min-height: 60px;" placeholder="Describe this template..."></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="list-template-color-picker">
                        <button type="button" class="color-swatch active" data-color="blue" style="background: #6366F1"></button>
                        <button type="button" class="color-swatch" data-color="green" style="background: #10B981"></button>
                        <button type="button" class="color-swatch" data-color="purple" style="background: #8B5CF6"></button>
                        <button type="button" class="color-swatch" data-color="pink" style="background: #EC4899"></button>
                        <button type="button" class="color-swatch" data-color="yellow" style="background: #F59E0B"></button>
                        <button type="button" class="color-swatch" data-color="red" style="background: #EF4444"></button>
                    </div>
                    <input type="hidden" name="color_theme" value="blue">
                </div>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('new-list-template-form');
            const formData = new FormData(form);
            const fromList = formData.get('from_list');
            
            if (fromList) {
                await api.post(`/templates/lists/from-list/${fromList}`, {
                    name: formData.get('name'),
                    description: formData.get('description')
                });
            } else {
                await api.post('/templates/lists', {
                    name: formData.get('name'),
                    description: formData.get('description'),
                    color_theme: formData.get('color_theme'),
                    template_data: { items: [] }
                });
            }
            
            toast.success('Template created');
            hideModal();
            renderTemplates(document.getElementById('main-content'));
        }
    });
    
    setupColorPicker('list-template-color-picker', 'color_theme');
}

function getThemeColor(theme) {
    const colors = {
        blue: '#6366F1',
        green: '#10B981',
        purple: '#8B5CF6',
        pink: '#EC4899',
        yellow: '#F59E0B',
        red: '#EF4444',
        gray: '#6B7280'
    };
    return colors[theme] || colors.blue;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
