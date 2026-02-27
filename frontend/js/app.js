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
        const [boardsRes, listsRes] = await Promise.all([
            api.get('/boards'),
            api.get('/lists')
        ]);
        
        const boards = boardsRes.data.owned || [];
        const lists = listsRes.data || [];
        
        renderSidebarBoards(boards);
        renderSidebarLists(lists);
    } catch (err) {
        console.error('Failed to load sidebar data:', err);
    }
}

function renderSidebarBoards(boards) {
    const container = document.getElementById('boards-nav-list');
    if (!container) return;
    
    if (boards.length === 0) {
        container.innerHTML = `<div class="nav-empty">No boards yet</div>`;
        return;
    }
    
    container.innerHTML = boards.map(board => `
        <a href="#/boards/${board.id}" class="nav-item" data-id="${board.id}" data-type="board">
            <span class="nav-item-color" style="background: ${getThemeColor(board.color_theme)}"></span>
            <span class="nav-item-label">${escapeHtml(board.title)}</span>
        </a>
    `).join('');
    
    updateActiveNavItem();
}

function renderSidebarLists(lists) {
    const container = document.getElementById('lists-nav-list');
    if (!container) return;
    
    if (lists.length === 0) {
        container.innerHTML = `<div class="nav-empty">No lists yet</div>`;
        return;
    }
    
    container.innerHTML = lists.map(list => `
        <a href="#/lists/${list.id}" class="nav-item" data-id="${list.id}" data-type="list">
            <span class="nav-item-icon">☑️</span>
            <span class="nav-item-label">${escapeHtml(list.title)}</span>
        </a>
    `).join('');
    
    updateActiveNavItem();
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
    const hash = window.location.hash || '#/boards';
    const items = document.querySelectorAll('.nav-item');
    
    items.forEach(item => {
        item.classList.remove('active');
        if (hash === item.getAttribute('href')) {
            item.classList.add('active');
        }
    });
}

function showQuickBoardModal() {
    showModal({
        title: 'Create New Board',
        content: `
            <form id="quick-board-form">
                <div class="form-group">
                    <label class="form-label">Board Name *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Project Alpha" required>
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
            
            const result = await api.post('/boards', {
                title: formData.get('title'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('Board created');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/boards/${result.data.id}`;
        }
    });
    
    setupColorPicker('board-color-picker', 'color_theme');
}

function showQuickListModal() {
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
            
            const result = await api.post('/lists', {
                title: formData.get('title'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('List created');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/lists/${result.data.id}`;
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
    
    // Sidebar add buttons
    document.getElementById('add-board-sidebar-btn')?.addEventListener('click', showQuickBoardModal);
    document.getElementById('add-list-sidebar-btn')?.addEventListener('click', showQuickListModal);
    
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
export { loadSidebarData, setupColorPicker };

// Start the app
document.addEventListener('DOMContentLoaded', init);
