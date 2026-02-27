import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData, loadProjectContents, setupColorPicker, getThemeColor, escapeHtml } from '../app.js';

export async function renderProject(container, params) {
    const projectId = params.projectId;
    
    container.innerHTML = `
        <div class="loading">Loading project...</div>
    `;
    
    try {
        const response = await api.get(`/projects/${projectId}`);
        const project = response.data;
        
        setState({ currentProject: project });
        renderProjectContent(container, project);
    } catch (err) {
        container.innerHTML = `
            <div class="error-message">Failed to load project</div>
        `;
    }
}

function renderProjectContent(container, project) {
    const isOwner = project.owner_id === getState().user?.id;
    
    container.innerHTML = `
        <div class="project-page">
            <div class="page-header">
                <div class="page-header-left">
                    <span class="project-color-dot" style="background: ${getThemeColor(project.color_theme)}"></span>
                    <h1 class="page-title">${escapeHtml(project.name)}</h1>
                </div>
                <div class="page-header-actions">
                    <button class="btn btn-secondary" id="save-as-template-btn">📋 Save as Template</button>
                    ${isOwner ? `
                        <button class="btn btn-secondary" id="share-project-btn">Share</button>
                        <button class="btn btn-secondary" id="edit-project-btn">Settings</button>
                    ` : ''}
                </div>
            </div>
            
            ${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ''}
            
            <div class="project-sections">
                <div class="project-section">
                    <div class="section-header">
                        <h2>Boards</h2>
                        <button class="btn btn-primary btn-sm" id="add-board-btn">+ Add Board</button>
                    </div>
                    <div class="items-grid" id="boards-grid">
                        ${renderBoards(project.boards || [], project.id)}
                    </div>
                </div>
                
                <div class="project-section">
                    <div class="section-header">
                        <h2>Lists</h2>
                        <button class="btn btn-primary btn-sm" id="add-list-btn">+ Add List</button>
                    </div>
                    <div class="items-grid" id="lists-grid">
                        ${renderLists(project.lists || [], project.id)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Event listeners
    document.getElementById('add-board-btn')?.addEventListener('click', () => showAddBoardModal(project.id));
    document.getElementById('add-list-btn')?.addEventListener('click', () => showAddListModal(project.id));
    document.getElementById('share-project-btn')?.addEventListener('click', () => showShareModal(project));
    document.getElementById('edit-project-btn')?.addEventListener('click', () => showEditProjectModal(project));
    document.getElementById('save-as-template-btn')?.addEventListener('click', () => showSaveAsProjectTemplateModal(project));
}

function renderBoards(boards, projectId) {
    if (boards.length === 0) {
        return `<div class="empty-small">No boards yet. Create one to get started.</div>`;
    }
    
    return boards.map(board => `
        <a href="#/projects/${projectId}/boards/${board.id}" class="item-card" style="border-top-color: ${getThemeColor(board.color_theme)}">
            <h3 class="item-card-title">${escapeHtml(board.title)}</h3>
            <p class="item-card-desc">${escapeHtml(board.description || '')}</p>
        </a>
    `).join('');
}

function renderLists(lists, projectId) {
    if (lists.length === 0) {
        return `<div class="empty-small">No lists yet. Create one to get started.</div>`;
    }
    
    return lists.map(list => `
        <a href="#/projects/${projectId}/lists/${list.id}" class="item-card" style="border-top-color: ${getThemeColor(list.color_theme)}">
            <h3 class="item-card-title">☑️ ${escapeHtml(list.title)}</h3>
        </a>
    `).join('');
}

function showAddBoardModal(projectId) {
    showModal({
        title: 'Create New Board',
        content: `
            <form id="add-board-form">
                <div class="form-group">
                    <label class="form-label">Board Name *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Sprint 1" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input form-textarea" placeholder="Board description"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="add-board-color-picker">
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
            const form = document.getElementById('add-board-form');
            const formData = new FormData(form);
            
            const result = await api.post(`/projects/${projectId}/boards`, {
                title: formData.get('title'),
                description: formData.get('description'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('Board created');
            hideModal();
            await loadProjectContents(projectId);
            window.location.hash = `#/projects/${projectId}/boards/${result.data.id}`;
        }
    });
    
    setupColorPicker('add-board-color-picker', 'color_theme');
}

function showAddListModal(projectId) {
    showModal({
        title: 'Create New List',
        content: `
            <form id="add-list-form">
                <div class="form-group">
                    <label class="form-label">List Name *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Shopping List" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="add-list-color-picker">
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
            const form = document.getElementById('add-list-form');
            const formData = new FormData(form);
            
            const result = await api.post(`/projects/${projectId}/lists`, {
                title: formData.get('title'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('List created');
            hideModal();
            await loadProjectContents(projectId);
            window.location.hash = `#/projects/${projectId}/lists/${result.data.id}`;
        }
    });
    
    setupColorPicker('add-list-color-picker', 'color_theme');
}

