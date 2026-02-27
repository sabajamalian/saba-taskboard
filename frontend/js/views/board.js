import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';

export async function renderBoard(container, params) {
    const boardId = params.id;
    
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    
    try {
        const [boardRes, tasksRes] = await Promise.all([
            api.get(`/boards/${boardId}`),
            api.get(`/boards/${boardId}/tasks`)
        ]);
        
        const board = boardRes.data;
        const tasks = tasksRes.data;
        setState({ currentBoard: board });
        
        const stages = board.stages || [];
        
        let html = `
            <div class="board-header">
                <div>
                    <a href="#/boards" style="color: var(--secondary); text-decoration: none;">← Back to boards</a>
                    <h2 style="margin-top: 0.5rem;">${escapeHtml(board.title)}</h2>
                </div>
                <button id="add-task-btn" class="btn btn-primary">+ Add Task</button>
            </div>
            <div class="board-columns">
        `;
        
        stages.forEach(stage => {
            const stageTasks = tasks.filter(t => t.stage_id === stage.id);
            html += `
                <div class="column" data-stage-id="${stage.id}">
                    <div class="column-header">
                        <span class="column-title">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${stage.color}; display: inline-block;"></span>
                            ${escapeHtml(stage.name)}
                        </span>
                        <span class="column-count">${stageTasks.length}</span>
                    </div>
                    <div class="task-list" data-stage-id="${stage.id}">
                        ${stageTasks.map(task => renderTaskCard(task)).join('')}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
        // Event listeners
        document.getElementById('add-task-btn').addEventListener('click', () => showNewTaskModal(boardId, stages));
        
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', () => {
                const task = tasks.find(t => t.id === parseInt(card.dataset.id));
                showTaskModal(task, boardId, stages);
            });
        });
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading board: ${err.message}</div>`;
    }
}

function renderTaskCard(task) {
    const dueBadge = task.due_date ? `
        <span class="task-due ${getDueClass(task.due_date)}">
            📅 ${formatDate(task.due_date)}
        </span>
    ` : '';
    
    return `
        <div class="task-card" data-id="${task.id}" style="border-left-color: ${task.dynamic_color || '#3B82F6'}">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">
                ${dueBadge}
            </div>
        </div>
    `;
}

function showNewTaskModal(boardId, stages) {
    showModal({
        title: 'Add Task',
        content: `
            <form id="new-task-form">
                <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" name="title" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Stage</label>
                    <select name="stage_id" class="form-input">
                        ${stages.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" name="due_date" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Start Date</label>
                    <input type="date" name="scheduled_start" class="form-input">
                </div>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('new-task-form');
            const formData = new FormData(form);
            
            await api.post(`/boards/${boardId}/tasks`, {
                title: formData.get('title'),
                description: formData.get('description'),
                stage_id: parseInt(formData.get('stage_id')),
                due_date: formData.get('due_date') || null,
                scheduled_start: formData.get('scheduled_start') || null
            });
            
            hideModal();
            renderBoard(document.getElementById('main-content'), { id: boardId });
        }
    });
}

function showTaskModal(task, boardId, stages) {
    showModal({
        title: 'Edit Task',
        content: `
            <form id="edit-task-form">
                <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" name="title" class="form-input" value="${escapeHtml(task.title)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input">${escapeHtml(task.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Stage</label>
                    <select name="stage_id" class="form-input">
                        ${stages.map(s => `<option value="${s.id}" ${s.id === task.stage_id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" name="due_date" class="form-input" value="${task.due_date || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Start Date</label>
                    <input type="date" name="scheduled_start" class="form-input" value="${task.scheduled_start || ''}">
                </div>
            </form>
            <button id="delete-task-btn" class="btn btn-danger" style="margin-top: 1rem;">Delete Task</button>
        `,
        onSubmit: async () => {
            const form = document.getElementById('edit-task-form');
            const formData = new FormData(form);
            const newStageId = parseInt(formData.get('stage_id'));
            
            // Update task
            await api.put(`/boards/${boardId}/tasks/${task.id}`, {
                title: formData.get('title'),
                description: formData.get('description'),
                due_date: formData.get('due_date') || null,
                scheduled_start: formData.get('scheduled_start') || null
            });
            
            // Move if stage changed
            if (newStageId !== task.stage_id) {
                await api.put(`/boards/${boardId}/tasks/${task.id}/move`, { stage_id: newStageId });
            }
            
            hideModal();
            renderBoard(document.getElementById('main-content'), { id: boardId });
        }
    });
    
    document.getElementById('delete-task-btn').addEventListener('click', async () => {
        if (confirm('Delete this task?')) {
            await api.delete(`/boards/${boardId}/tasks/${task.id}`);
            hideModal();
            renderBoard(document.getElementById('main-content'), { id: boardId });
        }
    });
}

function getDueClass(dateStr) {
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return 'overdue';
    if (diff <= 1) return 'soon';
    return '';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
