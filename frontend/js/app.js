import { state, setState, getState } from './state.js';
import { api } from './api.js';
import { router } from './router.js';
import { showModal, hideModal } from './components/modal.js';
import { toast } from './components/toast.js';

// Initialize app
async function init() {
    // Check authentication
    try {
        const user = await api.get('/auth/me');
        setState({ user: user.data, isAuthenticated: true });
        showSidebar();
        await loadSidebarData();
    } catch (err) {
        setState({ user: null, isAuthenticated: false });
        hideSidebar();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Start router
    router.init();
}

async function loadSidebarData() {
    try {
        const projectsRes = await api.get('/projects');
        
        const ownedProjects = projectsRes.data.owned || [];
        const sharedProjects = projectsRes.data.shared || [];
        const allProjects = [...ownedProjects, ...sharedProjects];
        
        setState({ projects: allProjects });
        renderSidebarProjects(allProjects);
    } catch (err) {
        console.error('Failed to load sidebar data:', err);
    }
}

function renderSidebarProjects(projects) {
    const container = document.getElementById('projects-nav-list');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `<div class="nav-empty">No projects yet</div>`;
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="nav-project" data-project-id="${project.id}">
            <div class="nav-project-header">
                <button class="nav-project-toggle" aria-expanded="false">
                    <span class="nav-project-icon">▶</span>
                </button>
                <a href="#/projects/${project.id}" class="nav-item nav-project-link" data-id="${project.id}" data-type="project">
                    <span class="nav-item-color" style="background: ${getThemeColor(project.color_theme)}"></span>
                    <span class="nav-item-label">${escapeHtml(project.name)}</span>
                </a>
            </div>
            <div class="nav-project-contents hidden">
                <div class="nav-subgroup">
                    <div class="nav-subgroup-header">
                        <span>Boards</span>
                        <button class="nav-add-btn" data-action="add-board" data-project-id="${project.id}">+</button>
                    </div>
                    <div class="nav-subgroup-items" data-boards="${project.id}">
                        <div class="nav-loading">Loading...</div>
                    </div>
                </div>
                <div class="nav-subgroup">
                    <div class="nav-subgroup-header">
                        <span>Lists</span>
                        <button class="nav-add-btn" data-action="add-list" data-project-id="${project.id}">+</button>
                    </div>
                    <div class="nav-subgroup-items" data-lists="${project.id}">
                        <div class="nav-loading">Loading...</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add toggle listeners
    container.querySelectorAll('.nav-project-toggle').forEach(toggle => {
        toggle.addEventListener('click', async (e) => {
            const projectEl = toggle.closest('.nav-project');
            const contents = projectEl.querySelector('.nav-project-contents');
            const icon = toggle.querySelector('.nav-project-icon');
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            
            toggle.setAttribute('aria-expanded', !isExpanded);
            contents.classList.toggle('hidden');
            icon.textContent = isExpanded ? '▶' : '▼';
            
            if (!isExpanded) {
                const projectId = projectEl.dataset.projectId;
                await loadProjectContents(projectId);
            }
        });
    });
    
    // Add board/list button listeners
    container.querySelectorAll('.nav-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const projectId = btn.dataset.projectId;
            if (action === 'add-board') {
                showQuickBoardModal(projectId);
            } else if (action === 'add-list') {
                showQuickListModal(projectId);
            }
        });
    });
    
    updateActiveNavItem();
}

