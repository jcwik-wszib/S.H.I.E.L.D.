const API_HOST = window.API_HOST || window.location.hostname;
const API_PORT = 443;
const API_BASE = `${window.location.protocol}//${API_HOST}:${API_PORT}`;

function buildApiUrl(path) {
    if (!path) return API_BASE;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
    const res = await fetch(buildApiUrl(path), {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Request failed');
    }

    return res.json();
}
