import { getState } from './state.js';
import { renderLogin } from './views/login.js';
import { renderProjects } from './views/projects.js';
import { renderProject } from './views/project.js';
import { renderBoard } from './views/board.js';
import { renderList } from './views/list.js';
import { renderTemplates } from './views/templates.js';

const routes = {
    '/login': { view: renderLogin, public: true },
    '/projects': { view: renderProjects, public: false },
    '/projects/:projectId': { view: renderProject, public: false },
    '/projects/:projectId/boards/:boardId': { view: renderBoard, public: false },
    '/projects/:projectId/lists/:listId': { view: renderList, public: false },
    '/templates': { view: renderTemplates, public: false }
};

function parseHash(hash) {
    const path = hash.slice(1) || '/login';
    
    // Check for parameterized routes (order matters - most specific first)
    const sortedRoutes = Object.entries(routes).sort((a, b) => b[0].length - a[0].length);
    
    for (const [pattern, config] of sortedRoutes) {
        // Build regex from pattern
        let regexStr = pattern.replace(/:(\w+)/g, '(\\d+)');
        const regex = new RegExp(`^${regexStr}$`);
        const match = path.match(regex);
        
        if (match) {
            // Extract param names
            const paramNames = [...pattern.matchAll(/:(\w+)/g)].map(m => m[1]);
            const params = {};
            paramNames.forEach((name, i) => {
                params[name] = match[i + 1];
            });
            return { path: pattern, params, config };
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
        window.location.hash = '#/projects';
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
