const STORAGE_KEY = 'session';

export function saveSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
}

export function getRemainingMs(expiresAt) {
    return Math.max(0, expiresAt - Date.now());
}
