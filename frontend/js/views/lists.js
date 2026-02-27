import { api } from '../api.js';
import { setState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderLists(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">My Lists</h2>
                <p class="page-subtitle">Checklists for shopping, tasks, and more</p>
            </div>
            <button id="new-list-btn" class="btn btn-primary">
                <span>+</span> New List
            </button>
        </div>
        <div class="loading"><div class="spinner"></div></div>
    `;
    
    try {
        const response = await api.get('/lists');
        const lists = response.data;
        setState({ lists });
        
        let html = `
            <div class="page-header">
                <div>
                    <h2 class="page-title">My Lists</h2>
                    <p class="page-subtitle">Checklists for shopping, tasks, and more</p>
                </div>
                <button id="new-list-btn" class="btn btn-primary">
                    <span>+</span> New List
                </button>
            </div>
        `;
        
        if (lists.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-state-icon">☑️</div>
                    <h3 class="empty-state-title">No lists yet</h3>
                    <p class="empty-state-description">Create a list for shopping, groceries, or anything else you need to track</p>
                </div>
            `;
        } else {
            html += `<div class="cards-grid">`;
            lists.forEach(list => {
                const itemCount = list.item_count || 0;
                html += `
                    <div class="card list-card" data-id="${list.id}">
                        <div class="card-header">
                            <span class="card-title">${escapeHtml(list.title)}</span>
                            <span class="color-badge" style="background-color: ${getThemeColor(list.color_theme)}"></span>
                        </div>
                        <div class="card-meta">
                            <span>☑️ Checklist</span>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }
        
        container.innerHTML = html;
        
        document.getElementById('new-list-btn').addEventListener('click', () => showNewListModal());
        
        document.querySelectorAll('.list-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.hash = `#/lists/${card.dataset.id}`;
            });
        });
        
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
                    <label class="form-label">Title *</label>
                    <input type="text" name="title" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Color Theme</label>
                    <select name="color_theme" class="form-input">
                        <option value="gray">Gray</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="purple">Purple</option>
                        <option value="pink">Pink</option>
                        <option value="yellow">Yellow</option>
                    </select>
                </div>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('new-list-form');
            const formData = new FormData(form);
            
            await api.post('/lists', {
                title: formData.get('title'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('List created');
            hideModal();
            renderLists(document.getElementById('main-content'));
        }
    });
}

function getThemeColor(theme) {
    const colors = {
        blue: '#3B82F6',
        green: '#10B981',
        purple: '#8B5CF6',
        pink: '#EC4899',
        yellow: '#F59E0B',
        red: '#EF4444',
        gray: '#6B7280'
    };
    return colors[theme] || colors.gray;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
