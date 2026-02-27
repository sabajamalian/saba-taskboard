import { api } from '../api.js';
import { setState, getState } from '../state.js';
import { showModal, hideModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { loadSidebarData, setupColorPicker } from '../app.js';

let currentBoardId = null;

export async function renderBoard(container, params) {
    const boardId = params.id;
    currentBoardId = boardId;
    
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
                    <h2 style="margin-bottom: 0.25rem;">${escapeHtml(board.title)}</h2>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">${escapeHtml(board.description || 'No description')}</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="edit-board-btn" class="btn btn-secondary">⚙️ Settings</button>
                    <button id="add-task-btn" class="btn btn-primary">
                        <span>+</span> Add Task
                    </button>
                </div>
            </div>
            <div class="board-columns">
        `;
        
        stages.forEach(stage => {
            const stageTasks = tasks.filter(t => t.stage_id === stage.id);
            html += `
                <div class="column" data-stage-id="${stage.id}">
                    <div class="column-header">
                        <span class="column-title">
                            <span style="background: ${stage.color};"></span>
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
        document.getElementById('edit-board-btn').addEventListener('click', () => showBoardSettingsModal(board));
        
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (card.classList.contains('dragging')) return;
                const task = tasks.find(t => t.id === parseInt(card.dataset.id));
                showTaskModal(task, boardId, stages);
            });
        });
        
        setupDragAndDrop(boardId);
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state">Error loading board: ${err.message}</div>`;
        toast.error('Failed to load board');
    }
}

function setupDragAndDrop(boardId) {
    const taskCards = document.querySelectorAll('.task-card');
    const taskLists = document.querySelectorAll('.task-list');
    
    taskCards.forEach(card => {
        card.setAttribute('draggable', 'true');
        
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            // Remove all drag-over classes
            taskLists.forEach(list => list.classList.remove('drag-over'));
        });
    });
    
    taskLists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            list.classList.add('drag-over');
        });
        
        list.addEventListener('dragleave', (e) => {
            // Only remove if we're leaving the list entirely
            if (!list.contains(e.relatedTarget)) {
                list.classList.remove('drag-over');
            }
        });
        
        list.addEventListener('drop', async (e) => {
            e.preventDefault();
            list.classList.remove('drag-over');
            
            const taskId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStageId = parseInt(list.dataset.stageId);
            const draggedCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
            
            if (!draggedCard) return;
            
            const oldStageId = parseInt(draggedCard.closest('.task-list').dataset.stageId);
            
            // Don't do anything if dropped in same stage
            if (oldStageId === newStageId) return;
            
            // Optimistic UI update
            list.appendChild(draggedCard);
            updateStageCounts();
            
            try {
                await api.put(`/boards/${boardId}/tasks/${taskId}/move`, { 
                    stage_id: newStageId 
                });
                toast.success('Task moved');
            } catch (err) {
                // Revert on error
                toast.error('Failed to move task');
                renderBoard(document.getElementById('main-content'), { id: boardId });
            }
        });
    });
}

function updateStageCounts() {
    document.querySelectorAll('.column').forEach(column => {
        const count = column.querySelectorAll('.task-card').length;
        column.querySelector('.column-count').textContent = count;
    });
}

function renderTaskCard(task) {
    const urgencyClass = getUrgencyClass(task.due_date);
    const dueClass = getDueClass(task.due_date);
    const dueBadge = task.due_date ? `
        <span class="task-due ${dueClass}">
            📅 ${formatDate(task.due_date)}
        </span>
    ` : '';
    
    // Render custom fields
    const customFields = task.custom_fields || {};
    const fieldBadges = Object.entries(customFields).slice(0, 3).map(([key, value]) => 
        `<span class="task-field-badge">${escapeHtml(key)}: ${escapeHtml(String(value))}</span>`
    ).join('');
    
    return `
        <div class="task-card ${urgencyClass}" data-id="${task.id}" style="border-left-color: ${task.color_theme ? getThemeColor(task.color_theme) : 'var(--primary)'}">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${fieldBadges ? `<div class="task-fields">${fieldBadges}</div>` : ''}
            <div class="task-meta">
                ${dueBadge}
            </div>
        </div>
    `;
}

