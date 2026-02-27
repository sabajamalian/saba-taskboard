import { state, setState, getState } from './state.js';
import { api } from './api.js';
import { router } from './router.js';

// Initialize app
async function init() {
    // Check authentication
    try {
        const user = await api.get('/auth/me');
        setState({ user: user.data, isAuthenticated: true });
        showSidebar();
    } catch (err) {
        setState({ user: null, isAuthenticated: false });
        hideSidebar();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Start router
    router.init();
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
            // Generate initials avatar
            avatar.style.background = 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)';
        }
        document.getElementById('user-name').textContent = user.name || 'User';
    }
    
    // Update active nav link
    updateActiveLink();
}

function hideSidebar() {
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('mobile-header').classList.add('hidden');
}

function updateActiveLink() {
    const hash = window.location.hash || '#/boards';
    const links = document.querySelectorAll('.sidebar-link');
    
    links.forEach(link => {
        link.classList.remove('active');
        if (hash.startsWith(link.getAttribute('href'))) {
            link.classList.add('active');
        }
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
    
    // Close mobile menu on nav link click
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    });
    
    // Hash change
    window.addEventListener('hashchange', () => {
        router.handleRoute();
        updateActiveLink();
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