async function loadProjectContents(projectId) {
    try {
        const projectRes = await api.get(`/projects/${projectId}`);
        const project = projectRes.data;
        
        const boardsContainer = document.querySelector(`[data-boards="${projectId}"]`);
        const listsContainer = document.querySelector(`[data-lists="${projectId}"]`);
        
        if (boardsContainer) {
            if (project.boards && project.boards.length > 0) {
                boardsContainer.innerHTML = project.boards.map(board => `
                    <a href="#/projects/${projectId}/boards/${board.id}" class="nav-item nav-subitem" data-id="${board.id}" data-type="board">
                        <span class="nav-item-color" style="background: ${getThemeColor(board.color_theme)}"></span>
                        <span class="nav-item-label">${escapeHtml(board.title)}</span>
                    </a>
                `).join('');
            } else {
                boardsContainer.innerHTML = `<div class="nav-empty-small">No boards</div>`;
            }
        }
        
        if (listsContainer) {
            if (project.lists && project.lists.length > 0) {
                listsContainer.innerHTML = project.lists.map(list => `
                    <a href="#/projects/${projectId}/lists/${list.id}" class="nav-item nav-subitem" data-id="${list.id}" data-type="list">
                        <span class="nav-item-icon">☑️</span>
                        <span class="nav-item-label">${escapeHtml(list.title)}</span>
                    </a>
                `).join('');
            } else {
                listsContainer.innerHTML = `<div class="nav-empty-small">No lists</div>`;
            }
        }
        
        updateActiveNavItem();
    } catch (err) {
        console.error('Failed to load project contents:', err);
    }
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

function showSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileHeader = document.getElementById('mobile-header');
    
    sidebar.classList.remove('hidden');
    mobileHeader.classList.remove('hidden');
    
    const user = getState().user;
    if (user) {
        const avatar = document.getElementById('user-avatar');
        if (user.avatar_url) {
            avatar.src = user.avatar_url;
        } else {
            avatar.style.background = 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)';
        }
        document.getElementById('user-name').textContent = user.name || 'User';
    }
    
    updateActiveNavItem();
}

function hideSidebar() {
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('mobile-header').classList.add('hidden');
}

function updateActiveNavItem() {
    const hash = window.location.hash || '#/projects';
    const items = document.querySelectorAll('.nav-item');
    
    items.forEach(item => {
        item.classList.remove('active');
        if (hash === item.getAttribute('href')) {
            item.classList.add('active');
        }
    });
}

function showQuickProjectModal() {
    showModal({
        title: 'Create New Project',
        content: `
            <form id="quick-project-form">
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
                    <div class="color-picker-grid" id="project-color-picker">
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
            const form = document.getElementById('quick-project-form');
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
    
    setupColorPicker('project-color-picker', 'color_theme');
}

function showQuickBoardModal(projectId) {
    showModal({
        title: 'Create New Board',
        content: `
            <form id="quick-board-form">
                <div class="form-group">
                    <label class="form-label">Board Name *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Sprint 1" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="board-color-picker">
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
            const form = document.getElementById('quick-board-form');
            const formData = new FormData(form);
            
            const result = await api.post(`/projects/${projectId}/boards`, {
                title: formData.get('title'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('Board created');
            hideModal();
            await loadProjectContents(projectId);
            window.location.hash = `#/projects/${projectId}/boards/${result.data.id}`;
        }
    });
    
    setupColorPicker('board-color-picker', 'color_theme');
}

function showQuickListModal(projectId) {
    showModal({
        title: 'Create New List',
        content: `
            <form id="quick-list-form">
                <div class="form-group">
                    <label class="form-label">List Name *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Shopping List" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="list-color-picker">
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
            const form = document.getElementById('quick-list-form');
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
    
    setupColorPicker('list-color-picker', 'color_theme');
}

function setupColorPicker(containerId, inputName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const form = container.closest('form');
            if (form) {
                form.querySelector(`input[name="${inputName}"]`).value = swatch.dataset.color;
            }
        });
    });
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await api.post('/auth/logout');
        setState({ user: null, isAuthenticated: false });
        hideSidebar();
        window.location.hash = '#/login';
    });
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    mobileMenuBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });
    
    overlay?.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });
    
    // Sidebar add project button
    document.getElementById('add-project-sidebar-btn')?.addEventListener('click', showQuickProjectModal);
    
    // Close mobile menu on nav item click
    document.addEventListener('click', (e) => {
        if (e.target.closest('.nav-item')) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    });
    
    // Hash change
    window.addEventListener('hashchange', () => {
        router.handleRoute();
        updateActiveNavItem();
    });
}

// Export for use in views
export { loadSidebarData, loadProjectContents, setupColorPicker, getThemeColor, escapeHtml };

// Start the app
document.addEventListener('DOMContentLoaded', init);