function showShareModal(project) {
    showModal({
        title: `Share "${project.name}"`,
        content: `
            <form id="share-project-form">
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" name="email" class="form-input" placeholder="user@example.com" required>
                </div>
                <p class="form-help">The user will have full access to all boards and lists in this project.</p>
            </form>
            <div id="shares-list" class="shares-list">Loading...</div>
        `,
        onSubmit: async () => {
            const form = document.getElementById('share-project-form');
            const email = form.email.value;
            
            await api.post(`/projects/${project.id}/shares`, { email });
            
            toast.success('Project shared');
            hideModal();
        }
    });
    
    // Load existing shares
    loadShares(project.id);
}

async function loadShares(projectId) {
    try {
        const response = await api.get(`/projects/${projectId}/shares`);
        const shares = response.data || [];
        
        const container = document.getElementById('shares-list');
        if (shares.length === 0) {
            container.innerHTML = `<div class="empty-small">Not shared with anyone yet.</div>`;
            return;
        }
        
        container.innerHTML = `
            <h4>Shared with:</h4>
            ${shares.map(share => `
                <div class="share-item">
                    <span>${escapeHtml(share.user?.email || 'Unknown')}</span>
                    <button class="btn btn-danger btn-sm" data-remove-share="${share.user_id}">Remove</button>
                </div>
            `).join('')}
        `;
        
        container.querySelectorAll('[data-remove-share]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.removeShare;
                await api.delete(`/projects/${projectId}/shares/${userId}`);
                toast.success('Share removed');
                loadShares(projectId);
            });
        });
    } catch (err) {
        console.error('Failed to load shares:', err);
    }
}

function showEditProjectModal(project) {
    showModal({
        title: 'Project Settings',
        content: `
            <form id="edit-project-form">
                <div class="form-group">
                    <label class="form-label">Project Name *</label>
                    <input type="text" name="name" class="form-input" value="${escapeHtml(project.name)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input form-textarea">${escapeHtml(project.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="edit-project-color-picker">
                        <button type="button" class="color-swatch ${project.color_theme === 'blue' ? 'active' : ''}" data-color="blue" style="background: #6366F1"></button>
                        <button type="button" class="color-swatch ${project.color_theme === 'green' ? 'active' : ''}" data-color="green" style="background: #10B981"></button>
                        <button type="button" class="color-swatch ${project.color_theme === 'purple' ? 'active' : ''}" data-color="purple" style="background: #8B5CF6"></button>
                        <button type="button" class="color-swatch ${project.color_theme === 'pink' ? 'active' : ''}" data-color="pink" style="background: #EC4899"></button>
                        <button type="button" class="color-swatch ${project.color_theme === 'yellow' ? 'active' : ''}" data-color="yellow" style="background: #F59E0B"></button>
                        <button type="button" class="color-swatch ${project.color_theme === 'red' ? 'active' : ''}" data-color="red" style="background: #EF4444"></button>
                    </div>
                    <input type="hidden" name="color_theme" value="${project.color_theme}">
                </div>
            </form>
            <div class="modal-danger-zone">
                <h4>Danger Zone</h4>
                <button class="btn btn-danger" id="delete-project-btn">Delete Project</button>
            </div>
        `,
        onSubmit: async () => {
            const form = document.getElementById('edit-project-form');
            const formData = new FormData(form);
            
            await api.put(`/projects/${project.id}`, {
                name: formData.get('name'),
                description: formData.get('description'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('Project updated');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/projects/${project.id}`;
            location.reload();
        }
    });
    
    setupColorPicker('edit-project-color-picker', 'color_theme');
    
    document.getElementById('delete-project-btn')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this project? This will delete all boards, lists, and tasks.')) {
            await api.delete(`/projects/${project.id}`);
            toast.success('Project deleted');
            hideModal();
            await loadSidebarData();
            window.location.hash = '#/projects';
        }
    });
}

function showSaveAsProjectTemplateModal(project) {
    showModal({
        title: 'Save Project as Template',
        content: `
            <form id="save-project-template-form">
                <div class="form-group">
                    <label class="form-label">Template Name *</label>
                    <input type="text" name="name" class="form-input" value="${escapeHtml(project.name)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input form-textarea" placeholder="Describe this template...">${escapeHtml(project.description || '')}</textarea>
                </div>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">
                    This will save all boards and lists in this project as a reusable template.
                </p>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('save-project-template-form');
            const formData = new FormData(form);
            
            await api.post(`/templates/projects/from-project/${project.id}`, {
                name: formData.get('name'),
                description: formData.get('description')
            });
            
            toast.success('Project saved as template');
            hideModal();
        }
    });
}
