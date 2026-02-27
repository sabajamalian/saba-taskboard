// Simple state management
let state = {
    user: null,
    isAuthenticated: false,
    projects: [],
    currentProject: null,
    boards: [],
    currentBoard: null,
    lists: [],
    currentList: null,
    loading: false
};

const listeners = new Set();

export function getState() {
    return state;
}

export function setState(newState) {
    state = { ...state, ...newState };
    notifyListeners();
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notifyListeners() {
    listeners.forEach(listener => listener(state));
}

export { state };
