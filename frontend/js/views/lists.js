import { api } from '../api.js';
import { setState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData, setupColorPicker } from '../app.js';

export async function renderLists(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">My Lists</h2>
                <p class="page-subtitle">Checklists for shopping, tasks, and more</p>
            </div>
        </div>
        <div class="loading"><div class="spinner"></div></div>
    `;
    
    try {
        const response = await api.get('/lists');
        const lists = response.data || [];
        setState({ lists });
        
        if (lists.length === 0) {
            container.innerHTML = `
                <div class="page-header">
                    <div>
                        <h2 class="page-title">My Lists</h2>
                        <p class="page-subtitle">Checklists for shopping, tasks, and more</p>
                    </div>
                </div>
                <div class="empty-state">
                    <div class="empty-state-icon">☑️</div>
                    <h3 class="empty-state-title">No Lists Yet</h3>
                    <p class="empty-state-description">Create a checklist for shopping, groceries, or anything else you need to track</p>
                    <button id="create-first-list-btn" class="btn btn-primary btn-lg" style="margin-top: 1.5rem;">
                        <span>+</span> Create Your First List
                    </button>
                </div>
            `;
            
            document.getElementById('create-first-list-btn')?.addEventListener('click', showNewListModal);
        } else {
            container.innerHTML = `
                <div class="page-header">
                    <div>
                        <h2 class="page-title">My Lists</h2>
                        <p class="page-subtitle">You have ${lists.length} checklist${lists.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="empty-state" style="padding-top: 3rem;">
                    <div class="empty-state-icon">👈</div>
                    <h3 class="empty-state-title">Select a List</h3>
                    <p class="empty-state-description">Click on a list in the sidebar to view and manage its items</p>
                </div>
            `;
        }
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading lists: ${err.message}</div>`;
    }
}

function showNewListModal() {
    showModal({
        title: 'Create New List',
        content: `
            <form id="new-list-form">
                <div class="form-group">
                    <label class="form-label">List Name *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Shopping List" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker-grid" id="new-list-color">
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
            const form = document.getElementById('new-list-form');
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
    
    setupColorPicker('new-list-color', 'color_theme');
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
