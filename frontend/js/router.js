import { getState } from './state.js';
import { renderLogin } from './views/login.js';
import { renderBoards } from './views/boards.js';
import { renderBoard } from './views/board.js';
import { renderLists } from './views/lists.js';
import { renderList } from './views/list.js';

const routes = {
    '/login': { view: renderLogin, public: true },
    '/boards': { view: renderBoards, public: false },
    '/boards/:id': { view: renderBoard, public: false },
    '/lists': { view: renderLists, public: false },
    '/lists/:id': { view: renderList, public: false }
};

function parseHash(hash) {
    const path = hash.slice(1) || '/login';
    
    // Check for parameterized routes
    for (const [pattern, config] of Object.entries(routes)) {
        const paramMatch = pattern.match(/:(\w+)/);
        if (paramMatch) {
            const regex = new RegExp(`^${pattern.replace(/:(\w+)/, '(\\d+)')}$`);
            const match = path.match(regex);
            if (match) {
                return { 
                    path: pattern, 
                    params: { [paramMatch[1]]: match[1] },
                    config 
                };
            }
        } else if (path === pattern) {
            return { path, params: {}, config };
        }
    }
    
    return { path: '/login', params: {}, config: routes['/login'] };
}

function handleRoute() {
    const { path, params, config } = parseHash(window.location.hash);
    const state = getState();
    
    // Check authentication
    if (!config.public && !state.isAuthenticated) {
        window.location.hash = '#/login';
        return;
    }
    
    if (config.public && state.isAuthenticated && path === '/login') {
        window.location.hash = '#/boards';
        return;
    }
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${path.split('/')[1]}`);
    });
    
    // Render view
    const container = document.getElementById('main-content');
    config.view(container, params);
}

function init() {
    if (!window.location.hash) {
        window.location.hash = '#/login';
    }
    handleRoute();
}

export const router = { init, handleRoute };
