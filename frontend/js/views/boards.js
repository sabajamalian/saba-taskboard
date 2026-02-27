import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData, setupColorPicker } from '../app.js';

export async function renderBoards(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2 class="page-title">Welcome to TaskBoard</h2>
                <p class="page-subtitle">Select a board from the sidebar or create a new one</p>
            </div>
        </div>
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3 class="empty-state-title">Select a Board</h3>
            <p class="empty-state-description">Choose a board from the sidebar to view its tasks, or click the + button to create a new board.</p>
            <button id="create-first-board-btn" class="btn btn-primary btn-lg" style="margin-top: 1.5rem;">
                <span>+</span> Create Your First Board
            </button>
        </div>
    `;
    
    try {
        const response = await api.get('/boards');
        const boards = response.data.owned || [];
        const sharedBoards = response.data.shared || [];
        
        setState({ boards });
        
        // If there are boards, show a different welcome
        if (boards.length > 0 || sharedBoards.length > 0) {
            container.innerHTML = `
                <div class="page-header">
                    <div>
                        <h2 class="page-title">Welcome Back!</h2>
                        <p class="page-subtitle">You have ${boards.length} board${boards.length !== 1 ? 's' : ''} ${sharedBoards.length > 0 ? `and ${sharedBoards.length} shared with you` : ''}</p>
                    </div>
                </div>
                <div class="empty-state" style="padding-top: 3rem;">
                    <div class="empty-state-icon">👈</div>
                    <h3 class="empty-state-title">Select a Board</h3>
                    <p class="empty-state-description">Click on a board in the sidebar to view and manage its tasks</p>
                </div>
            `;
        }
        
        document.getElementById('create-first-board-btn')?.addEventListener('click', showNewBoardModal);
        
    } catch (err) {
        // Keep showing the create button even if API fails
        document.getElementById('create-first-board-btn')?.addEventListener('click', showNewBoardModal);
    }
}

function showNewBoardModal() {
    showModal({
        title: 'Create New Board',
        content: `
            <form id="new-board-form">
                <div class="form-group">
                    <label class="form-label">Board Name *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Project Alpha" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" style="min-height: 80px;" placeholder="What is this board for?"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color Theme</label>
                    <div class="color-picker-grid" id="new-board-color">
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
            const form = document.getElementById('new-board-form');
            const formData = new FormData(form);
            
            const result = await api.post('/boards', {
                title: formData.get('title'),
                description: formData.get('description'),
                color_theme: formData.get('color_theme')
            });
            
            toast.success('Board created');
            hideModal();
            await loadSidebarData();
            window.location.hash = `#/boards/${result.data.id}`;
        }
    });
    
    setupColorPicker('new-board-color', 'color_theme');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
