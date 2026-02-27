import { api } from '../api.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData, setupColorPicker } from '../app.js';

export async function renderTemplates(container) {
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    
    try {
        const [projectTemplates, boardTemplates, listTemplates] = await Promise.all([
            api.get('/templates/projects'),
            api.get('/templates/boards'),
            api.get('/templates/lists')
        ]);
        
        const projectTpls = projectTemplates.data || [];
        const boardTpls = boardTemplates.data || [];
        const listTpls = listTemplates.data || [];
        
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h2 class="page-title">Templates</h2>
                    <p class="page-subtitle">Save projects, boards and lists as templates for quick reuse</p>
                </div>
            </div>
            
            <div class="templates-section">
                <div class="templates-header">
                    <h3 class="templates-title">📁 Project Templates</h3>
                </div>
                <div id="project-templates-grid" class="templates-grid">
                    ${projectTpls.length === 0 ? `
                        <div class="template-empty">
                            <p>No project templates yet. Create one from an existing project using "Save as Template".</p>
                        </div>
                    ` : projectTpls.map(t => renderProjectTemplateCard(t)).join('')}
                </div>
            </div>
            
            <div class="templates-section" style="margin-top: 3rem;">
                <div class="templates-header">
                    <h3 class="templates-title">📋 Board Templates</h3>
                </div>
                <div id="board-templates-grid" class="templates-grid">
                    ${boardTpls.length === 0 ? `
                        <div class="template-empty">
                            <p>No board templates yet. Create one from an existing board using "Save as Template".</p>
                        </div>
                    ` : boardTpls.map(t => renderBoardTemplateCard(t)).join('')}
                </div>
            </div>
            
            <div class="templates-section" style="margin-top: 3rem;">
                <div class="templates-header">
                    <h3 class="templates-title">☑️ List Templates</h3>
                </div>
                <div id="list-templates-grid" class="templates-grid">
                    ${listTpls.length === 0 ? `
                        <div class="template-empty">
                            <p>No list templates yet. Create one from an existing list using "Save as Template".</p>
                        </div>
                    ` : listTpls.map(t => renderListTemplateCard(t)).join('')}
                </div>
            </div>
        `;
        
        // Event listeners
        document.querySelectorAll('.template-card[data-type="project"]').forEach(card => {
            card.addEventListener('click', () => showProjectTemplateActions(projectTpls.find(t => t.id === parseInt(card.dataset.id))));
        });
        
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

function renderProjectTemplateCard(template) {
    const boardCount = template.template_data?.board_template_ids?.length || 0;
    const listCount = template.template_data?.list_template_ids?.length || 0;
    
    return `
        <div class="template-card" data-type="project" data-id="${template.id}">
            <div class="template-card-header">
                <span class="template-icon" style="background: ${getThemeColor(template.color_theme)}">📁</span>
                <h4 class="template-name">${escapeHtml(template.name)}</h4>
            </div>
            <p class="template-description">${escapeHtml(template.description || 'No description')}</p>
            <div class="template-meta">
                <span>${boardCount} board${boardCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>${listCount} list${listCount !== 1 ? 's' : ''}</span>
            </div>
        </div>
    `;
}

function showProjectTemplateActions(template) {
    showModal({
        title: template.name,
        content: `
            <div class="template-actions">
                <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
                    ${escapeHtml(template.description || 'Create a new project from this template')}
                </p>
                
                <form id="apply-project-template-form" style="margin-top: 1rem;">
                    <div class="form-group">
                        <label class="form-label">New Project Name</label>
                        <input type="text" name="name" class="form-input" value="${escapeHtml(template.name)}" required>
                    </div>
                </form>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button id="apply-template-btn" class="btn btn-primary" style="flex: 1;">Create Project</button>
                    <button id="delete-template-btn" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `,
        hideFooter: true
    });
    
    document.getElementById('apply-template-btn')?.addEventListener('click', async () => {
        const name = document.querySelector('input[name="name"]').value;
        try {
            const result = await api.post(`/templates/projects/${template.id}/apply`, { name });
            toast.success('Project created from template');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/projects/${result.data.id}`;
        } catch (err) {
            toast.error('Failed to create project');
        }
    });
    
    document.getElementById('delete-template-btn')?.addEventListener('click', async () => {
        if (confirm('Delete this template?')) {
            await api.delete(`/templates/projects/${template.id}`);
            toast.info('Template deleted');
            hideModal();
            renderTemplates(document.getElementById('main-content'));
        }
    });
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

async function showBoardTemplateActions(template) {
    // Fetch projects for selection
    let projects = [];
    try {
        const res = await api.get('/projects');
        projects = [...(res.data.owned || []), ...(res.data.shared || [])];
    } catch (e) {}
    
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
                        <label class="form-label">Project *</label>
                        <select name="project_id" class="form-input" required>
                            ${projects.length === 0 ? '<option value="">No projects available</option>' :
                              projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Board Name</label>
                        <input type="text" name="title" class="form-input" value="${escapeHtml(template.name)}" required>
                    </div>
                </form>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button id="apply-template-btn" class="btn btn-primary" style="flex: 1;" ${projects.length === 0 ? 'disabled' : ''}>Create Board</button>
                    <button id="delete-template-btn" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `,
        hideFooter: true
    });
    
    document.getElementById('apply-template-btn')?.addEventListener('click', async () => {
        const projectId = document.querySelector('select[name="project_id"]').value;
        const title = document.querySelector('input[name="title"]').value;
        try {
            const result = await api.post(`/templates/boards/${template.id}/apply/${projectId}`, { title });
            toast.success('Board created from template');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/projects/${projectId}/boards/${result.data.id}`;
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

async function showListTemplateActions(template) {
    // Fetch projects for selection
    let projects = [];
    try {
        const res = await api.get('/projects');
        projects = [...(res.data.owned || []), ...(res.data.shared || [])];
    } catch (e) {}
    
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
                        <label class="form-label">Project *</label>
                        <select name="project_id" class="form-input" required>
                            ${projects.length === 0 ? '<option value="">No projects available</option>' :
                              projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New List Name</label>
                        <input type="text" name="title" class="form-input" value="${escapeHtml(template.name)}" required>
                    </div>
                </form>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button id="apply-template-btn" class="btn btn-primary" style="flex: 1;" ${projects.length === 0 ? 'disabled' : ''}>Create List</button>
                    <button id="delete-template-btn" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `,
        hideFooter: true
    });
    
    document.getElementById('apply-template-btn')?.addEventListener('click', async () => {
        const projectId = document.querySelector('select[name="project_id"]').value;
        const title = document.querySelector('input[name="title"]').value;
        try {
            const result = await api.post(`/templates/lists/${template.id}/apply/${projectId}`, { title });
            toast.success('List created from template');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/projects/${projectId}/lists/${result.data.id}`;
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
