let currentModal = null;

export function showModal({ title, content, onSubmit }) {
    hideModal();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-submit">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    currentModal = overlay;
    
    // Focus first input
    const firstInput = overlay.querySelector('input, textarea, select');
    if (firstInput) firstInput.focus();
    
    // Event listeners
    overlay.querySelector('.modal-close').addEventListener('click', hideModal);
    overlay.querySelector('.modal-cancel').addEventListener('click', hideModal);
    overlay.querySelector('.modal-submit').addEventListener('click', async () => {
        try {
            await onSubmit();
        } catch (err) {
            alert(err.message);
        }
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hideModal();
    });
    
    // Close on Escape
    document.addEventListener('keydown', handleEscape);
}

export function hideModal() {
    if (currentModal) {
        currentModal.remove();
        currentModal = null;
        document.removeEventListener('keydown', handleEscape);
    }
}

function handleEscape(e) {
    if (e.key === 'Escape') hideModal();
}
