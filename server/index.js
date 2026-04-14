const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, persistDb } = require('./db');
const { authMiddleware, JWT_SECRET } = require('./auth');

const app = express();
const PORT = process.env.PORT || 443;
const SESSION_MINUTES = 15;

app.use(cors());
app.use(express.json());

const AUDIT_IGNORE_PATHS = new Set(['/api/audit-logs']);

function sanitizeValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}...` : value;
    return value;
}

function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    const hiddenKeys = new Set(['password', 'oldPassword', 'newPassword', 'confirmPassword', 'token']);
    const result = Array.isArray(body) ? [] : {};
    Object.entries(body).forEach(([key, value]) => {
        if (hiddenKeys.has(key)) {
            result[key] = '***';
            return;
        }
        if (value && typeof value === 'object') {
            result[key] = sanitizeBody(value);
            return;
        }
        result[key] = sanitizeValue(value);
    });
    return result;
}

function getBodyLabel(req) {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    if (name) return name;
    if (username) return username;
    return '';
}

function describeAuditEntry(req) {
    const method = req.method || 'GET';
    const path = req.path || '';
    const parts = path.split('/').filter(Boolean);
    if (parts[0] !== 'api') return '';
    const resource = parts[1] || '';
    const id = parts[2] || '';
    const sub = parts[3] || '';
    const subId = parts[4] || '';
    const label = getBodyLabel(req);

    const idLabel = id && /^\d+$/.test(id) ? `ID ${id}` : id ? id : '';

    if (resource === 'me') {
        return method === 'GET'
            ? 'Odczytano profil użytkownika'
            : method === 'PUT'
                ? 'Zaktualizowano profil użytkownika'
                : 'Operacja na profilu użytkownika';
    }

    if (resource === 'refresh') {
        return 'Odświeżono sesję użytkownika';
    }

    if (resource === 'users') {
        if (method === 'GET') return 'Odczytano listę użytkowników';
        if (method === 'POST') return `Dodano użytkownika${label ? `: ${label}` : ''}`;
        if (id && method === 'PUT') return `Zaktualizowano użytkownika ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && method === 'DELETE') return `Usunięto użytkownika ${idLabel}`;
    }

    if (resource === 'locations') {
        if (!id && method === 'GET') return 'Odczytano listę lokalizacji';
        if (!id && method === 'POST') return `Dodano lokalizację${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'PUT') return `Zaktualizowano lokalizację ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'DELETE') return `Usunięto lokalizację ${idLabel}`;
        if (id && sub === 'buildings' && method === 'GET') return `Odczytano budynki dla lokalizacji ${idLabel}`;
        if (id && sub === 'buildings' && method === 'POST') return `Dodano budynek${label ? `: ${label}` : ''} dla lokalizacji ${idLabel}`;
    }

    if (resource === 'buildings') {
        if (id && sub === 'rooms' && method === 'GET') return `Odczytano pomieszczenia dla budynku ${idLabel}`;
        if (id && sub === 'rooms' && method === 'POST') return `Dodano pomieszczenie${label ? `: ${label}` : ''} dla budynku ${idLabel}`;
        if (id && !sub && method === 'PUT') return `Zaktualizowano budynek ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'DELETE') return `Usunięto budynek ${idLabel}`;
    }

    if (resource === 'rooms') {
        if (id && sub === 'racks' && method === 'GET') return `Odczytano szafy dla pomieszczenia ${idLabel}`;
        if (id && sub === 'racks' && method === 'POST') return `Dodano szafę${label ? `: ${label}` : ''} dla pomieszczenia ${idLabel}`;
        if (id && !sub && method === 'PUT') return `Zaktualizowano pomieszczenie ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'DELETE') return `Usunięto pomieszczenie ${idLabel}`;
    }

    if (resource === 'racks') {
        if (id && sub === 'items' && method === 'GET') return `Odczytano elementy szafy ${idLabel}`;
        if (id && sub === 'items' && method === 'POST') return `Dodano element do szafy ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'PUT') return `Zaktualizowano szafę ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'DELETE') return `Usunięto szafę ${idLabel}`;
    }

    if (resource === 'rack-items') {
        if (id && method === 'PUT') return `Zaktualizowano element szafy ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && method === 'DELETE') return `Usunięto element szafy ${idLabel}`;
    }

    if (resource === 'panels') {
        if (!id && method === 'GET') return 'Odczytano listę paneli';
        if (id && sub === 'ports' && method === 'GET') return `Odczytano porty panelu ${idLabel}`;
        if (id && sub === 'ports' && method === 'PUT') return `Zaktualizowano porty panelu ${idLabel}`;
        if (id && sub === 'connections' && method === 'GET') return `Odczytano połączenia panelu ${idLabel}`;
        if (id && sub === 'cable-connections' && method === 'GET') return `Odczytano połączenia kablowe panelu ${idLabel}`;
    }

    if (resource === 'panel-ports' && sub === 'link') {
        const fromPanelId = req.body?.fromPanelId;
        const fromPort = req.body?.fromPort;
        const toPanelId = req.body?.toPanelId;
        const toPort = req.body?.toPort;
        const details = fromPanelId && toPanelId ? ` (panel ${fromPanelId}:${fromPort} ↔ panel ${toPanelId}:${toPort})` : '';
        return method === 'POST'
            ? `Połączono porty paneli${details}`
            : method === 'DELETE'
                ? `Rozłączono porty paneli${details}`
                : 'Operacja na portach paneli';
    }

    if (resource === 'panel-device-ports' && sub === 'link') {
        const panelId = req.body?.panelId;
        const panelPort = req.body?.panelPort;
        const devicePanelId = req.body?.devicePanelId;
        const devicePort = req.body?.devicePort;
        const details = panelId && devicePanelId ? ` (panel ${panelId}:${panelPort} ↔ urządzenie ${devicePanelId}:${devicePort})` : '';
        return method === 'POST'
            ? `Połączono panel z urządzeniem${details}`
            : method === 'DELETE'
                ? `Rozłączono panel z urządzeniem${details}`
                : 'Operacja panel-urządzenie';
    }

    if (resource === 'device-panel-ports' && sub === 'link') {
        const fromPanelId = req.body?.fromPanelId;
        const fromPort = req.body?.fromPort;
        const toPanelId = req.body?.toPanelId;
        const toPort = req.body?.toPort;
        const details = fromPanelId && toPanelId ? ` (panel urządzenia ${fromPanelId}:${fromPort} ↔ panel urządzenia ${toPanelId}:${toPort})` : '';
        return method === 'POST'
            ? `Połączono panele urządzenia${details}`
            : method === 'DELETE'
                ? `Rozłączono panele urządzenia${details}`
                : 'Operacja na panelach urządzeń';
    }

    if (resource === 'devices') {
        if (id && sub === 'panels' && method === 'GET') return `Odczytano panele urządzenia ${idLabel}`;
        if (id && sub === 'panels' && method === 'POST') return `Dodano panel do urządzenia ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && sub === 'panels' && subId === 'bulk' && method === 'POST') return `Dodano panele (bulk) do urządzenia ${idLabel}`;
    }

    if (resource === 'device-panels') {
        if (id && sub === 'ports' && method === 'GET') return `Odczytano porty panelu urządzenia ${idLabel}`;
        if (id && sub === 'connections' && method === 'GET') return `Odczytano połączenia panelu urządzenia ${idLabel}`;
        if (id && sub === 'sfp' && method === 'GET') return `Odczytano wkładki SFP panelu urządzenia ${idLabel}`;
        if (id && sub === 'sfp' && method === 'PUT') return `Zaktualizowano wkładkę SFP panelu urządzenia ${idLabel}`;
        if (id && sub === 'children' && method === 'POST') return `Dodano podpanel do panelu urządzenia ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'PUT') return `Zaktualizowano panel urządzenia ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && !sub && method === 'DELETE') return `Usunięto panel urządzenia ${idLabel}`;
    }

    if (resource === 'sfp-types') {
        if (method === 'GET') return 'Odczytano listę typów SFP';
        if (method === 'POST') return `Dodano typ SFP${label ? `: ${label}` : ''}`;
    }

    if (resource === 'sfp-inventory') {
        return 'Odczytano listę wkładek SFP';
    }

    if (resource === 'disk-inventory') {
        return 'Odczytano listę dysków';
    }

    if (resource === 'templates') {
        if (method === 'GET') return 'Odczytano listę szablonów';
        if (method === 'POST') return `Dodano szablon${label ? `: ${label}` : ''}`;
        if (id && method === 'PUT') return `Zaktualizowano szablon ${idLabel}${label ? `: ${label}` : ''}`;
        if (id && method === 'DELETE') return `Usunięto szablon ${idLabel}`;
    }

    if (resource === 'diagram-layouts') {
        if (method === 'GET') return 'Odczytano układ diagramu użytkownika';
        if (method === 'PUT') return 'Zaktualizowano układ diagramu użytkownika';
        if (method === 'DELETE') return 'Usunięto układ diagramu użytkownika';
    }

    if (resource === 'diagram-layouts-global') {
        if (method === 'GET') return 'Odczytano globalny układ diagramu';
        if (method === 'PUT') return 'Zaktualizowano globalny układ diagramu';
        if (method === 'DELETE') return 'Usunięto globalny układ diagramu';
    }

    if (resource === 'connections' && sub === 'clear') {
        return 'Wyczyszczono wszystkie połączenia';
    }

    return '';
}

function buildAuditDescription(req) {
    const detailed = describeAuditEntry(req);
    if (detailed) return detailed;
    const method = req.method || 'GET';
    const path = req.originalUrl || req.path || '';
    const actionLabel =
        method === 'GET'
            ? 'Odczyt'
            : method === 'POST'
                ? 'Utworzenie'
                : method === 'PUT'
                    ? 'Edycja'
                    : method === 'DELETE'
                        ? 'Usunięcie'
                        : 'Operacja';
    const parts = [`${actionLabel}: ${method} ${path}`];

    const params = req.params && Object.keys(req.params).length ? JSON.stringify(req.params) : '';
    if (params) parts.push(`parametry: ${params}`);

    if (method === 'GET' && req.query && Object.keys(req.query).length) {
        parts.push(`zapytanie: ${JSON.stringify(req.query)}`);
    }

    if (method !== 'GET' && req.body && Object.keys(req.body).length) {
        const body = sanitizeBody(req.body);
        parts.push(`dane: ${JSON.stringify(body)}`);
    }

    return parts.join(' | ');
}

