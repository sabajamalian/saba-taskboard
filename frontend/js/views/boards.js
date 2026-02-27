import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function renderBoards(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">My Boards</h2>
                <p class="page-subtitle">Organize your projects with kanban boards</p>
            </div>
            <button id="new-board-btn" class="btn btn-primary">
                <span>+</span> New Board
            </button>
        </div>
        <div class="loading"><div class="spinner"></div></div>
    `;
    
    try {
        const response = await api.get('/boards');
        setState({ boards: response.data.owned });
        
        const boards = response.data.owned;
        const sharedBoards = response.data.shared;
        
        let html = `
            <div class="page-header">
                <div>
                    <h2 class="page-title">My Boards</h2>
                    <p class="page-subtitle">Organize your projects with kanban boards</p>
                </div>
                <button id="new-board-btn" class="btn btn-primary">
                    <span>+</span> New Board
                </button>
            </div>
        `;
        
        if (boards.length === 0 && sharedBoards.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3 class="empty-state-title">No boards yet</h3>
                    <p class="empty-state-description">Create your first board to start organizing your tasks and projects</p>
                </div>
            `;
        } else {
            if (boards.length > 0) {
                html += `<div class="cards-grid">`;
                boards.forEach(board => {
                    html += renderBoardCard(board);
                });
                html += `</div>`;
            }
            
            if (sharedBoards.length > 0) {
                html += `
                    <h3 style="margin-top: 2.5rem; margin-bottom: 1.25rem; font-size: 1rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Shared with me</h3>
                    <div class="cards-grid">
                `;
                sharedBoards.forEach(board => {
                    html += renderBoardCard(board, true);
                });
                html += `</div>`;
            }
        }
        
        container.innerHTML = html;
        
        // Event listeners
        document.getElementById('new-board-btn').addEventListener('click', () => showNewBoardModal());
        
        document.querySelectorAll('.board-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-actions')) {
                    window.location.hash = `#/boards/${card.dataset.id}`;
                }
            });
        });
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading boards: ${err.message}</div>`;
    }
}

function renderBoardCard(board, isShared = false) {
    return `
        <div class="card board-card" data-id="${board.id}">
            <div class="card-header">
                <span class="card-title">${escapeHtml(board.title)}</span>
                <span class="color-badge" style="background-color: ${getThemeColor(board.color_theme)}"></span>
            </div>
            <p class="card-description">${escapeHtml(board.description || 'No description')}</p>
            <div class="card-meta">
                <span>📋 ${board.stages?.length || 3} stages</span>
                ${isShared ? '<span style="color: var(--primary);">👥 Shared</span>' : ''}
            </div>
        </div>
    `;
}

function showNewBoardModal() {
    showModal({
        title: 'Create New Board',
        content: `
            <form id="new-board-form">
                <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" name="title" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color Theme</label>
                    <select name="color_theme" class="form-input">
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="purple">Purple</option>
                        <option value="pink">Pink</option>
                        <option value="yellow">Yellow</option>
                        <option value="red">Red</option>
                    </select>
                </div>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('new-board-form');
            const formData = new FormData(form);
            
            await api.post('/boards', {
                title: formData.get('title'),
                description: formData.get('description'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('Board created');
            hideModal();
            renderBoards(document.getElementById('main-content'));
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
    return colors[theme] || colors.blue;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
