import { api } from '../api.js';
import { setState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData, setupColorPicker, getThemeColor, escapeHtml } from '../app.js';

export async function renderProjects(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Projects</h1>
            <button class="btn btn-primary" id="create-project-btn">
                + New Project
            </button>
        </div>
        <div id="projects-container" class="projects-grid">
            <div class="loading">Loading projects...</div>
        </div>
    `;
    
    await loadProjects();
    
    document.getElementById('create-project-btn')?.addEventListener('click', showCreateProjectModal);
}

async function loadProjects() {
    try {
        const response = await api.get('/projects');
        const owned = response.data.owned || [];
        const shared = response.data.shared || [];
        
        setState({ projects: [...owned, ...shared] });
        renderProjectsGrid(owned, shared);
    } catch (err) {
        document.getElementById('projects-container').innerHTML = `
            <div class="error-message">Failed to load projects</div>
        `;
    }
}

function renderProjectsGrid(owned, shared) {
    const container = document.getElementById('projects-container');
    
    if (owned.length === 0 && shared.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📁</div>
                <h2>No projects yet</h2>
                <p>Create your first project to get started with boards and lists.</p>
                <button class="btn btn-primary" id="empty-create-btn">Create Project</button>
            </div>
        `;
        document.getElementById('empty-create-btn')?.addEventListener('click', showCreateProjectModal);
        return;
    }
    
    let html = '';
    
    if (owned.length > 0) {
        html += `
            <div class="projects-section">
                <h2 class="section-title">My Projects</h2>
                <div class="projects-list">
                    ${owned.map(p => renderProjectCard(p, true)).join('')}
                </div>
            </div>
        `;
    }
    
    if (shared.length > 0) {
        html += `
            <div class="projects-section">
                <h2 class="section-title">Shared with Me</h2>
                <div class="projects-list">
                    ${shared.map(p => renderProjectCard(p, false)).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function renderProjectCard(project, isOwner) {
    return `
        <a href="#/projects/${project.id}" class="project-card" style="border-left-color: ${getThemeColor(project.color_theme)}">
            <div class="project-card-header">
                <h3 class="project-card-title">${escapeHtml(project.name)}</h3>
                ${!isOwner ? '<span class="shared-badge">Shared</span>' : ''}
            </div>
            <p class="project-card-desc">${escapeHtml(project.description || '')}</p>
            <div class="project-card-stats">
                <span>${project.board_count || 0} boards</span>
                <span>${project.list_count || 0} lists</span>
            </div>
        </a>
    `;
}

function showCreateProjectModal() {
    showModal({
        title: 'Create New Project',
        content: `
            <form id="create-project-form">
                <div class="form-group">
                    <label class="form-label">Project Name *</label>
                    <input type="text" name="name" class="form-input" placeholder="e.g., My Project" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input form-textarea" placeholder="What is this project about?"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="create-project-color-picker">
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
            const form = document.getElementById('create-project-form');
            const formData = new FormData(form);
            
            const result = await api.post('/projects', {
                name: formData.get('name'),
                description: formData.get('description'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('Project created');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/projects/${result.data.id}`;
        }
    });
    
    setupColorPicker('create-project-color-picker', 'color_theme');
}