function getAuditAction(method) {
    if (method === 'GET') return 'read';
    if (method === 'POST') return 'create';
    if (method === 'PUT') return 'update';
    if (method === 'DELETE') return 'delete';
    return 'other';
}

async function writeAuditLog(req) {
    if (!req?.user?.id) return;
    if (!req.originalUrl?.startsWith('/api')) return;
    if (AUDIT_IGNORE_PATHS.has(req.path)) return;
    const db = await getDb();
    const userRow = getOne(db, 'SELECT username FROM users WHERE id = ?', [req.user.id]);
    const username = userRow?.username || `user:${req.user.id}`;
    const description = buildAuditDescription(req);
    const action = getAuditAction(req.method);
    const path = req.originalUrl || req.path || '';
    const createdAt = new Date().toISOString();
    db.run(
        'INSERT INTO audit_logs (user_id, username, action, description, method, path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, username, action, description, req.method || '', path, createdAt]
    );
    persistDb(db);
}

app.use((req, res, next) => {
    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 400) return;
        if (!req.user) return;
        void writeAuditLog(req).catch(() => { });
    });
    next();
});

function getAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

function getOne(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
}

async function requireAdmin(req, res, next) {
    try {
        const db = await getDb();
        const user = getOne(db, 'SELECT role FROM users WHERE id = ?', [req.user.id]);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return next();
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
}

function buildDescendantSet(locations, rootId) {
    const childrenByParent = new Map();
    for (const loc of locations) {
        const key = loc.parent_id ?? null;
        if (!childrenByParent.has(key)) {
            childrenByParent.set(key, []);
        }
        childrenByParent.get(key).push(loc);
    }

    const stack = [rootId];
    const result = new Set();
    while (stack.length) {
        const current = stack.pop();
        const children = childrenByParent.get(current) || [];
        for (const child of children) {
            if (!result.has(child.id)) {
                result.add(child.id);
                stack.push(child.id);
            }
        }
    }
    return result;
}

function buildPanelDescendantSet(panels, rootId) {
    const childrenByParent = new Map();
    panels.forEach((panel) => {
        const key = panel.parent_panel_id ?? null;
        if (!childrenByParent.has(key)) {
            childrenByParent.set(key, []);
        }
        childrenByParent.get(key).push(panel);
    });

    const stack = [rootId];
    const result = new Set();
    while (stack.length) {
        const current = stack.pop();
        const children = childrenByParent.get(current) || [];
        children.forEach((child) => {
            if (!result.has(child.id)) {
                result.add(child.id);
                stack.push(child.id);
            }
        });
    }
    return result;
}

function normalizeTemplateType(type) {
    return ['panel', 'device', 'server'].includes(type) ? type : null;
}

function normalizeMedium(value) {
    if (!value) return null;
    const normalized = String(value).toLowerCase();
    return ['utp', 'singlemode', 'multimode'].includes(normalized) ? normalized : null;
}

function normalizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function createToken(userId) {
    const expiresInSeconds = SESSION_MINUTES * 60;
    const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: expiresInSeconds });
    const expiresAt = (Math.floor(Date.now() / 1000) + expiresInSeconds) * 1000;
    return { token, expiresAt };
}

function toRange(startU, heightU) {
    return {
        low: startU - heightU + 1,
        high: startU
    };
}