function getUrgencyClass(dateStr) {
    if (!dateStr) return '';
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return 'urgency-critical';
    if (diff <= 1) return 'urgency-critical';
    if (diff <= 3) return 'urgency-high';
    if (diff <= 7) return 'urgency-medium';
    return '';
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

function showBoardSettingsModal(board) {
    const stages = board.stages || [];
    
    showModal({
        title: 'Board Settings',
        content: `
            <form id="board-settings-form">
                <div class="form-group">
                    <label class="form-label">Board Name</label>
                    <input type="text" name="title" class="form-input" value="${escapeHtml(board.title)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" style="min-height: 80px;">${escapeHtml(board.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Color Theme</label>
                    <div class="color-picker-grid" id="board-settings-color">
                        ${['blue', 'green', 'purple', 'pink', 'yellow', 'red'].map(c => `
                            <button type="button" class="color-swatch ${board.color_theme === c ? 'active' : ''}" data-color="${c}" style="background: ${getThemeColor(c)}"></button>
                        `).join('')}
                    </div>
                    <input type="hidden" name="color_theme" value="${board.color_theme || 'blue'}">
                </div>
                
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label class="form-label">Workflow Stages</label>
                    <div class="stages-editor" id="stages-editor">
                        ${stages.map((stage, i) => `
                            <div class="stage-row" data-stage-id="${stage.id}">
                                <button type="button" class="stage-color-btn" style="background: ${stage.color}" data-color="${stage.color}"></button>
                                <input type="text" class="stage-name-input" value="${escapeHtml(stage.name)}" placeholder="Stage name">
                                <button type="button" class="stage-delete-btn" ${stages.length <= 1 ? 'disabled style="opacity: 0.3;"' : ''}>×</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="add-stage-btn" id="add-stage-btn">+ Add Stage</button>
                </div>
            </form>
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">
                <button id="delete-board-btn" class="btn btn-danger" style="width: 100%;">Delete Board</button>
            </div>
        `,
        onSubmit: async () => {
            const form = document.getElementById('board-settings-form');
            const formData = new FormData(form);
            
            // Collect stages
            const stageRows = document.querySelectorAll('.stage-row');
            const updatedStages = Array.from(stageRows).map((row, i) => ({
                id: parseInt(row.dataset.stageId) || null,
                name: row.querySelector('.stage-name-input').value,
                color: row.querySelector('.stage-color-btn').dataset.color,
                position: i
            }));
            
            await api.put(`/boards/${board.id}`, {
                title: formData.get('title'),
                description: formData.get('description'),
                color_theme: formData.get('color_theme'),
                stages: updatedStages
            });
            
            toast.success('Board updated');
            hideModal();
            await loadSidebarData();
            renderBoard(document.getElementById('main-content'), { id: board.id });
        }
    });
    
    // Setup color picker
    setupColorPicker('board-settings-color', 'color_theme');
    
    // Stage color pickers
    document.querySelectorAll('.stage-color-btn').forEach(btn => {
        btn.addEventListener('click', () => showStageColorPicker(btn));
    });
    
    // Add stage
    document.getElementById('add-stage-btn').addEventListener('click', () => {
        const editor = document.getElementById('stages-editor');
        const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];
        const randomColor = colors[editor.children.length % colors.length];
        
        const newRow = document.createElement('div');
        newRow.className = 'stage-row';
        newRow.dataset.stageId = 'new-' + Date.now();
        newRow.innerHTML = `
            <button type="button" class="stage-color-btn" style="background: ${randomColor}" data-color="${randomColor}"></button>
            <input type="text" class="stage-name-input" value="" placeholder="New Stage">
            <button type="button" class="stage-delete-btn">×</button>
        `;
        editor.appendChild(newRow);
        
        newRow.querySelector('.stage-color-btn').addEventListener('click', (e) => showStageColorPicker(e.target));
        newRow.querySelector('.stage-delete-btn').addEventListener('click', () => newRow.remove());
        newRow.querySelector('.stage-name-input').focus();
    });
    
    // Delete stage buttons
    document.querySelectorAll('.stage-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (document.querySelectorAll('.stage-row').length > 1) {
                btn.closest('.stage-row').remove();
            }
        });
    });
    
    // Delete board
    document.getElementById('delete-board-btn').addEventListener('click', async () => {
        if (confirm('Delete this board and all its tasks? This cannot be undone.')) {
            await api.delete(`/boards/${board.id}`);
            toast.info('Board deleted');
            hideModal();
            await loadSidebarData();
            window.location.hash = '#/boards';
        }
    });
}

function showStageColorPicker(btn) {
    const colors = ['#6366F1', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#6B7280', '#14B8A6'];
    const currentColor = btn.dataset.color;
    const currentIndex = colors.indexOf(currentColor);
    const nextColor = colors[(currentIndex + 1) % colors.length];
    btn.style.background = nextColor;
    btn.dataset.color = nextColor;
}

function showNewTaskModal(boardId, stages) {
    showModal({
        title: 'Add Task',
        content: `
            <form id="new-task-form">
                <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" name="title" class="form-input" placeholder="What needs to be done?" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input" style="min-height: 80px;" placeholder="Add more details..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Stage</label>
                        <select name="stage_id" class="form-input">
                            ${stages.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Color</label>
                        <div class="color-picker-grid" id="task-color-picker">
                            ${['blue', 'green', 'purple', 'pink', 'yellow', 'red'].map(c => `
                                <button type="button" class="color-swatch ${c === 'blue' ? 'active' : ''}" data-color="${c}" style="background: ${getThemeColor(c)}; width: 28px; height: 28px;"></button>
                            `).join('')}
                        </div>
                        <input type="hidden" name="color_theme" value="blue">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" name="due_date" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" name="scheduled_start" class="form-input">
                    </div>
                </div>
                
                <div class="custom-fields-section">
                    <div class="custom-fields-header">
                        <span class="custom-fields-title">Custom Fields</span>
                        <button type="button" class="btn btn-secondary" id="add-custom-field-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">+ Add Field</button>
                    </div>
                    <div id="custom-fields-container"></div>
                </div>
            </form>
        `,
        onSubmit: async () => {
            const form = document.getElementById('new-task-form');
            const formData = new FormData(form);
            
            // Collect custom fields
            const customFields = {};
            document.querySelectorAll('.custom-field-row').forEach(row => {
                const key = row.querySelector('.custom-field-key')?.value?.trim();
                const value = row.querySelector('.custom-field-value')?.value?.trim();
                if (key && value) {
                    customFields[key] = value;
                }
            });
            
            await api.post(`/boards/${boardId}/tasks`, {
                title: formData.get('title'),
                description: formData.get('description'),
                stage_id: parseInt(formData.get('stage_id')),
                color_theme: formData.get('color_theme'),
                due_date: formData.get('due_date') || null,
                scheduled_start: formData.get('scheduled_start') || null,
                custom_fields: Object.keys(customFields).length > 0 ? customFields : null
            });
            
            toast.success('Task created');
            hideModal();
            renderBoard(document.getElementById('main-content'), { id: boardId });
        }
    });
    
    setupColorPicker('task-color-picker', 'color_theme');
    setupCustomFieldsUI();
}

function showTaskModal(task, boardId, stages) {
    const customFields = task.custom_fields || {};
    const customFieldsHtml = Object.entries(customFields).map(([key, value]) => `
        <div class="custom-field-row">
            <input type="text" class="form-input custom-field-key" value="${escapeHtml(key)}" placeholder="Field name" style="width: 100px;">
            <input type="text" class="form-input custom-field-value" value="${escapeHtml(String(value))}" placeholder="Value">
            <button type="button" class="custom-field-delete">×</button>
        </div>
    `).join('');
    
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
                    <textarea name="description" class="form-input" style="min-height: 80px;">${escapeHtml(task.description || '')}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Stage</label>
                        <select name="stage_id" class="form-input">
                            ${stages.map(s => `<option value="${s.id}" ${s.id === task.stage_id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Color</label>
                        <div class="color-picker-grid" id="edit-task-color-picker">
                            ${['blue', 'green', 'purple', 'pink', 'yellow', 'red'].map(c => `
                                <button type="button" class="color-swatch ${(task.color_theme || 'blue') === c ? 'active' : ''}" data-color="${c}" style="background: ${getThemeColor(c)}; width: 28px; height: 28px;"></button>
                            `).join('')}
                        </div>
                        <input type="hidden" name="color_theme" value="${task.color_theme || 'blue'}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" name="due_date" class="form-input" value="${task.due_date || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" name="scheduled_start" class="form-input" value="${task.scheduled_start || ''}">
                    </div>
                </div>
                
                <div class="custom-fields-section">
                    <div class="custom-fields-header">
                        <span class="custom-fields-title">Custom Fields</span>
                        <button type="button" class="btn btn-secondary" id="add-custom-field-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">+ Add Field</button>
                    </div>
                    <div id="custom-fields-container">${customFieldsHtml}</div>
                </div>
            </form>
            <button id="delete-task-btn" class="btn btn-danger" style="margin-top: 1rem; width: 100%;">Delete Task</button>
        `,
        onSubmit: async () => {
            const form = document.getElementById('edit-task-form');
            const formData = new FormData(form);
            const newStageId = parseInt(formData.get('stage_id'));
            
            // Collect custom fields
            const updatedCustomFields = {};
            document.querySelectorAll('.custom-field-row').forEach(row => {
                const key = row.querySelector('.custom-field-key')?.value?.trim();
                const value = row.querySelector('.custom-field-value')?.value?.trim();
                if (key && value) {
                    updatedCustomFields[key] = value;
                }
            });
            
            await api.put(`/boards/${boardId}/tasks/${task.id}`, {
                title: formData.get('title'),
                description: formData.get('description'),
                color_theme: formData.get('color_theme'),
                due_date: formData.get('due_date') || null,
                scheduled_start: formData.get('scheduled_start') || null,
                custom_fields: Object.keys(updatedCustomFields).length > 0 ? updatedCustomFields : null
            });
            
            if (newStageId !== task.stage_id) {
                await api.put(`/boards/${boardId}/tasks/${task.id}/move`, { stage_id: newStageId });
            }
            
            toast.success('Task updated');
            hideModal();
            renderBoard(document.getElementById('main-content'), { id: boardId });
        }
    });
    
    setupColorPicker('edit-task-color-picker', 'color_theme');
    setupCustomFieldsUI();
    
    document.getElementById('delete-task-btn').addEventListener('click', async () => {
        if (confirm('Delete this task?')) {
            await api.delete(`/boards/${boardId}/tasks/${task.id}`);
            toast.info('Task deleted');
            hideModal();
            renderBoard(document.getElementById('main-content'), { id: boardId });
        }
    });
}

function setupCustomFieldsUI() {
    // Add field button
    document.getElementById('add-custom-field-btn')?.addEventListener('click', () => {
        const container = document.getElementById('custom-fields-container');
        const row = document.createElement('div');
        row.className = 'custom-field-row';
        row.innerHTML = `
            <input type="text" class="form-input custom-field-key" placeholder="Field name" style="width: 100px;">
            <input type="text" class="form-input custom-field-value" placeholder="Value">
            <button type="button" class="custom-field-delete">×</button>
        `;
        container.appendChild(row);
        row.querySelector('.custom-field-key').focus();
        
        row.querySelector('.custom-field-delete').addEventListener('click', () => row.remove());
    });
    
    // Existing delete buttons
    document.querySelectorAll('.custom-field-delete').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.custom-field-row').remove());
    });
}

function getDueClass(dateStr) {
    if (!dateStr) return '';
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return 'overdue';
    if (diff <= 1) return 'soon';
    if (diff <= 7) return 'upcoming';
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
