import { state, setState, getState } from './state.js';
import { api } from './api.js';
import { router } from './router.js';

// Initialize app
async function init() {
    // Check authentication
    try {
        const user = await api.get('/auth/me');
        setState({ user: user.data, isAuthenticated: true });
        showNavbar();
    } catch (err) {
        setState({ user: null, isAuthenticated: false });
        hideNavbar();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Start router
    router.init();
}

function showNavbar() {
    const navbar = document.getElementById('navbar');
    navbar.classList.remove('hidden');
    
    const user = getState().user;
    if (user) {
        document.getElementById('user-avatar').src = user.avatar_url || '';
        document.getElementById('user-name').textContent = user.name;
    }
}

function hideNavbar() {
    document.getElementById('navbar').classList.add('hidden');
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await api.post('/auth/logout');
        setState({ user: null, isAuthenticated: false });
        hideNavbar();
        window.location.hash = '#/login';
    });
    
    // Hash change
    window.addEventListener('hashchange', () => router.handleRoute());
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