function overlaps(startA, heightA, startB, heightB) {
    const rangeA = toRange(startA, heightA);
    const rangeB = toRange(startB, heightB);
    return rangeA.low <= rangeB.high && rangeB.low <= rangeA.high;
}

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const db = await getDb();
        const stmt = db.prepare(
            'SELECT id, username, password_hash, must_change_password, role, first_name, last_name FROM users WHERE username = ?'
        );
        stmt.bind([username]);
        const user = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const ok = bcrypt.compareSync(password, user.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { token, expiresAt } = createToken(user.id);
        return res.json({
            token,
            expiresAt,
            mustChangePassword: !!user.must_change_password,
            username: user.username,
            role: user.role,
            firstName: user.first_name || '',
            lastName: user.last_name || ''
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const stmt = db.prepare('SELECT id, username, must_change_password, role, first_name, last_name FROM users WHERE id = ?');
        stmt.bind([req.user.id]);
        const user = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            id: user.id,
            username: user.username,
            mustChangePassword: !!user.must_change_password,
            role: user.role,
            firstName: user.first_name || '',
            lastName: user.last_name || ''
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/me', authMiddleware, async (req, res) => {
    const firstName = normalizeText(req.body?.firstName);
    const lastName = normalizeText(req.body?.lastName);
    try {
        const db = await getDb();
        const user = getOne(db, 'SELECT id FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        db.run('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [
            firstName || null,
            lastName || null,
            req.user.id
        ]);
        persistDb(db);
        return res.json({ firstName, lastName });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/change-password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new password required' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    try {
        const db = await getDb();
        const stmt = db.prepare('SELECT id, password_hash FROM users WHERE id = ?');
        stmt.bind([req.user.id]);
        const user = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ok = bcrypt.compareSync(oldPassword, user.password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [
            newHash,
            user.id
        ]);
        persistDb(db);

        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/refresh', authMiddleware, async (req, res) => {
    try {
        const { token, expiresAt } = createToken(req.user.id);
        return res.json({ token, expiresAt });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/diagram-layouts/:key', authMiddleware, async (req, res) => {
    const key = String(req.params.key || '').trim();
    if (!key) {
        return res.status(400).json({ error: 'Invalid layout key' });
    }
    try {
        const db = await getDb();
        const row = getOne(db, 'SELECT payload FROM diagram_layouts WHERE user_id = ? AND layout_key = ?', [
            req.user.id,
            key
        ]);
        if (!row) {
            return res.json({ payload: null });
        }
        return res.json({ payload: row.payload });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/diagram-layouts/:key', authMiddleware, async (req, res) => {
    const key = String(req.params.key || '').trim();
    const payload = req.body?.payload;
    if (!key) {
        return res.status(400).json({ error: 'Invalid layout key' });
    }
    if (typeof payload !== 'string') {
        return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
        const db = await getDb();
        const now = new Date().toISOString();
        const existing = getOne(db, 'SELECT id FROM diagram_layouts WHERE user_id = ? AND layout_key = ?', [
            req.user.id,
            key
        ]);
        if (existing) {
            db.run(
                'UPDATE diagram_layouts SET payload = ?, updated_at = ? WHERE id = ?',
                [payload, now, existing.id]
            );
        } else {
            db.run(
                'INSERT INTO diagram_layouts (user_id, layout_key, payload, updated_at) VALUES (?, ?, ?, ?)',
                [req.user.id, key, payload, now]
            );
        }
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/diagram-layouts/:key', authMiddleware, async (req, res) => {
    const key = String(req.params.key || '').trim();
    if (!key) {
        return res.status(400).json({ error: 'Invalid layout key' });
    }
    try {
        const db = await getDb();
        db.run('DELETE FROM diagram_layouts WHERE user_id = ? AND layout_key = ?', [req.user.id, key]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/diagram-layouts-global/:key', authMiddleware, async (req, res) => {
    const key = String(req.params.key || '').trim();
    if (!key) {
        return res.status(400).json({ error: 'Invalid layout key' });
    }
    try {
        const db = await getDb();
        const row = getOne(db, 'SELECT payload FROM diagram_layouts_global WHERE layout_key = ?', [key]);
        if (!row) {
            return res.json({ payload: null });
        }
        return res.json({ payload: row.payload });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/diagram-layouts-global/:key', authMiddleware, async (req, res) => {
    const key = String(req.params.key || '').trim();
    const payload = req.body?.payload;
    if (!key) {
        return res.status(400).json({ error: 'Invalid layout key' });
    }
    if (typeof payload !== 'string') {
        return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
        const db = await getDb();
        const now = new Date().toISOString();
        const existing = getOne(db, 'SELECT id FROM diagram_layouts_global WHERE layout_key = ?', [key]);
        if (existing) {
            db.run(
                'UPDATE diagram_layouts_global SET payload = ?, updated_at = ? WHERE id = ?',
                [payload, now, existing.id]
            );
        } else {
            db.run(
                'INSERT INTO diagram_layouts_global (layout_key, payload, updated_at) VALUES (?, ?, ?)',
                [key, payload, now]
            );
        }
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/diagram-layouts-global/:key', authMiddleware, async (req, res) => {
    const key = String(req.params.key || '').trim();
    if (!key) {
        return res.status(400).json({ error: 'Invalid layout key' });
    }
    try {
        const db = await getDb();
        db.run('DELETE FROM diagram_layouts_global WHERE layout_key = ?', [key]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/users', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = await getDb();
        const users = getAll(
            db,
            'SELECT id, username, role, must_change_password FROM users ORDER BY username'
        );
        return res.json(users);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users', authMiddleware, requireAdmin, async (req, res) => {
    const { username, password, role = 'user', mustChangePassword = true } = req.body || {};
    if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM users WHERE username = ?', [username.trim()]);
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        db.run(
            'INSERT INTO users (username, password_hash, must_change_password, role) VALUES (?, ?, ?, ?)',
            [username.trim(), passwordHash, mustChangePassword ? 1 : 0, role]
        );
        const created = getOne(
            db,
            'SELECT id, username, role, must_change_password FROM users ORDER BY id DESC LIMIT 1'
        );
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/:id', authMiddleware, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { username, role, mustChangePassword, password } = req.body || {};
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username is required' });
    }
    if (role && !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    if (password && password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM users WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }

        const duplicate = getOne(db, 'SELECT id FROM users WHERE username = ? AND id != ?', [
            username.trim(),
            id
        ]);
        if (duplicate) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        if (password) {
            const passwordHash = bcrypt.hashSync(password, 10);
            db.run(
                'UPDATE users SET username = ?, role = ?, must_change_password = ?, password_hash = ? WHERE id = ?',
                [
                    username.trim(),
                    role || 'user',
                    mustChangePassword ? 1 : 0,
                    passwordHash,
                    id
                ]
            );
        } else {
            db.run(
                'UPDATE users SET username = ?, role = ?, must_change_password = ? WHERE id = ?',
                [username.trim(), role || 'user', mustChangePassword ? 1 : 0, id]
            );
        }

        const updated = getOne(
            db,
            'SELECT id, username, role, must_change_password FROM users WHERE id = ?',
            [id]
        );
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/users/:id', authMiddleware, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM users WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }
        db.run('DELETE FROM users WHERE id = ?', [id]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/audit-logs', authMiddleware, requireAdmin, async (req, res) => {
    const query = normalizeText(req.query?.query).toLowerCase();
    const limitRaw = Number(req.query?.limit);
    const offsetRaw = Number(req.query?.offset);
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 10), 500) : 200;
    const offset = Number.isInteger(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    try {
        const db = await getDb();
        const rows = getAll(
            db,
            'SELECT id, user_id, username, action, description, method, path, created_at FROM audit_logs ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const filtered = query
            ? rows.filter((row) => {
                const haystack = [
                    row.username,
                    row.action,
                    row.description,
                    row.method,
                    row.path
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(query);
            })
            : rows;
        return res.json({ items: filtered });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/locations', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const locations = getAll(db, 'SELECT id, name, parent_id FROM locations ORDER BY name');
        return res.json(locations);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/locations', authMiddleware, async (req, res) => {
    const { name, parentId } = req.body || {};
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        let parent = null;
        if (parentId !== null && parentId !== undefined && parentId !== '') {
            parent = getOne(db, 'SELECT id FROM locations WHERE id = ?', [parentId]);
            if (!parent) {
                return res.status(400).json({ error: 'Parent location not found' });
            }
        }

        db.run('INSERT INTO locations (name, parent_id) VALUES (?, ?)', [name.trim(), parent?.id ?? null]);
        const created = getOne(db, 'SELECT id, name, parent_id FROM locations ORDER BY id DESC LIMIT 1');
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/locations/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { name, parentId } = req.body || {};
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM locations WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Location not found' });
        }

        let parent = null;
        if (parentId !== null && parentId !== undefined && parentId !== '') {
            if (Number(parentId) === id) {
                return res.status(400).json({ error: 'Location cannot be its own parent' });
            }
            const locations = getAll(db, 'SELECT id, parent_id FROM locations');
            const descendants = buildDescendantSet(locations, id);
            if (descendants.has(Number(parentId))) {
                return res.status(400).json({ error: 'Parent cannot be a descendant' });
            }
            parent = getOne(db, 'SELECT id FROM locations WHERE id = ?', [parentId]);
            if (!parent) {
                return res.status(400).json({ error: 'Parent location not found' });
            }
        }

        db.run('UPDATE locations SET name = ?, parent_id = ? WHERE id = ?', [name.trim(), parent?.id ?? null, id]);
        const updated = getOne(db, 'SELECT id, name, parent_id FROM locations WHERE id = ?', [id]);
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/locations/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM locations WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Location not found' });
        }

        const locations = getAll(db, 'SELECT id, parent_id FROM locations');
        const descendants = buildDescendantSet(locations, id);
        const idsToDelete = [id, ...descendants];
        const placeholders = idsToDelete.map(() => '?').join(',');
        db.run(`DELETE FROM locations WHERE id IN (${placeholders})`, idsToDelete);
        persistDb(db);
        return res.json({ deletedIds: idsToDelete });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/locations/:id/buildings', authMiddleware, async (req, res) => {
    const locationId = Number(req.params.id);
    if (!Number.isInteger(locationId)) {
        return res.status(400).json({ error: 'Invalid location id' });
    }
    try {
        const db = await getDb();
        const location = getOne(db, 'SELECT id FROM locations WHERE id = ?', [locationId]);
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        const buildings = getAll(
            db,
            'SELECT id, name, location_id FROM buildings WHERE location_id = ? ORDER BY name',
            [locationId]
        );
        return res.json(buildings);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/locations/:id/buildings', authMiddleware, async (req, res) => {
    const locationId = Number(req.params.id);
    const { name } = req.body || {};
    if (!Number.isInteger(locationId)) {
        return res.status(400).json({ error: 'Invalid location id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        const location = getOne(db, 'SELECT id FROM locations WHERE id = ?', [locationId]);
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        db.run('INSERT INTO buildings (name, location_id) VALUES (?, ?)', [name.trim(), locationId]);
        const created = getOne(
            db,
            'SELECT id, name, location_id FROM buildings ORDER BY id DESC LIMIT 1'
        );
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/buildings/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { name } = req.body || {};
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM buildings WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Building not found' });
        }
        db.run('UPDATE buildings SET name = ? WHERE id = ?', [name.trim(), id]);
        const updated = getOne(db, 'SELECT id, name, location_id FROM buildings WHERE id = ?', [id]);
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/buildings/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM buildings WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Building not found' });
        }
        db.run('DELETE FROM buildings WHERE id = ?', [id]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/buildings/:id/rooms', authMiddleware, async (req, res) => {
    const buildingId = Number(req.params.id);
    if (!Number.isInteger(buildingId)) {
        return res.status(400).json({ error: 'Invalid building id' });
    }
    try {
        const db = await getDb();
        const building = getOne(db, 'SELECT id FROM buildings WHERE id = ?', [buildingId]);
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        const rooms = getAll(
            db,
            'SELECT id, name, building_id FROM rooms WHERE building_id = ? ORDER BY name',
            [buildingId]
        );
        return res.json(rooms);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/buildings/:id/rooms', authMiddleware, async (req, res) => {
    const buildingId = Number(req.params.id);
    const { name } = req.body || {};
    if (!Number.isInteger(buildingId)) {
        return res.status(400).json({ error: 'Invalid building id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        const building = getOne(db, 'SELECT id FROM buildings WHERE id = ?', [buildingId]);
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        db.run('INSERT INTO rooms (name, building_id) VALUES (?, ?)', [name.trim(), buildingId]);
        const created = getOne(db, 'SELECT id, name, building_id FROM rooms ORDER BY id DESC LIMIT 1');
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/rooms/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { name } = req.body || {};
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM rooms WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Room not found' });
        }
        db.run('UPDATE rooms SET name = ? WHERE id = ?', [name.trim(), id]);
        const updated = getOne(db, 'SELECT id, name, building_id FROM rooms WHERE id = ?', [id]);
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/rooms/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM rooms WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Room not found' });
        }
        db.run('DELETE FROM rooms WHERE id = ?', [id]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/rooms/:id/racks', authMiddleware, async (req, res) => {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId)) {
        return res.status(400).json({ error: 'Invalid room id' });
    }
    try {
        const db = await getDb();
        const room = getOne(db, 'SELECT id FROM rooms WHERE id = ?', [roomId]);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        const racks = getAll(
            db,
            'SELECT id, name, room_id, height_u FROM racks WHERE room_id = ? ORDER BY name',
            [roomId]
        );
        return res.json(racks);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/rooms/:id/racks', authMiddleware, async (req, res) => {
    const roomId = Number(req.params.id);
    const { name, heightU } = req.body || {};
    if (!Number.isInteger(roomId)) {
        return res.status(400).json({ error: 'Invalid room id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const heightValue = Number(heightU);
    if (!Number.isInteger(heightValue) || heightValue < 1) {
        return res.status(400).json({ error: 'Invalid height U' });
    }
    try {
        const db = await getDb();
        const room = getOne(db, 'SELECT id FROM rooms WHERE id = ?', [roomId]);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        db.run('INSERT INTO racks (name, room_id, height_u) VALUES (?, ?, ?)', [
            name.trim(),
            roomId,
            heightValue
        ]);
        const created = getOne(
            db,
            'SELECT id, name, room_id, height_u FROM racks ORDER BY id DESC LIMIT 1'
        );
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/racks/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { name, heightU } = req.body || {};
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const heightValue = Number(heightU);
    if (!Number.isInteger(heightValue) || heightValue < 1) {
        return res.status(400).json({ error: 'Invalid height U' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM racks WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        db.run('UPDATE racks SET name = ?, height_u = ? WHERE id = ?', [
            name.trim(),
            heightValue,
            id
        ]);
        const updated = getOne(
            db,
            'SELECT id, name, room_id, height_u FROM racks WHERE id = ?',
            [id]
        );
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/racks/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM racks WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        db.run('DELETE FROM racks WHERE id = ?', [id]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/racks/:id/items', authMiddleware, async (req, res) => {
    const rackId = Number(req.params.id);
    if (!Number.isInteger(rackId)) {
        return res.status(400).json({ error: 'Invalid rack id' });
    }
    try {
        const db = await getDb();
        const rack = getOne(db, 'SELECT id FROM racks WHERE id = ?', [rackId]);
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        const items = getAll(
            db,
            'SELECT id, rack_id, name, type, start_u, height_u, port_count, ipv4, serial, hostname, owner FROM rack_items WHERE rack_id = ? ORDER BY start_u DESC',
            [rackId]
        );
        return res.json(items);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/racks/:id/items', authMiddleware, async (req, res) => {
    const rackId = Number(req.params.id);
    const { name, type, startU, heightU, portCount, ipv4, serial, hostname, owner } = req.body || {};
    if (!Number.isInteger(rackId)) {
        return res.status(400).json({ error: 'Invalid rack id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const normalizedType = type === 'router' ? 'server' : type;
    if (!['panel', 'device', 'server'].includes(normalizedType)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    let portValue = null;
    if (normalizedType === 'panel') {
        portValue = Number(portCount);
        if (!Number.isInteger(portValue) || portValue < 1) {
            return res.status(400).json({ error: 'Invalid port count' });
        }
    }
    const startValue = Number(startU);
    const heightValue = Number(heightU);
    if (!Number.isInteger(startValue) || startValue < 1) {
        return res.status(400).json({ error: 'Invalid start U' });
    }
    if (!Number.isInteger(heightValue) || heightValue < 1) {
        return res.status(400).json({ error: 'Invalid height U' });
    }
    try {
        const db = await getDb();
        const rack = getOne(db, 'SELECT id, height_u FROM racks WHERE id = ?', [rackId]);
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        if (startValue > rack.height_u) {
            return res.status(400).json({ error: 'Item exceeds rack height' });
        }
        if (startValue - heightValue + 1 < 1) {
            return res.status(400).json({ error: 'Item exceeds rack height' });
        }
        const items = getAll(
            db,
            'SELECT start_u, height_u FROM rack_items WHERE rack_id = ?',
            [rackId]
        );
        const conflict = items.some((it) => overlaps(startValue, heightValue, it.start_u, it.height_u));
        if (conflict) {
            return res.status(400).json({ error: 'Item overlaps existing unit' });
        }
        const ipv4Value = normalizedType === 'panel' ? null : normalizeText(ipv4);
        const serialValue = normalizedType === 'panel' ? null : normalizeText(serial);
        const hostnameValue = normalizedType === 'panel' ? null : normalizeText(hostname);
        const ownerValue = normalizedType === 'panel' ? null : normalizeText(owner);
        db.run(
            'INSERT INTO rack_items (rack_id, name, type, start_u, height_u, port_count, ipv4, serial, hostname, owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                rackId,
                name.trim(),
                normalizedType,
                startValue,
                heightValue,
                portValue,
                ipv4Value || null,
                serialValue || null,
                hostnameValue || null,
                ownerValue || null
            ]
        );
        const created = getOne(
            db,
            'SELECT id, rack_id, name, type, start_u, height_u, port_count, ipv4, serial, hostname, owner FROM rack_items ORDER BY id DESC LIMIT 1'
        );
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/rack-items/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { name, type, startU, heightU, portCount, ipv4, serial, hostname, owner } = req.body || {};
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const normalizedType = type === 'router' ? 'server' : type;
    if (!['panel', 'device', 'server'].includes(normalizedType)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    let portValue = null;
    if (normalizedType === 'panel') {
        portValue = Number(portCount);
        if (!Number.isInteger(portValue) || portValue < 1) {
            return res.status(400).json({ error: 'Invalid port count' });
        }
    }
    const startValue = Number(startU);
    const heightValue = Number(heightU);
    if (!Number.isInteger(startValue) || startValue < 1) {
        return res.status(400).json({ error: 'Invalid start U' });
    }
    if (!Number.isInteger(heightValue) || heightValue < 1) {
        return res.status(400).json({ error: 'Invalid height U' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id, rack_id FROM rack_items WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Item not found' });
        }
        const rack = getOne(db, 'SELECT id, height_u FROM racks WHERE id = ?', [existing.rack_id]);
        if (!rack) {
            return res.status(404).json({ error: 'Rack not found' });
        }
        if (startValue > rack.height_u) {
            return res.status(400).json({ error: 'Item exceeds rack height' });
        }
        if (startValue - heightValue + 1 < 1) {
            return res.status(400).json({ error: 'Item exceeds rack height' });
        }
        const items = getAll(
            db,
            'SELECT id, start_u, height_u FROM rack_items WHERE rack_id = ? AND id != ?',
            [existing.rack_id, id]
        );
        const conflict = items.some((it) => overlaps(startValue, heightValue, it.start_u, it.height_u));
        if (conflict) {
            return res.status(400).json({ error: 'Item overlaps existing unit' });
        }
        const ipv4Value = normalizedType === 'panel' ? null : normalizeText(ipv4);
        const serialValue = normalizedType === 'panel' ? null : normalizeText(serial);
        const hostnameValue = normalizedType === 'panel' ? null : normalizeText(hostname);
        const ownerValue = normalizedType === 'panel' ? null : normalizeText(owner);
        db.run(
            'UPDATE rack_items SET name = ?, type = ?, start_u = ?, height_u = ?, port_count = ?, ipv4 = ?, serial = ?, hostname = ?, owner = ? WHERE id = ?',
            [
                name.trim(),
                normalizedType,
                startValue,
                heightValue,
                portValue,
                ipv4Value || null,
                serialValue || null,
                hostnameValue || null,
                ownerValue || null,
                id
            ]
        );
        const updated = getOne(
            db,
            'SELECT id, rack_id, name, type, start_u, height_u, port_count, ipv4, serial, hostname, owner FROM rack_items WHERE id = ?',
            [id]
        );
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/rack-items/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id, type FROM rack_items WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Item not found' });
        }
        if (existing.type === 'panel') {
            db.run('DELETE FROM panel_ports WHERE panel_item_id = ?', [id]);
            db.run('DELETE FROM panel_port_connections WHERE panel_item_id = ?', [id]);
            db.run('DELETE FROM panel_device_ports WHERE panel_item_id = ?', [id]);
        }
        if (existing.type === 'device' || existing.type === 'server') {
            const devicePanels = getAll(db, 'SELECT id FROM device_panels WHERE parent_item_id = ?', [id]);
            const ids = devicePanels.map((p) => p.id);
            if (ids.length > 0) {
                const placeholders = ids.map(() => '?').join(',');
                db.run(`DELETE FROM device_panel_ports WHERE panel_id IN (${placeholders})`, ids);
                db.run(`DELETE FROM panel_device_ports WHERE device_panel_id IN (${placeholders})`, ids);
            }
            db.run('DELETE FROM device_panels WHERE parent_item_id = ?', [id]);
        }
        db.run('DELETE FROM rack_items WHERE id = ?', [id]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/panels', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const panels = getAll(
            db,
            "SELECT ri.id, ri.name, ri.port_count, ri.rack_id, r.name AS rack_name, rm.id AS room_id, rm.name AS room_name, b.id AS building_id, b.name AS building_name, l.id AS location_id, l.name AS location_name FROM rack_items ri LEFT JOIN racks r ON r.id = ri.rack_id LEFT JOIN rooms rm ON rm.id = r.room_id LEFT JOIN buildings b ON b.id = rm.building_id LEFT JOIN locations l ON l.id = b.location_id WHERE ri.type = 'panel' ORDER BY ri.name"
        );
        return res.json(panels);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/panels/:id/ports', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id, port_count, port_rows, port_flow FROM rack_items WHERE id = ? AND type = ?', [
            panelId,
            'panel'
        ]);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const ports = getAll(
            db,
            'SELECT port_number, linked_panel_id, linked_port_number, medium FROM panel_ports WHERE panel_item_id = ? ORDER BY port_number',
            [panelId]
        );
        return res.json({
            portCount: panel.port_count || 0,
            portRows: panel.port_rows || 1,
            portFlow: panel.port_flow || 'row',
            ports
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/panels/:id/connections', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id FROM rack_items WHERE id = ? AND type = ?', [panelId, 'panel']);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const rows = getAll(
            db,
            'SELECT panel_port_number, device_panel_id, device_port_number, medium FROM panel_device_ports WHERE panel_item_id = ? ORDER BY panel_port_number',
            [panelId]
        );
        return res.json({
            panelId: panel.id,
            connections: rows
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/panels/:id/cable-connections', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id FROM rack_items WHERE id = ? AND type = ?', [panelId, 'panel']);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const rows = getAll(
            db,
            'SELECT port_number, linked_panel_id, linked_port_number, medium FROM panel_port_connections WHERE panel_item_id = ? ORDER BY port_number',
            [panelId]
        );
        return res.json({ panelId: panel.id, connections: rows });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/panel-ports/link', authMiddleware, async (req, res) => {
    const { fromPanelId, fromPort, toPanelId, toPort, medium } = req.body || {};
    const sourcePanelId = Number(fromPanelId);
    const sourcePort = Number(fromPort);
    const targetPanelId = Number(toPanelId);
    const targetPort = Number(toPort);
    if (!Number.isInteger(sourcePanelId) || !Number.isInteger(targetPanelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!Number.isInteger(sourcePort) || !Number.isInteger(targetPort) || sourcePort < 1 || targetPort < 1) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    if (sourcePanelId === targetPanelId && sourcePort === targetPort) {
        return res.status(400).json({ error: 'Ports must be different' });
    }
    try {
        const db = await getDb();
        const source = getOne(db, 'SELECT id, port_count FROM rack_items WHERE id = ? AND type = ?', [sourcePanelId, 'panel']);
        const target = getOne(db, 'SELECT id, port_count FROM rack_items WHERE id = ? AND type = ?', [targetPanelId, 'panel']);
        if (!source || !target) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        if (sourcePort > (source.port_count || 0) || targetPort > (target.port_count || 0)) {
            return res.status(400).json({ error: 'Port out of range' });
        }

        const existingSource = getOne(
            db,
            'SELECT linked_panel_id, linked_port_number FROM panel_port_connections WHERE panel_item_id = ? AND port_number = ?',
            [sourcePanelId, sourcePort]
        );
        if (
            existingSource &&
            (existingSource.linked_panel_id !== targetPanelId || existingSource.linked_port_number !== targetPort)
        ) {
            return res.status(400).json({ error: 'Port already assigned' });
        }
        const existingTarget = getOne(
            db,
            'SELECT linked_panel_id, linked_port_number FROM panel_port_connections WHERE panel_item_id = ? AND port_number = ?',
            [targetPanelId, targetPort]
        );
        if (
            existingTarget &&
            (existingTarget.linked_panel_id !== sourcePanelId || existingTarget.linked_port_number !== sourcePort)
        ) {
            return res.status(400).json({ error: 'Target port already assigned' });
        }

        let resolvedMedium = normalizeMedium(medium);
        if (!resolvedMedium) {
            const sourcePortRow = getOne(
                db,
                'SELECT medium FROM panel_ports WHERE panel_item_id = ? AND port_number = ?',
                [sourcePanelId, sourcePort]
            );
            resolvedMedium = normalizeMedium(sourcePortRow?.medium) || 'utp';
        }

        const sourcePortMeta = getOne(
            db,
            'SELECT medium FROM panel_ports WHERE panel_item_id = ? AND port_number = ?',
            [sourcePanelId, sourcePort]
        );
        const targetPortMeta = getOne(
            db,
            'SELECT medium FROM panel_ports WHERE panel_item_id = ? AND port_number = ?',
            [targetPanelId, targetPort]
        );
        const sourceMedium = normalizeMedium(sourcePortMeta?.medium);
        const targetMedium = normalizeMedium(targetPortMeta?.medium);
        if (sourceMedium && resolvedMedium !== sourceMedium) {
            return res.status(400).json({ error: 'Medium mismatch (source port)' });
        }
        if (targetMedium && resolvedMedium !== targetMedium) {
            return res.status(400).json({ error: 'Medium mismatch (target port)' });
        }
        if (sourceMedium && targetMedium && sourceMedium !== targetMedium) {
            return res.status(400).json({ error: 'Medium mismatch between ports' });
        }

        if (!existingSource) {
            db.run(
                'INSERT INTO panel_port_connections (panel_item_id, port_number, linked_panel_id, linked_port_number, medium) VALUES (?, ?, ?, ?, ?)',
                [sourcePanelId, sourcePort, targetPanelId, targetPort, resolvedMedium]
            );
        } else {
            db.run(
                'UPDATE panel_port_connections SET medium = ? WHERE panel_item_id = ? AND port_number = ? AND linked_panel_id = ? AND linked_port_number = ?',
                [resolvedMedium, sourcePanelId, sourcePort, targetPanelId, targetPort]
            );
        }
        if (!existingTarget) {
            db.run(
                'INSERT INTO panel_port_connections (panel_item_id, port_number, linked_panel_id, linked_port_number, medium) VALUES (?, ?, ?, ?, ?)',
                [targetPanelId, targetPort, sourcePanelId, sourcePort, resolvedMedium]
            );
        } else {
            db.run(
                'UPDATE panel_port_connections SET medium = ? WHERE panel_item_id = ? AND port_number = ? AND linked_panel_id = ? AND linked_port_number = ?',
                [resolvedMedium, targetPanelId, targetPort, sourcePanelId, sourcePort]
            );
        }
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/panels/:id/ports', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    const { portCount, portRows, portFlow, mode, targetPanelId, links, ranges } = req.body || {};
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    const portValue = Number(portCount);
    if (!Number.isInteger(portValue) || portValue < 1) {
        return res.status(400).json({ error: 'Invalid port count' });
    }
    const rowsValue = portRows !== undefined && portRows !== null ? Number(portRows) : 1;
    if (!Number.isInteger(rowsValue) || rowsValue < 1) {
        return res.status(400).json({ error: 'Invalid port rows' });
    }
    const flowValue = portFlow === 'column' ? 'column' : 'row';
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id FROM rack_items WHERE id = ? AND type = ?', [panelId, 'panel']);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const previousLinks = getAll(
            db,
            'SELECT port_number, linked_panel_id, linked_port_number, medium FROM panel_ports WHERE panel_item_id = ?',
            [panelId]
        );
        db.run('UPDATE rack_items SET port_count = ?, port_rows = ?, port_flow = ? WHERE id = ?', [
            portValue,
            rowsValue,
            flowValue,
            panelId
        ]);
        db.run('DELETE FROM panel_ports WHERE panel_item_id = ?', [panelId]);

        const desiredLinks = [];

        if (mode === 'group') {
            if (Array.isArray(ranges) && ranges.length > 0) {
                ranges.forEach((range) => {
                    if (!range) return;
                    const start = Number(range.start);
                    const end = Number(range.end);
                    const targetId = Number(range.targetPanelId);
                    const targetStart = Number(range.targetStart);
                    const medium = normalizeMedium(range.medium);
                    if (!Number.isInteger(start) || !Number.isInteger(end)) return;
                    if (start < 1 || end < start || end > portValue) return;
                    if (!Number.isInteger(targetId) || targetId < 1) return;
                    if (!Number.isInteger(targetStart) || targetStart < 1) return;
                    const target = getOne(db, 'SELECT id, port_count FROM rack_items WHERE id = ? AND type = ?', [
                        targetId,
                        'panel'
                    ]);
                    if (!target) return;
                    const length = end - start + 1;
                    const targetEnd = targetStart + length - 1;
                    if (targetEnd > (target.port_count || 0)) return;
                    for (let i = 0; i < length; i += 1) {
                        desiredLinks.push({
                            port: start + i,
                            targetPanelId: target.id,
                            targetPort: targetStart + i,
                            medium
                        });
                    }
                });
            } else {
                const targetId = Number(targetPanelId);
                if (Number.isInteger(targetId) && targetId > 0) {
                    const target = getOne(db, 'SELECT id, port_count FROM rack_items WHERE id = ? AND type = ?', [
                        targetId,
                        'panel'
                    ]);
                    if (!target) {
                        return res.status(400).json({ error: 'Target panel not found' });
                    }
                    const maxPorts = Math.min(portValue, target.port_count || 0);
                    for (let i = 1; i <= maxPorts; i += 1) {
                        desiredLinks.push({
                            port: i,
                            targetPanelId: target.id,
                            targetPort: i,
                            medium: null
                        });
                    }
                }
            }
        } else if (mode === 'individual' && Array.isArray(links)) {
            links.forEach((link) => {
                if (!link) return;
                const portNum = Number(link.port);
                const linkedPanel = Number(link.targetPanelId);
                const linkedPort = Number(link.targetPort);
                const medium = normalizeMedium(link.medium);
                if (!Number.isInteger(portNum) || portNum < 1 || portNum > portValue) return;
                if (!Number.isInteger(linkedPanel) || linkedPanel < 1) return;
                if (!Number.isInteger(linkedPort) || linkedPort < 1) return;
                desiredLinks.push({
                    port: portNum,
                    targetPanelId: linkedPanel,
                    targetPort: linkedPort,
                    medium
                });
            });
        }

        const usedSourcePorts = new Set();
        for (const link of desiredLinks) {
            if (usedSourcePorts.has(link.port)) {
                return res.status(400).json({ error: 'Port already assigned' });
            }
            usedSourcePorts.add(link.port);
        }

        const targetIds = [...new Set(desiredLinks.map((l) => l.targetPanelId))];
        const existingTargets = new Map();
        if (targetIds.length > 0) {
            const placeholders = targetIds.map(() => '?').join(',');
            const rows = getAll(
                db,
                `SELECT panel_item_id, port_number, linked_panel_id, linked_port_number FROM panel_ports WHERE panel_item_id IN (${placeholders})`,
                targetIds
            );
            rows.forEach((row) => {
                if (!existingTargets.has(row.panel_item_id)) {
                    existingTargets.set(row.panel_item_id, new Map());
                }
                existingTargets.get(row.panel_item_id).set(row.port_number, {
                    linked_panel_id: row.linked_panel_id,
                    linked_port_number: row.linked_port_number
                });
            });
        }

        const usedTargetPorts = new Map();
        for (const link of desiredLinks) {
            if (!usedTargetPorts.has(link.targetPanelId)) {
                usedTargetPorts.set(link.targetPanelId, new Set());
            }
            const set = usedTargetPorts.get(link.targetPanelId);
            if (set.has(link.targetPort)) {
                return res.status(400).json({ error: 'Target port already assigned' });
            }
            set.add(link.targetPort);

            const existing = existingTargets.get(link.targetPanelId)?.get(link.targetPort);
            if (existing && (existing.linked_panel_id !== panelId || existing.linked_port_number !== link.port)) {
                return res.status(400).json({ error: 'Target port already assigned' });
            }
        }

        desiredLinks.forEach((link) => {
            db.run(
                'INSERT INTO panel_ports (panel_item_id, port_number, linked_panel_id, linked_port_number, medium) VALUES (?, ?, ?, ?, ?)',
                [panelId, link.port, link.targetPanelId, link.targetPort, link.medium || null]
            );
            const existing = existingTargets.get(link.targetPanelId)?.get(link.targetPort);
            if (!existing) {
                db.run(
                    'INSERT INTO panel_ports (panel_item_id, port_number, linked_panel_id, linked_port_number, medium) VALUES (?, ?, ?, ?, ?)',
                    [link.targetPanelId, link.targetPort, panelId, link.port, link.medium || null]
                );
            }
            if (link.medium) {
                db.run(
                    'UPDATE panel_ports SET medium = ? WHERE panel_item_id = ? AND port_number = ?',
                    [link.medium, panelId, link.port]
                );
                db.run(
                    'UPDATE panel_ports SET medium = ? WHERE panel_item_id = ? AND port_number = ?',
                    [link.medium, link.targetPanelId, link.targetPort]
                );
            }
        });

        const desiredLookup = new Set(desiredLinks.map((link) => `${link.targetPanelId}:${link.targetPort}:${link.port}`));
        previousLinks.forEach((link) => {
            if (!link.linked_panel_id) return;
            const key = `${link.linked_panel_id}:${link.linked_port_number}:${link.port_number}`;
            if (!desiredLookup.has(key)) {
                db.run(
                    'DELETE FROM panel_ports WHERE panel_item_id = ? AND port_number = ? AND linked_panel_id = ? AND linked_port_number = ?',
                    [link.linked_panel_id, link.linked_port_number, panelId, link.port_number]
                );
            }
        });

        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/devices/:id/panels', authMiddleware, async (req, res) => {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) {
        return res.status(400).json({ error: 'Invalid item id' });
    }
    try {
        const db = await getDb();
        const item = getOne(db, 'SELECT id, type FROM rack_items WHERE id = ?', [itemId]);
        if (!item || !['device', 'server'].includes(item.type)) {
            return res.status(404).json({ error: 'Device not found' });
        }
        const panels = getAll(
            db,
            'SELECT id, parent_item_id, parent_panel_id, name, port_count, port_rows, port_flow FROM device_panels WHERE parent_item_id = ? ORDER BY id',
            [itemId]
        );
        return res.json(panels);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/device-panels/:id/ports', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    try {
        const db = await getDb();
        const panel = getOne(
            db,
            'SELECT id, port_count, port_rows, port_flow FROM device_panels WHERE id = ?',
            [panelId]
        );
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const ports = getAll(
            db,
            'SELECT port_number, linked_panel_id, linked_port_number, medium FROM device_panel_ports WHERE panel_id = ? ORDER BY port_number',
            [panelId]
        );
        return res.json({
            panelId: panel.id,
            portCount: panel.port_count || 0,
            portRows: panel.port_rows || 1,
            portFlow: panel.port_flow === 'column' ? 'column' : 'row',
            ports
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/sfp-types', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const types = getAll(db, 'SELECT id, name FROM sfp_types ORDER BY name');
        return res.json(types);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/sfp-types', authMiddleware, async (req, res) => {
    const name = normalizeText(req.body?.name);
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id, name FROM sfp_types WHERE lower(name) = lower(?)', [name]);
        if (existing) {
            return res.json(existing);
        }
        db.run('INSERT INTO sfp_types (name) VALUES (?)', [name]);
        const created = getOne(db, 'SELECT id, name FROM sfp_types WHERE id = last_insert_rowid()');
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/device-panels/:id/sfp', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id FROM device_panels WHERE id = ?', [panelId]);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const rows = getAll(
            db,
            `SELECT s.port_number, s.sfp_type_id, t.name AS sfp_type_name, s.owner, s.serial
             FROM device_panel_port_sfp s
             LEFT JOIN sfp_types t ON t.id = s.sfp_type_id
             WHERE s.panel_id = ?
             ORDER BY s.port_number`,
            [panelId]
        );
        return res.json({ panelId, ports: rows });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/device-panels/:id/sfp', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    const portNumber = Number(req.body?.portNumber);
    const sfpTypeId = req.body?.sfpTypeId === '' || req.body?.sfpTypeId === null
        ? null
        : Number(req.body?.sfpTypeId);
    const owner = normalizeText(req.body?.owner);
    const serial = normalizeText(req.body?.serial);
    if (!Number.isInteger(panelId) || !Number.isInteger(portNumber) || portNumber <= 0) {
        return res.status(400).json({ error: 'Invalid panel id or port number' });
    }
    if (sfpTypeId !== null && !Number.isInteger(sfpTypeId)) {
        return res.status(400).json({ error: 'Invalid SFP type' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id FROM device_panels WHERE id = ?', [panelId]);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        if (sfpTypeId !== null) {
            const type = getOne(db, 'SELECT id FROM sfp_types WHERE id = ?', [sfpTypeId]);
            if (!type) {
                return res.status(400).json({ error: 'SFP type not found' });
            }
        }
        const hasData = sfpTypeId !== null || owner || serial;
        const existing = getOne(
            db,
            'SELECT id FROM device_panel_port_sfp WHERE panel_id = ? AND port_number = ?',
            [panelId, portNumber]
        );
        if (!hasData) {
            if (existing) {
                db.run('DELETE FROM device_panel_port_sfp WHERE id = ?', [existing.id]);
                persistDb(db);
            }
            return res.json({ panelId, portNumber, removed: true });
        }
        if (existing) {
            db.run(
                'UPDATE device_panel_port_sfp SET sfp_type_id = ?, owner = ?, serial = ? WHERE id = ?',
                [sfpTypeId, owner || null, serial || null, existing.id]
            );
        } else {
            db.run(
                'INSERT INTO device_panel_port_sfp (panel_id, port_number, sfp_type_id, owner, serial) VALUES (?, ?, ?, ?, ?)',
                [panelId, portNumber, sfpTypeId, owner || null, serial || null]
            );
        }
        persistDb(db);
        return res.json({ panelId, portNumber, sfpTypeId, owner, serial });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/servers/:id/disks', authMiddleware, async (req, res) => {
    const serverId = Number(req.params.id);
    if (!Number.isInteger(serverId)) {
        return res.status(400).json({ error: 'Invalid server id' });
    }
    try {
        const db = await getDb();
        const server = getOne(db, 'SELECT id, type FROM rack_items WHERE id = ?', [serverId]);
        if (!server || server.type !== 'server') {
            return res.status(404).json({ error: 'Server not found' });
        }
        const disks = getAll(
            db,
            `SELECT id, server_item_id, name, owner, size_value, size_unit, clause, serial, asset_no
             FROM server_disks WHERE server_item_id = ? ORDER BY id`,
            [serverId]
        );
        return res.json({ serverId, disks });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/servers/:id/disks', authMiddleware, async (req, res) => {
    const serverId = Number(req.params.id);
    const name = normalizeText(req.body?.name);
    const owner = normalizeText(req.body?.owner);
    const clause = normalizeText(req.body?.clause);
    const serial = normalizeText(req.body?.serial);
    const assetNo = normalizeText(req.body?.assetNo);
    const sizeValue = req.body?.sizeValue === '' || req.body?.sizeValue === null
        ? null
        : Number(req.body?.sizeValue);
    const sizeUnit = normalizeText(req.body?.sizeUnit).toUpperCase();
    if (!Number.isInteger(serverId) || !name) {
        return res.status(400).json({ error: 'Invalid server id or name' });
    }
    if (sizeUnit && !['GB', 'TB'].includes(sizeUnit)) {
        return res.status(400).json({ error: 'Invalid size unit' });
    }
    if (sizeValue !== null && Number.isNaN(sizeValue)) {
        return res.status(400).json({ error: 'Invalid size value' });
    }
    try {
        const db = await getDb();
        const server = getOne(db, 'SELECT id, type FROM rack_items WHERE id = ?', [serverId]);
        if (!server || server.type !== 'server') {
            return res.status(404).json({ error: 'Server not found' });
        }
        db.run(
            `INSERT INTO server_disks (server_item_id, name, owner, size_value, size_unit, clause, serial, asset_no)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
                serverId,
                name,
                owner || null,
                sizeValue,
                sizeUnit || null,
                clause || null,
                serial || null,
                assetNo || null
            ]
        );
        const created = getOne(
            db,
            `SELECT id, server_item_id, name, owner, size_value, size_unit, clause, serial, asset_no
             FROM server_disks WHERE id = last_insert_rowid()`
        );
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/servers/:id/disks/:diskId', authMiddleware, async (req, res) => {
    const serverId = Number(req.params.id);
    const diskId = Number(req.params.diskId);
    const name = normalizeText(req.body?.name);
    const owner = normalizeText(req.body?.owner);
    const clause = normalizeText(req.body?.clause);
    const serial = normalizeText(req.body?.serial);
    const assetNo = normalizeText(req.body?.assetNo);
    const sizeValue = req.body?.sizeValue === '' || req.body?.sizeValue === null
        ? null
        : Number(req.body?.sizeValue);
    const sizeUnit = normalizeText(req.body?.sizeUnit).toUpperCase();
    if (!Number.isInteger(serverId) || !Number.isInteger(diskId) || !name) {
        return res.status(400).json({ error: 'Invalid server or disk id' });
    }
    if (sizeUnit && !['GB', 'TB'].includes(sizeUnit)) {
        return res.status(400).json({ error: 'Invalid size unit' });
    }
    if (sizeValue !== null && Number.isNaN(sizeValue)) {
        return res.status(400).json({ error: 'Invalid size value' });
    }
    try {
        const db = await getDb();
        const server = getOne(db, 'SELECT id, type FROM rack_items WHERE id = ?', [serverId]);
        if (!server || server.type !== 'server') {
            return res.status(404).json({ error: 'Server not found' });
        }
        const existing = getOne(db, 'SELECT id FROM server_disks WHERE id = ? AND server_item_id = ?', [diskId, serverId]);
        if (!existing) {
            return res.status(404).json({ error: 'Disk not found' });
        }
        db.run(
            `UPDATE server_disks SET name = ?, owner = ?, size_value = ?, size_unit = ?, clause = ?, serial = ?, asset_no = ?
             WHERE id = ?`,
            [
                name,
                owner || null,
                sizeValue,
                sizeUnit || null,
                clause || null,
                serial || null,
                assetNo || null,
                diskId
            ]
        );
        const updated = getOne(
            db,
            `SELECT id, server_item_id, name, owner, size_value, size_unit, clause, serial, asset_no
             FROM server_disks WHERE id = ?`,
            [diskId]
        );
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/servers/:id/disks/:diskId', authMiddleware, async (req, res) => {
    const serverId = Number(req.params.id);
    const diskId = Number(req.params.diskId);
    if (!Number.isInteger(serverId) || !Number.isInteger(diskId)) {
        return res.status(400).json({ error: 'Invalid server or disk id' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM server_disks WHERE id = ? AND server_item_id = ?', [diskId, serverId]);
        if (!existing) {
            return res.status(404).json({ error: 'Disk not found' });
        }
        db.run('DELETE FROM server_disks WHERE id = ?', [diskId]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/disk-inventory', authMiddleware, async (req, res) => {
    const query = normalizeText(req.query?.query).toLowerCase();
    try {
        const db = await getDb();
        const rows = getAll(
            db,
            `SELECT d.id, d.server_item_id, d.name, d.owner, d.size_value, d.size_unit, d.clause, d.serial, d.asset_no,
                    r.name AS server_name,
                    r.type AS server_type,
                    rk.name AS rack_name,
                    rm.name AS room_name,
                    b.name AS building_name,
                    l.name AS location_name
             FROM server_disks d
             LEFT JOIN rack_items r ON r.id = d.server_item_id
             LEFT JOIN racks rk ON rk.id = r.rack_id
             LEFT JOIN rooms rm ON rm.id = rk.room_id
             LEFT JOIN buildings b ON b.id = rm.building_id
             LEFT JOIN locations l ON l.id = b.location_id
             ORDER BY r.name, d.name, d.id`
        );

        const filtered = query
            ? rows.filter((row) => {
                const name = (row.name || '').toLowerCase();
                const owner = (row.owner || '').toLowerCase();
                const clause = (row.clause || '').toLowerCase();
                const serial = (row.serial || '').toLowerCase();
                const assetNo = (row.asset_no || '').toLowerCase();
                const serverName = (row.server_name || '').toLowerCase();
                const location = [row.location_name, row.building_name, row.room_name, row.rack_name]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                const sizeLabel = row.size_value !== null && row.size_value !== undefined
                    ? `${row.size_value} ${row.size_unit || ''}`.toLowerCase()
                    : '';
                return (
                    name.includes(query) ||
                    owner.includes(query) ||
                    clause.includes(query) ||
                    serial.includes(query) ||
                    assetNo.includes(query) ||
                    sizeLabel.includes(query) ||
                    serverName.includes(query) ||
                    location.includes(query)
                );
            })
            : rows;

        return res.json({ items: filtered });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/sfp-inventory', authMiddleware, async (req, res) => {
    const query = normalizeText(req.query?.query).toLowerCase();
    try {
        const db = await getDb();
        const rows = getAll(
            db,
            `SELECT s.panel_id, s.port_number, s.owner, s.serial,
                    t.name AS sfp_type_name,
                    p.name AS panel_name,
                    r.name AS device_name,
                    r.type AS device_type,
                    rk.name AS rack_name,
                    rm.name AS room_name,
                    b.name AS building_name,
                    l.name AS location_name
             FROM device_panel_port_sfp s
             LEFT JOIN sfp_types t ON t.id = s.sfp_type_id
             LEFT JOIN device_panels p ON p.id = s.panel_id
             LEFT JOIN rack_items r ON r.id = p.parent_item_id
             LEFT JOIN racks rk ON rk.id = r.rack_id
             LEFT JOIN rooms rm ON rm.id = rk.room_id
             LEFT JOIN buildings b ON b.id = rm.building_id
             LEFT JOIN locations l ON l.id = b.location_id
             ORDER BY r.name, p.name, s.port_number`
        );

        const panelRows = getAll(db, 'SELECT id, name, parent_panel_id FROM device_panels');
        const panelMap = new Map(panelRows.map((panel) => [panel.id, panel]));

        const buildPanelPath = (panelId) => {
            const parts = [];
            let current = panelMap.get(panelId);
            const seen = new Set();
            while (current && !seen.has(current.id)) {
                seen.add(current.id);
                parts.unshift(current.name || `Panel ${current.id}`);
                current = current.parent_panel_id ? panelMap.get(current.parent_panel_id) : null;
            }
            return parts.join(' / ');
        };

        const enriched = rows.map((row) => ({
            ...row,
            panel_path: row.panel_id ? buildPanelPath(row.panel_id) : ''
        }));

        const filtered = query
            ? enriched.filter((row) => {
                const typeName = (row.sfp_type_name || '').toLowerCase();
                const owner = (row.owner || '').toLowerCase();
                const serial = (row.serial || '').toLowerCase();
                const deviceName = (row.device_name || '').toLowerCase();
                const location = [row.location_name, row.building_name, row.room_name, row.rack_name]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return typeName.includes(query) || owner.includes(query) || serial.includes(query);
            })
            : enriched;

        return res.json({ items: filtered });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/device-panels/:id/connections', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id FROM device_panels WHERE id = ?', [panelId]);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const rows = getAll(
            db,
            'SELECT device_port_number, panel_item_id, panel_port_number, medium FROM panel_device_ports WHERE device_panel_id = ? ORDER BY device_port_number',
            [panelId]
        );
        return res.json({
            panelId: panel.id,
            connections: rows
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/panel-device-ports/link', authMiddleware, async (req, res) => {
    const { panelId, panelPort, devicePanelId, devicePort, medium } = req.body || {};
    const panelItemId = Number(panelId);
    const panelPortNum = Number(panelPort);
    const devicePanel = Number(devicePanelId);
    const devicePortNum = Number(devicePort);
    if (!Number.isInteger(panelItemId) || !Number.isInteger(devicePanel)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!Number.isInteger(panelPortNum) || !Number.isInteger(devicePortNum) || panelPortNum < 1 || devicePortNum < 1) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id, port_count FROM rack_items WHERE id = ? AND type = ?', [panelItemId, 'panel']);
        const device = getOne(db, 'SELECT id, port_count FROM device_panels WHERE id = ?', [devicePanel]);
        if (!panel || !device) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        if (panelPortNum > (panel.port_count || 0) || devicePortNum > (device.port_count || 0)) {
            return res.status(400).json({ error: 'Port out of range' });
        }
        const existingPanel = getOne(
            db,
            'SELECT device_panel_id, device_port_number FROM panel_device_ports WHERE panel_item_id = ? AND panel_port_number = ?',
            [panelItemId, panelPortNum]
        );
        if (existingPanel && (existingPanel.device_panel_id !== devicePanel || existingPanel.device_port_number !== devicePortNum)) {
            return res.status(400).json({ error: 'Port already assigned' });
        }
        const existingDevice = getOne(
            db,
            'SELECT panel_item_id, panel_port_number FROM panel_device_ports WHERE device_panel_id = ? AND device_port_number = ?',
            [devicePanel, devicePortNum]
        );
        if (existingDevice && (existingDevice.panel_item_id !== panelItemId || existingDevice.panel_port_number !== panelPortNum)) {
            return res.status(400).json({ error: 'Target port already assigned' });
        }
        const resolvedMedium = normalizeMedium(medium) || null;
        const panelPortMeta = getOne(
            db,
            'SELECT medium FROM panel_ports WHERE panel_item_id = ? AND port_number = ?',
            [panelItemId, panelPortNum]
        );
        const panelMedium = normalizeMedium(panelPortMeta?.medium);
        if (panelMedium && resolvedMedium && panelMedium !== resolvedMedium) {
            return res.status(400).json({ error: 'Medium mismatch (panel port)' });
        }
        if (panelMedium && !resolvedMedium) {
            return res.status(400).json({ error: 'Medium required (panel port)' });
        }
        if (!existingPanel) {
            db.run(
                'INSERT INTO panel_device_ports (panel_item_id, panel_port_number, device_panel_id, device_port_number, medium) VALUES (?, ?, ?, ?, ?)',
                [panelItemId, panelPortNum, devicePanel, devicePortNum, resolvedMedium]
            );
        } else if (resolvedMedium) {
            db.run(
                'UPDATE panel_device_ports SET medium = ? WHERE panel_item_id = ? AND panel_port_number = ? AND device_panel_id = ? AND device_port_number = ?',
                [resolvedMedium, panelItemId, panelPortNum, devicePanel, devicePortNum]
            );
        }
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/panel-device-ports/link', authMiddleware, async (req, res) => {
    const { panelId, panelPort, devicePanelId, devicePort } = req.body || {};
    const panelItemId = Number(panelId);
    const panelPortNum = Number(panelPort);
    const devicePanel = Number(devicePanelId);
    const devicePortNum = Number(devicePort);
    if (!Number.isInteger(panelItemId) || !Number.isInteger(devicePanel)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!Number.isInteger(panelPortNum) || !Number.isInteger(devicePortNum) || panelPortNum < 1 || devicePortNum < 1) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    try {
        const db = await getDb();
        db.run(
            'DELETE FROM panel_device_ports WHERE (panel_item_id = ? AND panel_port_number = ?) OR (device_panel_id = ? AND device_port_number = ?)',
            [panelItemId, panelPortNum, devicePanel, devicePortNum]
        );
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/device-panel-ports/link', authMiddleware, async (req, res) => {
    const { fromPanelId, fromPort, toPanelId, toPort, medium } = req.body || {};
    const sourcePanelId = Number(fromPanelId);
    const sourcePort = Number(fromPort);
    const targetPanelId = Number(toPanelId);
    const targetPort = Number(toPort);
    if (!Number.isInteger(sourcePanelId) || !Number.isInteger(targetPanelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!Number.isInteger(sourcePort) || !Number.isInteger(targetPort) || sourcePort < 1 || targetPort < 1) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    if (sourcePanelId === targetPanelId && sourcePort === targetPort) {
        return res.status(400).json({ error: 'Ports must be different' });
    }
    try {
        const db = await getDb();
        const sourcePanel = getOne(
            db,
            'SELECT id, port_count FROM device_panels WHERE id = ?',
            [sourcePanelId]
        );
        const targetPanel = getOne(
            db,
            'SELECT id, port_count FROM device_panels WHERE id = ?',
            [targetPanelId]
        );
        if (!sourcePanel || !targetPanel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const sourceCount = Number(sourcePanel.port_count) || 0;
        const targetCount = Number(targetPanel.port_count) || 0;
        if (sourcePort > sourceCount || targetPort > targetCount) {
            return res.status(400).json({ error: 'Port out of range' });
        }

        const existingSource = getOne(
            db,
            'SELECT linked_panel_id, linked_port_number FROM device_panel_ports WHERE panel_id = ? AND port_number = ?',
            [sourcePanelId, sourcePort]
        );
        if (
            existingSource &&
            (existingSource.linked_panel_id !== targetPanelId || existingSource.linked_port_number !== targetPort)
        ) {
            return res.status(400).json({ error: 'Port already assigned' });
        }
        const existingTarget = getOne(
            db,
            'SELECT linked_panel_id, linked_port_number FROM device_panel_ports WHERE panel_id = ? AND port_number = ?',
            [targetPanelId, targetPort]
        );
        if (
            existingTarget &&
            (existingTarget.linked_panel_id !== sourcePanelId || existingTarget.linked_port_number !== sourcePort)
        ) {
            return res.status(400).json({ error: 'Target port already assigned' });
        }

        const resolvedMedium = normalizeMedium(medium) || null;
        if (!existingSource) {
            db.run(
                'INSERT INTO device_panel_ports (panel_id, port_number, linked_panel_id, linked_port_number, medium) VALUES (?, ?, ?, ?, ?)',
                [sourcePanelId, sourcePort, targetPanelId, targetPort, resolvedMedium]
            );
        } else if (resolvedMedium) {
            db.run(
                'UPDATE device_panel_ports SET medium = ? WHERE panel_id = ? AND port_number = ? AND linked_panel_id = ? AND linked_port_number = ?',
                [resolvedMedium, sourcePanelId, sourcePort, targetPanelId, targetPort]
            );
        }
        if (!existingTarget) {
            db.run(
                'INSERT INTO device_panel_ports (panel_id, port_number, linked_panel_id, linked_port_number, medium) VALUES (?, ?, ?, ?, ?)',
                [targetPanelId, targetPort, sourcePanelId, sourcePort, resolvedMedium]
            );
        } else if (resolvedMedium) {
            db.run(
                'UPDATE device_panel_ports SET medium = ? WHERE panel_id = ? AND port_number = ? AND linked_panel_id = ? AND linked_port_number = ?',
                [resolvedMedium, targetPanelId, targetPort, sourcePanelId, sourcePort]
            );
        }
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/device-panel-ports/link', authMiddleware, async (req, res) => {
    const { fromPanelId, fromPort, toPanelId, toPort } = req.body || {};
    const sourcePanelId = Number(fromPanelId);
    const sourcePort = Number(fromPort);
    const targetPanelId = Number(toPanelId);
    const targetPort = Number(toPort);
    if (!Number.isInteger(sourcePanelId) || !Number.isInteger(targetPanelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!Number.isInteger(sourcePort) || !Number.isInteger(targetPort) || sourcePort < 1 || targetPort < 1) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    try {
        const db = await getDb();
        db.run(
            'DELETE FROM device_panel_ports WHERE (panel_id = ? AND port_number = ?) OR (panel_id = ? AND port_number = ?)',
            [sourcePanelId, sourcePort, targetPanelId, targetPort]
        );
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/devices/:id/panels', authMiddleware, async (req, res) => {
    const itemId = Number(req.params.id);
    const { name, portCount, portRows, portFlow } = req.body || {};
    if (!Number.isInteger(itemId)) {
        return res.status(400).json({ error: 'Invalid item id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const portValue = portCount !== undefined && portCount !== null ? Number(portCount) : null;
    if (portValue !== null && (!Number.isInteger(portValue) || portValue < 0)) {
        return res.status(400).json({ error: 'Invalid port count' });
    }
    const rowsValue = portRows !== undefined && portRows !== null ? Number(portRows) : 1;
    if (!Number.isInteger(rowsValue) || rowsValue < 1) {
        return res.status(400).json({ error: 'Invalid port rows' });
    }
    const flowValue = portFlow === 'column' ? 'column' : 'row';
    try {
        const db = await getDb();
        const item = getOne(db, 'SELECT id, type FROM rack_items WHERE id = ?', [itemId]);
        if (!item || !['device', 'server'].includes(item.type)) {
            return res.status(404).json({ error: 'Device not found' });
        }
        db.run(
            'INSERT INTO device_panels (parent_item_id, parent_panel_id, name, port_count, port_rows, port_flow) VALUES (?, ?, ?, ?, ?, ?)',
            [itemId, null, name.trim(), portValue, rowsValue, flowValue]
        );
        const created = getOne(
            db,
            'SELECT id, parent_item_id, parent_panel_id, name, port_count, port_rows, port_flow FROM device_panels ORDER BY id DESC LIMIT 1'
        );
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/panel-ports/link', authMiddleware, async (req, res) => {
    const { fromPanelId, fromPort, toPanelId, toPort } = req.body || {};
    const sourcePanelId = Number(fromPanelId);
    const sourcePort = Number(fromPort);
    const targetPanelId = Number(toPanelId);
    const targetPort = Number(toPort);
    if (!Number.isInteger(sourcePanelId) || !Number.isInteger(targetPanelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!Number.isInteger(sourcePort) || !Number.isInteger(targetPort) || sourcePort < 1 || targetPort < 1) {
        return res.status(400).json({ error: 'Invalid port number' });
    }
    try {
        const db = await getDb();
        db.run(
            'DELETE FROM panel_port_connections WHERE (panel_item_id = ? AND port_number = ?) OR (panel_item_id = ? AND port_number = ?)',
            [sourcePanelId, sourcePort, targetPanelId, targetPort]
        );
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/connections/clear', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        db.run('DELETE FROM panel_port_connections');
        db.run('DELETE FROM panel_device_ports');
        db.run('DELETE FROM device_panel_ports');
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/device-panels/:id/children', authMiddleware, async (req, res) => {
    const parentId = Number(req.params.id);
    const { name, portCount, portRows, portFlow } = req.body || {};
    if (!Number.isInteger(parentId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const portValue = portCount !== undefined && portCount !== null ? Number(portCount) : null;
    if (portValue !== null && (!Number.isInteger(portValue) || portValue < 0)) {
        return res.status(400).json({ error: 'Invalid port count' });
    }
    const rowsValue = portRows !== undefined && portRows !== null ? Number(portRows) : 1;
    if (!Number.isInteger(rowsValue) || rowsValue < 1) {
        return res.status(400).json({ error: 'Invalid port rows' });
    }
    const flowValue = portFlow === 'column' ? 'column' : 'row';
    try {
        const db = await getDb();
        const parent = getOne(
            db,
            'SELECT id, parent_item_id FROM device_panels WHERE id = ?',
            [parentId]
        );
        if (!parent) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        db.run(
            'INSERT INTO device_panels (parent_item_id, parent_panel_id, name, port_count, port_rows, port_flow) VALUES (?, ?, ?, ?, ?, ?)',
            [parent.parent_item_id, parent.id, name.trim(), portValue, rowsValue, flowValue]
        );
        const created = getOne(
            db,
            'SELECT id, parent_item_id, parent_panel_id, name, port_count, port_rows, port_flow FROM device_panels ORDER BY id DESC LIMIT 1'
        );
        persistDb(db);
        return res.status(201).json(created);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/devices/:id/panels/bulk', authMiddleware, async (req, res) => {
    const itemId = Number(req.params.id);
    const { panels } = req.body || {};
    if (!Number.isInteger(itemId)) {
        return res.status(400).json({ error: 'Invalid item id' });
    }
    if (!Array.isArray(panels)) {
        return res.status(400).json({ error: 'Invalid panels payload' });
    }
    try {
        const db = await getDb();
        const item = getOne(db, 'SELECT id, type FROM rack_items WHERE id = ?', [itemId]);
        if (!item || !['device', 'server'].includes(item.type)) {
            return res.status(404).json({ error: 'Device not found' });
        }
        const idMap = new Map();
        panels.forEach((panel) => {
            if (!panel || !panel.tempId) return;
            const name = String(panel.name || '').trim();
            if (!name) return;
            const portValue = panel.portCount !== undefined && panel.portCount !== null ? Number(panel.portCount) : null;
            if (portValue !== null && (!Number.isInteger(portValue) || portValue < 0)) return;
            const rowsValue = panel.portRows !== undefined && panel.portRows !== null ? Number(panel.portRows) : 1;
            if (!Number.isInteger(rowsValue) || rowsValue < 1) return;
            const flowValue = panel.portFlow === 'column' ? 'column' : 'row';
            const parentTempId = panel.parentTempId || null;
            const parentPanelId = parentTempId ? idMap.get(parentTempId) || null : null;
            db.run(
                'INSERT INTO device_panels (parent_item_id, parent_panel_id, name, port_count, port_rows, port_flow) VALUES (?, ?, ?, ?, ?, ?)',
                [itemId, parentPanelId, name, portValue, rowsValue, flowValue]
            );
            const created = getOne(
                db,
                'SELECT id FROM device_panels ORDER BY id DESC LIMIT 1'
            );
            if (created?.id) {
                idMap.set(panel.tempId, created.id);
            }
        });
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/templates', authMiddleware, async (req, res) => {
    const type = normalizeTemplateType(req.query?.type);
    try {
        const db = await getDb();
        const rows = type
            ? getAll(db, 'SELECT id, name, type, payload FROM templates WHERE type = ? ORDER BY name', [type])
            : getAll(db, 'SELECT id, name, type, payload FROM templates ORDER BY name');
        const templates = rows.map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            payload: JSON.parse(row.payload)
        }));
        return res.json(templates);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/templates', authMiddleware, async (req, res) => {
    const { name, type, payload } = req.body || {};
    const normalizedType = normalizeTemplateType(type);
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (!normalizedType) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    try {
        const db = await getDb();
        db.run('INSERT INTO templates (name, type, payload) VALUES (?, ?, ?)', [
            String(name).trim(),
            normalizedType,
            JSON.stringify(payload || {})
        ]);
        const created = getOne(db, 'SELECT id, name, type, payload FROM templates ORDER BY id DESC LIMIT 1');
        persistDb(db);
        return res.status(201).json({
            id: created.id,
            name: created.name,
            type: created.type,
            payload: JSON.parse(created.payload)
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/templates/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { name, payload } = req.body || {};
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id, type FROM templates WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }
        db.run('UPDATE templates SET name = ?, payload = ? WHERE id = ?', [
            String(name).trim(),
            JSON.stringify(payload || {}),
            id
        ]);
        const updated = getOne(db, 'SELECT id, name, type, payload FROM templates WHERE id = ?', [id]);
        persistDb(db);
        return res.json({
            id: updated.id,
            name: updated.name,
            type: updated.type,
            payload: JSON.parse(updated.payload)
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/templates/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM templates WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }
        db.run('DELETE FROM templates WHERE id = ?', [id]);
        persistDb(db);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/device-panels/:id', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    const { name, portCount, portRows, portFlow } = req.body || {};
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const portValue = portCount !== undefined && portCount !== null ? Number(portCount) : null;
    if (portValue !== null && (!Number.isInteger(portValue) || portValue < 0)) {
        return res.status(400).json({ error: 'Invalid port count' });
    }
    const rowsValue = portRows !== undefined && portRows !== null ? Number(portRows) : 1;
    if (!Number.isInteger(rowsValue) || rowsValue < 1) {
        return res.status(400).json({ error: 'Invalid port rows' });
    }
    const flowValue = portFlow === 'column' ? 'column' : 'row';
    try {
        const db = await getDb();
        const existing = getOne(db, 'SELECT id FROM device_panels WHERE id = ?', [panelId]);
        if (!existing) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        db.run('UPDATE device_panels SET name = ?, port_count = ?, port_rows = ?, port_flow = ? WHERE id = ?', [
            name.trim(),
            portValue,
            rowsValue,
            flowValue,
            panelId
        ]);
        const updated = getOne(
            db,
            'SELECT id, parent_item_id, parent_panel_id, name, port_count, port_rows, port_flow FROM device_panels WHERE id = ?',
            [panelId]
        );
        persistDb(db);
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/device-panels/:id', authMiddleware, async (req, res) => {
    const panelId = Number(req.params.id);
    if (!Number.isInteger(panelId)) {
        return res.status(400).json({ error: 'Invalid panel id' });
    }
    try {
        const db = await getDb();
        const panel = getOne(db, 'SELECT id, parent_item_id FROM device_panels WHERE id = ?', [panelId]);
        if (!panel) {
            return res.status(404).json({ error: 'Panel not found' });
        }
        const panels = getAll(
            db,
            'SELECT id, parent_panel_id FROM device_panels WHERE parent_item_id = ?',
            [panel.parent_item_id]
        );
        const descendants = buildPanelDescendantSet(panels, panelId);
        const idsToDelete = [panelId, ...descendants];
        const placeholders = idsToDelete.map(() => '?').join(',');
        db.run(`DELETE FROM device_panel_ports WHERE panel_id IN (${placeholders})`, idsToDelete);
        db.run(`DELETE FROM panel_device_ports WHERE device_panel_id IN (${placeholders})`, idsToDelete);
        db.run(`DELETE FROM device_panels WHERE id IN (${placeholders})`, idsToDelete);
        persistDb(db);
        return res.json({ deletedIds: idsToDelete });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
});

const resolvedClientDistPath = (() => {
    const candidates = [
        process.env.CLIENT_BUILD_DIR ? path.resolve(__dirname, process.env.CLIENT_BUILD_DIR) : null,
        path.join(__dirname, 'dist'),
        path.join(__dirname, 'client', 'dist'),
        path.join(__dirname, '..', 'client', 'dist')
    ].filter(Boolean);
    return candidates.find((candidate) => fs.existsSync(candidate)) || path.join(__dirname, 'dist');
})();

app.use(express.static(resolvedClientDistPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(resolvedClientDistPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
