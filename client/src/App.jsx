import React, { useEffect, useMemo, useState } from 'react';
import logo from './assets/logo2.png';
import { apiRequest } from './api.js';
import { clearSession, getRemainingMs, getSession, saveSession } from './auth.js';

const defaultForm = { username: '', password: '' };

function LoginForm({ onLogin, error, loading }) {
    const [form, setForm] = useState(defaultForm);

    return (
        <div className="card">
            <div className="login-brand">
                <img src={logo} alt="S.H.I.E.L.D." className="login-logo" />
                <div>
                    <h1>S.H.I.E.L.D.</h1>
                    <p className="helper">System Hierarchizowanej Infrastruktury Ewidencjonowanej Logicznie i Dysków</p>
                </div>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onLogin(form);
                }}
            >
                <label>
                    Login
                    <input
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        required
                    />
                </label>
                <label>
                    Hasło
                    <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                    />
                </label>
                {error && <p className="error">{error}</p>}
                <button className="primary" type="submit" disabled={loading}>
                    {loading ? 'Logowanie...' : 'Zaloguj'}
                </button>
            </form>
        </div>
    );
}

function ChangePasswordForm({ onSubmit, onCancel, error, loading, force, profile, onSaveProfile, profileSaving }) {
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [localError, setLocalError] = useState('');
    const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '' });
    const [profileError, setProfileError] = useState('');
    const [profileSaved, setProfileSaved] = useState(false);

    useEffect(() => {
        setProfileForm({
            firstName: profile?.firstName || '',
            lastName: profile?.lastName || ''
        });
    }, [profile?.firstName, profile?.lastName]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLocalError('');
        if (!form.oldPassword || !form.newPassword) {
            setLocalError('Wszystkie pola są wymagane.');
            return;
        }
        if (form.newPassword.length < 8) {
            setLocalError('Nowe hasło musi mieć co najmniej 8 znaków.');
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            setLocalError('Hasła nie są takie same.');
            return;
        }
        onSubmit({ oldPassword: form.oldPassword, newPassword: form.newPassword });
    };

    const handleSaveProfile = async () => {
        if (!onSaveProfile) return;
        setProfileError('');
        setProfileSaved(false);
        try {
            await onSaveProfile(profileForm);
            setProfileSaved(true);
        } catch (err) {
            setProfileError(err.message || 'Nie udało się zapisać danych.');
        }
    };

    return (
        <div className="card account-card">
            <h1>{force ? 'Wymagana zmiana hasła' : 'Zmień hasło'}</h1>
            <div className="account-grid">
                <div className="account-profile">
                    <h4>Dane konta</h4>
                    <label>
                        Imię
                        <input
                            value={profileForm.firstName}
                            onChange={(e) =>
                                setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))
                            }
                        />
                    </label>
                    <label>
                        Nazwisko
                        <input
                            value={profileForm.lastName}
                            onChange={(e) =>
                                setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))
                            }
                        />
                    </label>
                    {profileError && <p className="error">{profileError}</p>}
                    {profileSaved && <p className="helper">Zapisano dane.</p>}
                    <div className="actions">
                        <button
                            className="secondary"
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={profileSaving}
                        >
                            {profileSaving ? 'Zapisywanie...' : 'Zapisz dane'}
                        </button>
                    </div>
                </div>
                <form className="account-password" onSubmit={handleSubmit}>
                    <label>
                        Obecne hasło
                        <input
                            type="password"
                            value={form.oldPassword}
                            onChange={(e) => setForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                            required
                        />
                    </label>
                    <label>
                        Nowe hasło
                        <input
                            type="password"
                            value={form.newPassword}
                            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                            required
                        />
                    </label>
                    <label>
                        Powtórz nowe hasło
                        <input
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                        />
                    </label>
                    {(localError || error) && <p className="error">{localError || error}</p>}
                    <div className="actions">
                        {!force && (
                            <button className="secondary" type="button" onClick={onCancel} disabled={loading}>
                                Anuluj
                            </button>
                        )}
                        <button className="primary" type="submit" disabled={loading}>
                            {loading ? 'Zapisywanie...' : 'Zapisz hasło'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SessionCard({
    username,
    expiresAt,
    onLogout,
    onChangePassword,
    onOpenUsers,
    onBack,
    isAdmin,
    pageTitle,
    breadcrumb,
    headerControls
}) {
    const remainingMs = useMemo(() => (expiresAt ? getRemainingMs(expiresAt) : 0), [expiresAt]);
    let expiryLabel = 'Sesja aktywna';
    if (expiresAt) {
        if (remainingMs <= 0) {
            expiryLabel = 'Sesja wygasa...';
        } else {
            const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
            expiryLabel = `Sesja wygasa za ${minutes} min`;
        }
    }

    return (
        <div className="card session-bar">
            <div className="session-bar-content">
                <div>
                    <h1>{pageTitle || 'Panel'}</h1>
                    {breadcrumb && <div className="session-breadcrumb">{breadcrumb}</div>}
                    <p>
                        Zalogowano: {username}
                        {isAdmin ? ' (administrator)' : ''} • {expiryLabel}
                    </p>
                </div>
                <div className="actions">
                    {onBack && (
                        <button className="secondary" type="button" onClick={onBack}>
                            Wróć
                        </button>
                    )}
                    {onOpenUsers && (
                        <button className="secondary" type="button" onClick={onOpenUsers}>
                            Użytkownicy
                        </button>
                    )}
                    {onChangePassword && (
                        <button className="secondary" type="button" onClick={onChangePassword}>
                            Zmień hasło
                        </button>
                    )}
                    {onLogout && (
                        <button className="danger" type="button" onClick={onLogout}>
                            Wyloguj
                        </button>
                    )}
                </div>
            </div>
            {headerControls && (
                <div className="session-controls">
                    {headerControls.onBack && (
                        <button
                            className="secondary"
                            type="button"
                            onClick={headerControls.onBack}
                        >
                            {headerControls.backText || 'Wróć'}
                        </button>
                    )}
                    {headerControls.searchPlaceholder && (
                        <input
                            className="search compact"
                            placeholder={headerControls.searchPlaceholder}
                            value={headerControls.query || ''}
                            onChange={(e) => headerControls.onQueryChange?.(e.target.value)}
                        />
                    )}
                    {headerControls.onAdd && (
                        <button
                            className="primary"
                            type="button"
                            onClick={headerControls.onAdd}
                        >
                            {headerControls.addText || 'Dodaj'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function buildTree(locations) {
    const map = new Map();
    locations.forEach((loc) => map.set(loc.id, { ...loc, children: [] }));
    const roots = [];
    map.forEach((loc) => {
        if (loc.parent_id) {
            const parent = map.get(loc.parent_id);
            if (parent) {
                parent.children.push(loc);
                return;
            }
        }
        roots.push(loc);
    });
    return roots;
}

function flattenTree(nodes, depth = 0) {
    const result = [];
    nodes
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((node) => {
            result.push({ node, depth });
            result.push(...flattenTree(node.children || [], depth + 1));
        });
    return result;
}

function flattenTreeWithCollapse(nodes, depth, options) {
    const result = [];
    nodes
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((node) => {
            if (options.visibleIds && !options.visibleIds.has(node.id)) {
                return;
            }
            result.push({ node, depth });
            const isCollapsed = options.collapsedIds.has(node.id);
            if (!isCollapsed) {
                result.push(...flattenTreeWithCollapse(node.children || [], depth + 1, options));
            }
        });
    return result;
}

function buildLocationPath(locations, locationId) {
    if (!locationId) return [];
    const byId = new Map(locations.map((loc) => [loc.id, loc]));
    const path = [];
    let current = byId.get(locationId);
    while (current) {
        path.unshift(current.name);
        current = current.parent_id ? byId.get(current.parent_id) : null;
    }
    return path;
}

function getDescendantIds(locations, rootId) {
    const childrenByParent = new Map();
    locations.forEach((loc) => {
        const key = loc.parent_id ?? null;
        if (!childrenByParent.has(key)) {
            childrenByParent.set(key, []);
        }
        childrenByParent.get(key).push(loc);
    });
    const result = new Set();
    const stack = [rootId];
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

function LocationsManager({ token, onOpenBuildings }) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', parentId: '' });
    const [showForm, setShowForm] = useState(false);
    const [query, setQuery] = useState('');
    const [collapsedIds, setCollapsedIds] = useState(() => new Set());

    const tree = buildTree(locations);
    const allFlat = flattenTree(tree);

    const trimmedQuery = query.trim().toLowerCase();
    const matchedIds = new Set(
        trimmedQuery
            ? locations
                .filter((loc) => loc.name.toLowerCase().includes(trimmedQuery))
                .map((loc) => loc.id)
            : []
    );

    const parentsById = new Map(locations.map((loc) => [loc.id, loc.parent_id]));
    const ancestorIds = new Set();
    if (trimmedQuery) {
        matchedIds.forEach((id) => {
            let current = parentsById.get(id);
            while (current) {
                ancestorIds.add(current);
                current = parentsById.get(current);
            }
        });
    }

    const visibleIds = trimmedQuery ? new Set([...matchedIds, ...ancestorIds]) : null;

    const flat = flattenTreeWithCollapse(tree, 0, {
        visibleIds,
        collapsedIds
    });

    useEffect(() => {
        if (!trimmedQuery) return;
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            ancestorIds.forEach((id) => next.delete(id));
            return next;
        });
    }, [trimmedQuery, locations]);

    useEffect(() => {
        if (!token) return;
        reload();
    }, [token]);

    async function reload() {
        setLoading(true);
        setError('');
        try {
            const data = await apiRequest('/api/locations', { token });
            setLocations(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function startCreate() {
        setEditingId(null);
        setForm({ name: '', parentId: '' });
        setError('');
        setShowForm(false);
    }

    function startEdit(location) {
        setEditingId(location.id);
        setForm({ name: location.name, parentId: location.parent_id ?? '' });
        setError('');
        setShowForm(true);
    }

    function toggleCollapse(id) {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                name: form.name,
                parentId: form.parentId === '' ? null : Number(form.parentId)
            };
            if (editingId) {
                await apiRequest(`/api/locations/${editingId}`, {
                    method: 'PUT',
                    body: payload,
                    token
                });
            } else {
                await apiRequest('/api/locations', {
                    method: 'POST',
                    body: payload,
                    token
                });
            }
            await reload();
            startCreate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Czy na pewno chcesz usunąć tę lokalizację?')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiRequest(`/api/locations/${id}`, { method: 'DELETE', token });
            await reload();
            if (editingId === id) {
                startCreate();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const invalidParentIds = editingId
        ? new Set([editingId, ...getDescendantIds(locations, editingId)])
        : new Set();

    return (
        <div className="card">
            <h1>Lokalizacje</h1>
            <input
                className="search"
                placeholder="Szukaj lokalizacji..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            <div className="locations-list">
                {flat.length === 0 && !loading && <p>Brak lokalizacji.</p>}
                {flat.map(({ node, depth }) => (
                    <div
                        key={node.id}
                        className={`location-row ${depth > 0 ? `location-row-child depth-${depth}` : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenBuildings(node)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onOpenBuildings(node);
                            }
                        }}
                    >
                        <div className="location-name" style={{ paddingLeft: `${depth * 18}px` }}>
                            <span>{node.name}</span>
                        </div>
                        <div className="location-actions" onClick={(e) => e.stopPropagation()}>
                            {node.children?.length > 0 && (
                                <button className="ghost" onClick={() => toggleCollapse(node.id)}>
                                    {collapsedIds.has(node.id) ? 'Rozwiń' : 'Zwiń'}
                                </button>
                            )}
                            <button className="secondary" onClick={() => startEdit(node)}>
                                Edytuj
                            </button>
                            <button className="danger" onClick={() => handleDelete(node.id)}>
                                Usuń
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {!showForm && (
                <div className="actions">
                    <button className="primary" onClick={() => setShowForm(true)}>
                        Dodaj nową
                    </button>
                </div>
            )}

            {showForm && (
                <>
                    <h2>{editingId ? 'Edytuj lokalizację' : 'Dodaj lokalizację'}</h2>
                    <form onSubmit={handleSubmit} className="locations-form">
                        <label>
                            Nazwa
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </label>
                        <label>
                            Lokalizacja nadrzędna
                            <select
                                value={form.parentId}
                                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                            >
                                <option value="">(brak)</option>
                                {allFlat.map(({ node, depth }) => (
                                    <option
                                        key={node.id}
                                        value={node.id}
                                        disabled={invalidParentIds.has(node.id)}
                                    >
                                        {'—'.repeat(depth)} {node.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="actions">
                            <button className="secondary" type="button" onClick={startCreate}>
                                Anuluj
                            </button>
                            <button className="primary" type="submit" disabled={loading}>
                                {editingId ? 'Zapisz zmiany' : 'Dodaj'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}

function BuildingsManager({
    token,
    location,
    onBack,
    onOpenRooms,
    breadcrumb,
    query,
    onQueryChange,
    showForm,
    setShowForm
}) {
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '' });

    useEffect(() => {
        if (!token || !location?.id) return;
        reload();
    }, [token, location?.id]);

    async function reload() {
        setLoading(true);
        setError('');
        try {
            const data = await apiRequest(`/api/locations/${location.id}/buildings`, { token });
            setBuildings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function startCreate() {
        setEditingId(null);
        setForm({ name: '' });
        setError('');
        setShowForm(false);
    }

    function startEdit(building) {
        setEditingId(building.id);
        setForm({ name: building.name });
        setError('');
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { name: form.name };
            if (editingId) {
                await apiRequest(`/api/buildings/${editingId}`, {
                    method: 'PUT',
                    body: payload,
                    token
                });
            } else {
                await apiRequest(`/api/locations/${location.id}/buildings`, {
                    method: 'POST',
                    body: payload,
                    token
                });
            }
            await reload();
            startCreate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Czy na pewno chcesz usunąć ten budynek?')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiRequest(`/api/buildings/${id}`, { method: 'DELETE', token });
            await reload();
            if (editingId === id) {
                startCreate();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filtered = query.trim()
        ? buildings.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
        : buildings;

    return (
        <div className="card">
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            <div className="users-list">
                {filtered.length === 0 && !loading && <p>Brak budynków.</p>}
                {filtered.map((building) => (
                    <div
                        key={building.id}
                        className="user-row row-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenRooms(building)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onOpenRooms(building);
                            }
                        }}
                    >
                        <div>
                            <strong>{building.name}</strong>
                        </div>
                        <div className="location-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="secondary" onClick={() => startEdit(building)}>
                                Edytuj
                            </button>
                            <button className="danger" onClick={() => handleDelete(building.id)}>
                                Usuń
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {showForm && (
                <>
                    <h2>{editingId ? 'Edytuj budynek' : 'Dodaj budynek'}</h2>
                    <form onSubmit={handleSubmit}>
                        <label>
                            Nazwa
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </label>
                        <div className="actions">
                            <button className="secondary" type="button" onClick={startCreate}>
                                Anuluj
                            </button>
                            <button className="primary" type="submit" disabled={loading}>
                                {editingId ? 'Zapisz zmiany' : 'Dodaj'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}

function RoomsManager({
    token,
    building,
    onBack,
    onOpenRacks,
    breadcrumb,
    query,
    onQueryChange,
    showForm,
    setShowForm
}) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '' });

    useEffect(() => {
        if (!token || !building?.id) return;
        reload();
    }, [token, building?.id]);

    async function reload() {
        setLoading(true);
        setError('');
        try {
            const data = await apiRequest(`/api/buildings/${building.id}/rooms`, { token });
            setRooms(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function startCreate() {
        setEditingId(null);
        setForm({ name: '' });
        setError('');
        setShowForm(false);
    }

    function startEdit(room) {
        setEditingId(room.id);
        setForm({ name: room.name });
        setError('');
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { name: form.name };
            if (editingId) {
                await apiRequest(`/api/rooms/${editingId}`, {
                    method: 'PUT',
                    body: payload,
                    token
                });
            } else {
                await apiRequest(`/api/buildings/${building.id}/rooms`, {
                    method: 'POST',
                    body: payload,
                    token
                });
            }
            await reload();
            startCreate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Czy na pewno chcesz usunąć to pomieszczenie?')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiRequest(`/api/rooms/${id}`, { method: 'DELETE', token });
            await reload();
            if (editingId === id) {
                startCreate();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filtered = query.trim()
        ? rooms.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
        : rooms;

    return (
        <div className="card">
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            <div className="users-list">
                {filtered.length === 0 && !loading && <p>Brak pomieszczeń.</p>}
                {filtered.map((room) => (
                    <div
                        key={room.id}
                        className="user-row row-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenRacks(room)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onOpenRacks(room);
                            }
                        }}
                    >
                        <div>
                            <strong>{room.name}</strong>
                        </div>
                        <div className="location-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="secondary" onClick={() => startEdit(room)}>
                                Edytuj
                            </button>
                            <button className="danger" onClick={() => handleDelete(room.id)}>
                                Usuń
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {showForm && (
                <>
                    <h2>{editingId ? 'Edytuj pomieszczenie' : 'Dodaj pomieszczenie'}</h2>
                    <form onSubmit={handleSubmit}>
                        <label>
                            Nazwa
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </label>
                        <div className="actions">
                            <button className="secondary" type="button" onClick={startCreate}>
                                Anuluj
                            </button>
                            <button className="primary" type="submit" disabled={loading}>
                                {editingId ? 'Zapisz zmiany' : 'Dodaj'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}

function RacksManager({
    token,
    room,
    onBack,
    breadcrumb,
    query,
    onQueryChange,
    showForm,
    setShowForm,
    onOpenRack
}) {
    const [racks, setRacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', heightU: 42 });

    useEffect(() => {
        if (!token || !room?.id) return;
        reload();
    }, [token, room?.id]);

    async function reload() {
        setLoading(true);
        setError('');
        try {
            const data = await apiRequest(`/api/rooms/${room.id}/racks`, { token });
            setRacks(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function startCreate() {
        setEditingId(null);
        setForm({ name: '', heightU: 42 });
        setError('');
        setShowForm(false);
    }

    function startEdit(rack) {
        setEditingId(rack.id);
        setForm({ name: rack.name, heightU: rack.height_u || 42 });
        setError('');
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { name: form.name, heightU: Number(form.heightU) };
            if (editingId) {
                await apiRequest(`/api/racks/${editingId}`, {
                    method: 'PUT',
                    body: payload,
                    token
                });
            } else {
                await apiRequest(`/api/rooms/${room.id}/racks`, {
                    method: 'POST',
                    body: payload,
                    token
                });
            }
            await reload();
            startCreate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Czy na pewno chcesz usunąć tę szafę serwerową?')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiRequest(`/api/racks/${id}`, { method: 'DELETE', token });
            await reload();
            if (editingId === id) {
                startCreate();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filtered = query.trim()
        ? racks.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
        : racks;

    return (
        <div className="card">
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            <div className="users-list">
                {filtered.length === 0 && !loading && <p>Brak szaf serwerowych.</p>}
                {filtered.map((rack) => (
                    <div
                        key={rack.id}
                        className="user-row row-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenRack(rack)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onOpenRack(rack);
                            }
                        }}
                    >
                        <div>
                            <strong>{rack.name}</strong>
                            <span className="user-meta">{rack.height_u}U</span>
                        </div>
                        <div className="location-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="secondary" onClick={() => startEdit(rack)}>
                                Edytuj
                            </button>
                            <button className="danger" onClick={() => handleDelete(rack.id)}>
                                Usuń
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {showForm && (
                <>
                    <h2>{editingId ? 'Edytuj szafę' : 'Dodaj szafę'}</h2>
                    <form onSubmit={handleSubmit}>
                        <label>
                            Nazwa
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </label>
                        <label>
                            Wysokość (U)
                            <input
                                type="number"
                                min={1}
                                value={form.heightU}
                                onChange={(e) =>
                                    setForm({ ...form, heightU: e.target.value })
                                }
                                required
                            />
                        </label>
                        <div className="actions">
                            <button className="secondary" type="button" onClick={startCreate}>
                                Anuluj
                            </button>
                            <button className="primary" type="submit" disabled={loading}>
                                {editingId ? 'Zapisz zmiany' : 'Dodaj'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}

function RackPreview({
    token,
    rack,
    location,
    building,
    room,
    onBack,
    pendingDeviceCable,
    setPendingDeviceCable,
    pendingPanelCable,
    setPendingPanelCable,
    selectedInfrastructureItems,
    setSelectedInfrastructureItems,
    selectedPanelItems,
    setSelectedPanelItems
}) {
    if (!rack) return null;
    const height = Number(rack.height_u) || 0;
    const units = Array.from({ length: height }, (_, i) => height - i);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        type: 'panel',
        startU: 1,
        heightU: 1,
        portCount: 24,
        ipv4: '',
        serial: '',
        hostname: '',
        owner: ''
    });
    const [panelModalOpen, setPanelModalOpen] = useState(false);
    const [panels, setPanels] = useState([]);
    const [panelPortTargets, setPanelPortTargets] = useState({});
    const [panelRanges, setPanelRanges] = useState([
        { start: 1, end: 1, targetPanelId: '', targetStart: 1, medium: 'utp' }
    ]);
    const [panelError, setPanelError] = useState('');
    const [panelTargetPorts, setPanelTargetPorts] = useState({});
    const [panelMeta, setPanelMeta] = useState({});
    const [panelRows, setPanelRows] = useState(1);
    const [panelFlow, setPanelFlow] = useState('row');
    const [panelLayouts, setPanelLayouts] = useState({});
    const [templates, setTemplates] = useState([]);
    const [templateId, setTemplateId] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [pendingPanelLayout, setPendingPanelLayout] = useState(null);
    const [pendingDevicePanels, setPendingDevicePanels] = useState(null);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateEditing, setTemplateEditing] = useState(null);
    const [templateEditForm, setTemplateEditForm] = useState({
        name: '',
        heightU: 1,
        portCount: '',
        portRows: 1,
        portFlow: 'row',
        devicePanels: []
    });
    const [templateEditPanelEditingId, setTemplateEditPanelEditingId] = useState(null);
    const [templateEditPanelForm, setTemplateEditPanelForm] = useState({
        name: '',
        portCount: 24,
        portRows: 1,
        portFlow: 'row',
        parentTempId: ''
    });
    const [templateEditError, setTemplateEditError] = useState('');
    const [devicePanels, setDevicePanels] = useState({});
    const [devicePanelPortTargets, setDevicePanelPortTargets] = useState({});
    const [devicePanelConnections, setDevicePanelConnections] = useState({});
    const [panelConnections, setPanelConnections] = useState({});
    const [devicePanelModalOpen, setDevicePanelModalOpen] = useState(false);
    const [devicePanelItemId, setDevicePanelItemId] = useState(null);
    const [devicePanelList, setDevicePanelList] = useState([]);
    const [devicePanelEditingId, setDevicePanelEditingId] = useState(null);
    const [devicePanelForm, setDevicePanelForm] = useState({ name: '', portCount: 24, portRows: 1, portFlow: 'row', parentPanelId: null });
    const [devicePanelError, setDevicePanelError] = useState('');
    const [serverDisksModalOpen, setServerDisksModalOpen] = useState(false);
    const [serverDiskItemId, setServerDiskItemId] = useState(null);
    const [serverDiskList, setServerDiskList] = useState([]);
    const [serverDiskEditingId, setServerDiskEditingId] = useState(null);
    const [serverDiskForm, setServerDiskForm] = useState({
        name: '',
        owner: '',
        sizeValue: '',
        sizeUnit: 'GB',
        clause: '',
        serial: '',
        assetNo: ''
    });
    const [serverDiskError, setServerDiskError] = useState('');
    const [sfpTypes, setSfpTypes] = useState([]);
    const [sfpModalOpen, setSfpModalOpen] = useState(false);
    const [sfpPanelId, setSfpPanelId] = useState(null);
    const [sfpPortNumber, setSfpPortNumber] = useState(null);
    const [sfpAssignments, setSfpAssignments] = useState({});
    const [sfpForm, setSfpForm] = useState({ sfpTypeId: '', owner: '', serial: '', newType: '' });
    const [sfpError, setSfpError] = useState('');
    // pending cable selection is managed by parent to persist across views
    const [selectedCable, setSelectedCable] = useState(null);
    const [pendingCableMedium, setPendingCableMedium] = useState('');
    const [pendingCableMediaOptions, setPendingCableMediaOptions] = useState(['utp', 'singlemode', 'multimode']);
    const [connectionsModalOpen, setConnectionsModalOpen] = useState(false);
    const layoutKey = 'connections-graph';
    const [layoutLoaded, setLayoutLoaded] = useState(false);
    const [hasAutoCentered, setHasAutoCentered] = useState(false);
    const [graphPositions, setGraphPositions] = useState({});
    const [groupLabelPositions, setGroupLabelPositions] = useState({});
    const [draggingNode, setDraggingNode] = useState(null);
    const [draggingGroup, setDraggingGroup] = useState(null);
    const [draggingRect, setDraggingRect] = useState(null);
    const [resizingRect, setResizingRect] = useState(null);
    const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
    const [panning, setPanning] = useState(null);
    const [graphZoom, setGraphZoom] = useState(1);
    const [showPanelNodes, setShowPanelNodes] = useState(true);
    const [diagramRects, setDiagramRects] = useState([]);
    const [rectFormOpen, setRectFormOpen] = useState(false);
    const [rectEditingId, setRectEditingId] = useState(null);
    const [rectForm, setRectForm] = useState({
        name: '',
        layer: 5,
        color: '#93c5fd'
    });
    const [globalGraphData, setGlobalGraphData] = useState(null);
    const [globalGraphLoading, setGlobalGraphLoading] = useState(false);
    const [globalGraphError, setGlobalGraphError] = useState('');
    const [linkModePrompt, setLinkModePrompt] = useState(null);
    const [routeProposalOpen, setRouteProposalOpen] = useState(false);
    const [routeProposalSteps, setRouteProposalSteps] = useState([]);
    const [routeProposalResults, setRouteProposalResults] = useState([]);
    const [routeProposalError, setRouteProposalError] = useState('');
    const [routeProposalLoading, setRouteProposalLoading] = useState(false);
    const [routeProposalDebug, setRouteProposalDebug] = useState([]);
    const connectionsSvgRef = React.useRef(null);

    const toggleInfrastructureSelection = (item) => {
        setSelectedInfrastructureItems((prev) => {
            const next = { ...(prev || {}) };
            if (next[item.id]) {
                delete next[item.id];
            } else {
                next[item.id] = {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    ipv4: item.ipv4 || '',
                    serial: item.serial || '',
                    hostname: item.hostname || '',
                    owner: item.owner || '',
                    rackId: rack?.id,
                    rackName: rack?.name,
                    roomId: room?.id,
                    roomName: room?.name,
                    buildingId: building?.id,
                    buildingName: building?.name,
                    locationId: location?.id,
                    locationName: location?.name
                };
            }
            return next;
        });
    };

    const togglePanelSelection = (item) => {
        setSelectedPanelItems((prev) => {
            const next = { ...(prev || {}) };
            if (next[item.id]) {
                delete next[item.id];
            } else {
                next[item.id] = {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    rackId: rack?.id,
                    rackName: rack?.name,
                    roomId: room?.id,
                    roomName: room?.name,
                    buildingId: building?.id,
                    buildingName: building?.name,
                    locationId: location?.id,
                    locationName: location?.name
                };
            }
            return next;
        });
    };


    const buildRangesFromPorts = (ports, portCount) => {
        const linked = (ports || []).filter((p) => p.linked_panel_id).sort((a, b) => a.port_number - b.port_number);
        if (linked.length === 0) return [{ start: 1, end: portCount || 1, targetPanelId: '', targetStart: 1, medium: 'utp' }];
        const ranges = [];
        let current = null;
        linked.forEach((port) => {
            if (!current) {
                current = { start: port.port_number, end: port.port_number, targetPanelId: String(port.linked_panel_id), targetStart: port.linked_port_number, medium: port.medium || 'utp' };
                return;
            }
            const continues = port.linked_panel_id === Number(current.targetPanelId) && port.port_number === current.end + 1 && port.linked_port_number === current.targetStart + (current.end - current.start) + 1 && (port.medium || 'utp') === (current.medium || 'utp');
            if (continues) {
                current.end = port.port_number;
            } else {
                ranges.push(current);
                current = { start: port.port_number, end: port.port_number, targetPanelId: String(port.linked_panel_id), targetStart: port.linked_port_number, medium: port.medium || 'utp' };
            }
        });
        if (current) ranges.push(current);
        return ranges;
    };

    const normalizeRange = (range, idx, ranges, portCountValue) => {
        const portCountNum = Math.max(1, Number(portCountValue) || 1);
        let start = Math.max(1, Number(range.start) || 1);
        let end = Math.max(start, Number(range.end) || start);
        if (start > portCountNum) start = portCountNum;
        if (end > portCountNum) end = portCountNum;

        const usedSourcePorts = new Set();
        ranges.forEach((r, i) => {
            if (i === idx) return;
            const s = Math.max(1, Number(r.start) || 1);
            const e = Math.max(s, Number(r.end) || s);
            for (let p = s; p <= e; p += 1) usedSourcePorts.add(p);
        });
        let maxSourceEnd = portCountNum;
        for (let p = start; p <= portCountNum; p += 1) {
            if (usedSourcePorts.has(p)) {
                maxSourceEnd = p - 1;
                break;
            }
        }
        if (maxSourceEnd < start) maxSourceEnd = start;
        end = Math.min(end, maxSourceEnd);

        const targetPanelId = range.targetPanelId ? String(range.targetPanelId) : '';
        let targetStart = Math.max(1, Number(range.targetStart) || 1);
        if (targetPanelId) {
            const targetPanel = panels.find((p) => String(p.id) === targetPanelId);
            const targetInfo = panelTargetPorts[targetPanelId];
            const targetPortCount = Math.max(
                1,
                Number(targetInfo?.portCount || targetPanel?.port_count) || 1
            );
            if (targetStart > targetPortCount) targetStart = targetPortCount;

            const occupied = new Map();
            if (targetInfo?.ports) {
                targetInfo.ports.forEach((p) => {
                    if (p.linked_panel_id) {
                        occupied.set(p.port_number, {
                            linked_panel_id: p.linked_panel_id,
                            linked_port_number: p.linked_port_number
                        });
                    }
                });
            }

            const usedTargetPorts = new Set();
            ranges.forEach((r, i) => {
                if (i === idx) return;
                if (String(r.targetPanelId || '') !== targetPanelId) return;
                const s = Math.max(1, Number(r.start) || 1);
                const e = Math.max(s, Number(r.end) || s);
                const length = e - s + 1;
                const tStart = Math.max(1, Number(r.targetStart) || 1);
                for (let p = tStart; p <= tStart + length - 1; p += 1) usedTargetPorts.add(p);
            });
            let maxTargetEnd = targetPortCount;
            for (let offset = 0; targetStart + offset <= targetPortCount; offset += 1) {
                const targetPort = targetStart + offset;
                if (usedTargetPorts.has(targetPort)) {
                    maxTargetEnd = targetPort - 1;
                    break;
                }
                const existing = occupied.get(targetPort);
                const currentPort = start + offset;
                if (
                    existing &&
                    (existing.linked_panel_id !== editingId ||
                        existing.linked_port_number !== currentPort)
                ) {
                    maxTargetEnd = targetPort - 1;
                    break;
                }
            }
            if (maxTargetEnd < targetStart) maxTargetEnd = targetStart;
            const maxLength = Math.max(1, maxTargetEnd - targetStart + 1);
            end = Math.min(end, start + maxLength - 1);
        }

        return {
            ...range,
            start,
            end,
            targetStart
        };
    };

    const getPanelRank = (panel) => {
        if (panel.rack_id && panel.rack_id === rack?.id) return 0;
        if (panel.room_id && panel.room_id === room?.id) return 1;
        if (panel.building_id && panel.building_id === building?.id) return 2;
        if (panel.location_id && panel.location_id === location?.id) return 3;
        return 4;
    };

    const sortedPanels = useMemo(() => {
        return [...panels].sort((a, b) => {
            const rankDiff = getPanelRank(a) - getPanelRank(b);
            if (rankDiff !== 0) return rankDiff;
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [panels, rack?.id, room?.id, building?.id, location?.id]);

    const buildPanelOptionLabel = (panel) => {
        const parts = [];
        if (panel.rack_name) parts.push(`Szafa: ${panel.rack_name}`);
        if (panel.room_name) parts.push(`Pomieszczenie: ${panel.room_name}`);
        if (panel.building_name) parts.push(`Budynek: ${panel.building_name}`);
        if (panel.location_name) parts.push(`Lokalizacja: ${panel.location_name}`);
        return `${panel.name}${parts.length ? ` — ${parts.join(' · ')}` : ''}`;
    };

    const buildDevicePanelTree = (panels) => {
        const map = new Map();
        panels.forEach((panel) => map.set(panel.id, { ...panel, children: [] }));
        const roots = [];
        map.forEach((panel) => {
            if (panel.parent_panel_id) {
                const parent = map.get(panel.parent_panel_id);
                if (parent) {
                    parent.children.push(panel);
                    return;
                }
            }
            roots.push(panel);
        });
        return roots;
    };

    const flattenDevicePanelTree = (nodes, depth = 0) => {
        const result = [];
        nodes.forEach((node) => {
            result.push({ ...node, depth });
            if (node.children?.length) {
                result.push(...flattenDevicePanelTree(node.children, depth + 1));
            }
        });
        return result;
    };

    const applyLayoutPayload = (payload) => {
        if (!payload) return;
        try {
            const parsed = JSON.parse(payload);
            if (parsed?.positions) setGraphPositions(parsed.positions);
            if (parsed?.pan && Number.isFinite(parsed.pan.x) && Number.isFinite(parsed.pan.y)) {
                setGraphPan(parsed.pan);
            }
            if (Number.isFinite(parsed?.zoom)) {
                const safeZoom = Math.min(8, Math.max(0.15, parsed.zoom));
                setGraphZoom(safeZoom);
            }
            if (Array.isArray(parsed?.rectangles)) setDiagramRects(parsed.rectangles);
            if (parsed?.groupLabelPositions && typeof parsed.groupLabelPositions === 'object') {
                setGroupLabelPositions(parsed.groupLabelPositions);
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!token || !rack?.id) return;
        reload();
    }, [token, rack?.id]);

    useEffect(() => {
        if (!connectionsModalOpen || !token) return;
        if (globalGraphData || globalGraphLoading) return;
        loadGlobalGraphData().catch(() => { });
    }, [connectionsModalOpen, token]);

    useEffect(() => {
        if (!connectionsModalOpen || !token) return;
        let cancelled = false;
        setLayoutLoaded(false);
        apiRequest(`/api/diagram-layouts-global/${layoutKey}`, { token })
            .then((res) => {
                if (cancelled) return;
                if (res?.payload) {
                    applyLayoutPayload(res.payload);
                }
                setLayoutLoaded(true);
            })
            .catch(() => setLayoutLoaded(true));
        return () => {
            cancelled = true;
        };
    }, [connectionsModalOpen, token]);

    useEffect(() => {
        if (!layoutLoaded || !token) return;
        const timeoutId = setTimeout(() => {
            apiRequest(`/api/diagram-layouts-global/${layoutKey}`, {
                method: 'PUT',
                token,
                body: {
                    payload: JSON.stringify({
                        positions: graphPositions,
                        pan: graphPan,
                        zoom: graphZoom,
                        rectangles: diagramRects,
                        groupLabelPositions
                    })
                }
            }).catch(() => { });
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [graphPositions, graphPan, graphZoom, diagramRects, groupLabelPositions, layoutLoaded, token]);

    useEffect(() => {
        if (!token) return;
        apiRequest('/api/templates', { token })
            .then(setTemplates)
            .catch(() => setTemplates([]));
    }, [token]);

    useEffect(() => {
        if (!token) return;
        loadSfpTypes();
    }, [token]);

    async function loadSfpTypes() {
        try {
            const list = await apiRequest('/api/sfp-types', { token });
            setSfpTypes(Array.isArray(list) ? list : []);
        } catch {
            setSfpTypes([]);
        }
    }

    async function loadSfpAssignments(panelId) {
        if (!panelId) return;
        try {
            const data = await apiRequest(`/api/device-panels/${panelId}/sfp`, { token });
            const map = {};
            (data?.ports || []).forEach((row) => {
                map[row.port_number] = {
                    sfpTypeId: row.sfp_type_id || '',
                    sfpTypeName: row.sfp_type_name || '',
                    owner: row.owner || '',
                    serial: row.serial || ''
                };
            });
            setSfpAssignments((prev) => ({ ...prev, [panelId]: map }));
        } catch (err) {
            setSfpError(err.message);
        }
    }

    async function openSfpModal(panelId) {
        setSfpModalOpen(true);
        setSfpPanelId(panelId);
        setSfpPortNumber(null);
        setSfpForm({ sfpTypeId: '', owner: '', serial: '', newType: '' });
        setSfpError('');
        await loadSfpAssignments(panelId);
    }

    async function handleAddSfpType() {
        const name = sfpForm.newType.trim();
        if (!name) return;
        try {
            setSfpError('');
            const created = await apiRequest('/api/sfp-types', {
                method: 'POST',
                body: { name },
                token
            });
            setSfpTypes((prev) => {
                const next = prev.filter((t) => t.id !== created.id);
                next.push(created);
                next.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                return next;
            });
            setSfpForm((prev) => ({ ...prev, sfpTypeId: String(created.id), newType: '' }));
        } catch (err) {
            setSfpError(err.message);
        }
    }

    async function saveSfpAssignment() {
        if (!sfpPanelId || !sfpPortNumber) {
            setSfpError('Wybierz gniazdo.');
            return;
        }
        try {
            setSfpError('');
            const payload = {
                portNumber: sfpPortNumber,
                sfpTypeId: sfpForm.sfpTypeId ? Number(sfpForm.sfpTypeId) : null,
                owner: sfpForm.owner,
                serial: sfpForm.serial
            };
            await apiRequest(`/api/device-panels/${sfpPanelId}/sfp`, {
                method: 'PUT',
                body: payload,
                token
            });
            setSfpAssignments((prev) => {
                const next = { ...prev };
                const map = { ...(next[sfpPanelId] || {}) };
                const hasData = payload.sfpTypeId || payload.owner || payload.serial;
                if (hasData) {
                    map[sfpPortNumber] = {
                        sfpTypeId: payload.sfpTypeId || '',
                        sfpTypeName: sfpTypes.find((t) => t.id === payload.sfpTypeId)?.name || '',
                        owner: payload.owner || '',
                        serial: payload.serial || ''
                    };
                } else {
                    delete map[sfpPortNumber];
                }
                next[sfpPanelId] = map;
                return next;
            });
        } catch (err) {
            setSfpError(err.message);
        }
    }

    async function clearSfpAssignment() {
        if (!sfpPanelId || !sfpPortNumber) {
            setSfpError('Wybierz gniazdo.');
            return;
        }
        try {
            setSfpError('');
            await apiRequest(`/api/device-panels/${sfpPanelId}/sfp`, {
                method: 'PUT',
                body: {
                    portNumber: sfpPortNumber,
                    sfpTypeId: null,
                    owner: '',
                    serial: ''
                },
                token
            });
            setSfpAssignments((prev) => {
                const next = { ...prev };
                const map = { ...(next[sfpPanelId] || {}) };
                delete map[sfpPortNumber];
                next[sfpPanelId] = map;
                return next;
            });
            setSfpForm({ sfpTypeId: '', owner: '', serial: '', newType: '' });
        } catch (err) {
            setSfpError(err.message);
        }
    }

    async function reload() {
        setLoading(true);
        setError('');
        try {
            const data = await apiRequest(`/api/racks/${rack.id}/items`, { token });
            setItems(data);
            const panelsData = await apiRequest('/api/panels', { token });
            const metaMap = {};
            panelsData.forEach((panel) => {
                metaMap[String(panel.id)] = panel;
            });
            setPanelMeta(metaMap);
            const panelItems = data.filter((item) => item.type === 'panel');
            const deviceItems = data.filter((item) => item.type === 'device' || item.type === 'server');
            if (panelItems.length > 0) {
                const results = await Promise.all(
                    panelItems.map((panel) =>
                        apiRequest(`/api/panels/${panel.id}/ports`, { token })
                            .then((portsData) => ({
                                panelId: panel.id,
                                ports: portsData.ports || [],
                                portRows: portsData.portRows || 1,
                                portFlow: portsData.portFlow === 'column' ? 'column' : 'row'
                            }))
                            .catch(() => ({ panelId: panel.id, ports: [], portRows: 1, portFlow: 'row' }))
                    )
                );
                const connectionResults = await Promise.all(
                    panelItems.map((panel) =>
                        apiRequest(`/api/panels/${panel.id}/connections`, { token })
                            .then((res) => ({ panelId: panel.id, connections: res.connections || [] }))
                            .catch(() => ({ panelId: panel.id, connections: [] }))
                    )
                );
                const cableResults = await Promise.all(
                    panelItems.map((panel) =>
                        apiRequest(`/api/panels/${panel.id}/cable-connections`, { token })
                            .then((res) => ({ panelId: panel.id, connections: res.connections || [] }))
                            .catch(() => ({ panelId: panel.id, connections: [] }))
                    )
                );
                const nextTargets = {};
                const nextLayouts = {};
                results.forEach((res) => {
                    const map = {};
                    res.ports.forEach((p) => {
                        if (p.linked_panel_id) {
                            map[p.port_number] = {
                                panelId: String(p.linked_panel_id),
                                port: p.linked_port_number,
                                medium: p.medium || 'utp'
                            };
                        }
                    });
                    nextTargets[res.panelId] = map;
                    nextLayouts[res.panelId] = {
                        rows: res.portRows || 1,
                        flow: res.portFlow || 'row'
                    };
                });
                const nextConnections = {};
                connectionResults.forEach((res) => {
                    const map = {};
                    res.connections.forEach((row) => {
                        map[row.panel_port_number] = {
                            devicePanelId: row.device_panel_id,
                            devicePort: row.device_port_number,
                            medium: row.medium || 'utp'
                        };
                    });
                    nextConnections[res.panelId] = map;
                });
                cableResults.forEach((res) => {
                    const map = { ...(nextConnections[res.panelId] || {}) };
                    res.connections.forEach((row) => {
                        map[row.port_number] = {
                            panelId: row.linked_panel_id,
                            panelPort: row.linked_port_number,
                            medium: row.medium || 'utp'
                        };
                    });
                    nextConnections[res.panelId] = map;
                });
                setPanelPortTargets(nextTargets);
                setPanelLayouts(nextLayouts);
                setPanelConnections(nextConnections);
            } else {
                setPanelPortTargets({});
                setPanelLayouts({});
                setPanelConnections({});
            }

            if (deviceItems.length > 0) {
                const deviceResults = await Promise.all(
                    deviceItems.map((item) =>
                        apiRequest(`/api/devices/${item.id}/panels`, { token })
                            .then((list) => ({ id: item.id, panels: list || [] }))
                            .catch(() => ({ id: item.id, panels: [] }))
                    )
                );
                const deviceMap = {};
                deviceResults.forEach((res) => {
                    deviceMap[res.id] = res.panels;
                });
                setDevicePanels(deviceMap);

                const allPanels = deviceResults.flatMap((res) => res.panels || []);
                if (allPanels.length > 0) {
                    const portResults = await Promise.all(
                        allPanels.map((panel) =>
                            apiRequest(`/api/device-panels/${panel.id}/ports`, { token })
                                .then((portsData) => ({ panelId: panel.id, ports: portsData.ports || [] }))
                                .catch(() => ({ panelId: panel.id, ports: [] }))
                        )
                    );
                    const connectionResults = await Promise.all(
                        allPanels.map((panel) =>
                            apiRequest(`/api/device-panels/${panel.id}/connections`, { token })
                                .then((res) => ({ panelId: panel.id, connections: res.connections || [] }))
                                .catch(() => ({ panelId: panel.id, connections: [] }))
                        )
                    );
                    const nextTargets = {};
                    portResults.forEach((res) => {
                        const map = {};
                        res.ports.forEach((p) => {
                            if (p.linked_panel_id) {
                                map[p.port_number] = {
                                    panelId: p.linked_panel_id,
                                    port: p.linked_port_number,
                                    medium: p.medium || 'utp'
                                };
                            }
                        });
                        nextTargets[res.panelId] = map;
                    });
                    const nextConnections = {};
                    connectionResults.forEach((res) => {
                        const map = {};
                        res.connections.forEach((row) => {
                            map[row.device_port_number] = {
                                panelId: row.panel_item_id,
                                panelPort: row.panel_port_number,
                                medium: row.medium || 'utp'
                            };
                        });
                        nextConnections[res.panelId] = map;
                    });
                    setDevicePanelPortTargets(nextTargets);
                    setDevicePanelConnections(nextConnections);
                } else {
                    setDevicePanelPortTargets({});
                    setDevicePanelConnections({});
                }
            } else {
                setDevicePanels({});
                setDevicePanelPortTargets({});
                setDevicePanelConnections({});
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadGlobalGraphData() {
        setGlobalGraphLoading(true);
        setGlobalGraphError('');
        try {
            const locations = await apiRequest('/api/locations', { token });
            const locationMap = {};
            locations.forEach((loc) => {
                locationMap[loc.id] = { id: loc.id, name: loc.name };
            });

            const buildings = [];
            for (const loc of locations) {
                const locBuildings = await apiRequest(`/api/locations/${loc.id}/buildings`, { token });
                locBuildings.forEach((b) => {
                    buildings.push({ ...b, location_id: loc.id, location_name: loc.name });
                });
            }

            const rooms = [];
            for (const buildingItem of buildings) {
                const buildingRooms = await apiRequest(`/api/buildings/${buildingItem.id}/rooms`, { token });
                buildingRooms.forEach((roomItem) => {
                    rooms.push({
                        ...roomItem,
                        building_id: buildingItem.id,
                        building_name: buildingItem.name,
                        location_id: buildingItem.location_id,
                        location_name: buildingItem.location_name
                    });
                });
            }

            const racks = [];
            for (const roomItem of rooms) {
                const roomRacks = await apiRequest(`/api/rooms/${roomItem.id}/racks`, { token });
                roomRacks.forEach((rackItem) => {
                    racks.push({
                        ...rackItem,
                        room_id: roomItem.id,
                        room_name: roomItem.name,
                        building_id: roomItem.building_id,
                        building_name: roomItem.building_name,
                        location_id: roomItem.location_id,
                        location_name: roomItem.location_name
                    });
                });
            }

            const rackMetaById = {};
            racks.forEach((rackItem) => {
                rackMetaById[rackItem.id] = rackItem;
            });

            const itemsPerRack = await Promise.all(
                racks.map((rackItem) =>
                    apiRequest(`/api/racks/${rackItem.id}/items`, { token })
                        .then((list) => list || [])
                        .catch(() => [])
                )
            );
            const allItems = itemsPerRack.flat();

            const panelsData = await apiRequest('/api/panels', { token });
            const metaMap = {};
            panelsData.forEach((panelItem) => {
                metaMap[String(panelItem.id)] = panelItem;
            });

            const panelItems = allItems.filter((item) => item.type === 'panel');
            const deviceItems = allItems.filter((item) => item.type === 'device' || item.type === 'server');

            const nextPanelTargets = {};
            const nextPanelConnections = {};
            const nextPanelDeviceConnections = {};

            if (panelItems.length > 0) {
                const panelPortsResults = await Promise.all(
                    panelItems.map((panelItem) =>
                        apiRequest(`/api/panels/${panelItem.id}/ports`, { token })
                            .then((portsData) => ({
                                panelId: panelItem.id,
                                ports: portsData.ports || []
                            }))
                            .catch(() => ({ panelId: panelItem.id, ports: [] }))
                    )
                );
                panelPortsResults.forEach((res) => {
                    const map = {};
                    res.ports.forEach((p) => {
                        if (p.linked_panel_id) {
                            map[p.port_number] = {
                                panelId: String(p.linked_panel_id),
                                port: p.linked_port_number,
                                medium: p.medium || 'utp'
                            };
                        }
                    });
                    nextPanelTargets[res.panelId] = map;
                });

                const panelDeviceConnections = await Promise.all(
                    panelItems.map((panelItem) =>
                        apiRequest(`/api/panels/${panelItem.id}/connections`, { token })
                            .then((res) => ({ panelId: panelItem.id, connections: res.connections || [] }))
                            .catch(() => ({ panelId: panelItem.id, connections: [] }))
                    )
                );
                panelDeviceConnections.forEach((res) => {
                    const map = {};
                    res.connections.forEach((row) => {
                        map[row.panel_port_number] = {
                            devicePanelId: row.device_panel_id,
                            devicePort: row.device_port_number,
                            medium: row.medium || 'utp'
                        };
                    });
                    nextPanelDeviceConnections[res.panelId] = map;
                    nextPanelConnections[res.panelId] = map;
                });

                const panelCableConnections = await Promise.all(
                    panelItems.map((panelItem) =>
                        apiRequest(`/api/panels/${panelItem.id}/cable-connections`, { token })
                            .then((res) => ({ panelId: panelItem.id, connections: res.connections || [] }))
                            .catch(() => ({ panelId: panelItem.id, connections: [] }))
                    )
                );
                panelCableConnections.forEach((res) => {
                    const map = { ...(nextPanelConnections[res.panelId] || {}) };
                    res.connections.forEach((row) => {
                        map[row.port_number] = {
                            panelId: row.linked_panel_id,
                            panelPort: row.linked_port_number,
                            medium: row.medium || 'utp'
                        };
                    });
                    nextPanelConnections[res.panelId] = map;
                });
            }

            const devicePanelsMap = {};
            const nextDeviceTargets = {};

            if (deviceItems.length > 0) {
                const deviceResults = await Promise.all(
                    deviceItems.map((item) =>
                        apiRequest(`/api/devices/${item.id}/panels`, { token })
                            .then((list) => ({ id: item.id, panels: list || [] }))
                            .catch(() => ({ id: item.id, panels: [] }))
                    )
                );
                deviceResults.forEach((res) => {
                    devicePanelsMap[res.id] = res.panels;
                });

                const allPanels = deviceResults.flatMap((res) => res.panels || []);
                if (allPanels.length > 0) {
                    const portResults = await Promise.all(
                        allPanels.map((panelItem) =>
                            apiRequest(`/api/device-panels/${panelItem.id}/ports`, { token })
                                .then((portsData) => ({ panelId: panelItem.id, ports: portsData.ports || [] }))
                                .catch(() => ({ panelId: panelItem.id, ports: [] }))
                        )
                    );
                    portResults.forEach((res) => {
                        const map = {};
                        res.ports.forEach((p) => {
                            if (p.linked_panel_id) {
                                map[p.port_number] = {
                                    panelId: p.linked_panel_id,
                                    port: p.linked_port_number,
                                    medium: p.medium || 'utp'
                                };
                            }
                        });
                        nextDeviceTargets[res.panelId] = map;
                    });
                }
            }

            const data = {
                items: allItems,
                panelMeta: metaMap,
                panelConnections: nextPanelConnections,
                panelDeviceConnections: nextPanelDeviceConnections,
                panelPortTargets: nextPanelTargets,
                devicePanels: devicePanelsMap,
                devicePanelPortTargets: nextDeviceTargets,
                rackMetaById
            };
            setGlobalGraphData(data);
            return data;
        } catch (err) {
            setGlobalGraphError(err.message || 'Nie udało się wczytać schematu.');
            throw err;
        } finally {
            setGlobalGraphLoading(false);
        }
    }

    const buildPortTitle = (target, sourcePort) => {
        if (!target?.panelId) return 'Brak połączenia';
        const meta = panelMeta[String(target.panelId)];
        if (!meta) {
            return `Połączone z panelem ${target.panelId}`;
        }
        const portLabel = target.port ? target.port : '-';
        const lines = [`Panel: ${meta.name} · Port ${portLabel}`];
        const locationDiff = meta.location_id && meta.location_id !== location?.id;
        const buildingDiff = meta.building_id && meta.building_id !== building?.id;
        const roomDiff = meta.room_id && meta.room_id !== room?.id;
        const rackDiff = meta.rack_id && meta.rack_id !== rack?.id;

        if (locationDiff) {
            if (meta.location_name) lines.push(`Lokalizacja: ${meta.location_name}`);
            if (meta.building_name) lines.push(`Budynek: ${meta.building_name}`);
            if (meta.room_name) lines.push(`Pomieszczenie: ${meta.room_name}`);
            if (meta.rack_name) lines.push(`Inna szafa: ${meta.rack_name}`);
        } else if (buildingDiff) {
            if (meta.building_name) lines.push(`Budynek: ${meta.building_name}`);
            if (meta.room_name) lines.push(`Pomieszczenie: ${meta.room_name}`);
            if (meta.rack_name) lines.push(`Inna szafa: ${meta.rack_name}`);
        } else if (roomDiff) {
            if (meta.room_name) lines.push(`Pomieszczenie: ${meta.room_name}`);
            if (meta.rack_name) lines.push(`Inna szafa: ${meta.rack_name}`);
        } else if (rackDiff) {
            if (meta.rack_name) lines.push(`Inna szafa: ${meta.rack_name}`);
        }
        return lines.join('\n');
    };

    const getDevicePortTotal = (deviceId) => {
        const panels = devicePanels[deviceId] || [];
        return panels.reduce((sum, panel) => sum + (Number(panel.port_count) || 0), 0);
    };

    const devicePanelById = (() => {
        const map = new Map();
        Object.values(devicePanels).forEach((list) => {
            (list || []).forEach((panel) => map.set(panel.id, panel));
        });
        return map;
    })();

    const graphItems = connectionsModalOpen && globalGraphData?.items ? globalGraphData.items : items;
    const graphPanelMeta = connectionsModalOpen && globalGraphData?.panelMeta ? globalGraphData.panelMeta : panelMeta;
    const graphPanelConnections = connectionsModalOpen && globalGraphData?.panelConnections ? globalGraphData.panelConnections : panelConnections;
    const graphPanelPortTargets = connectionsModalOpen && globalGraphData?.panelPortTargets ? globalGraphData.panelPortTargets : panelPortTargets;
    const graphDevicePanels = connectionsModalOpen && globalGraphData?.devicePanels ? globalGraphData.devicePanels : devicePanels;
    const graphDevicePanelPortTargets = connectionsModalOpen && globalGraphData?.devicePanelPortTargets
        ? globalGraphData.devicePanelPortTargets
        : devicePanelPortTargets;
    const graphRackMetaById = connectionsModalOpen && globalGraphData?.rackMetaById ? globalGraphData.rackMetaById : null;

    const graphItemById = useMemo(() => {
        const map = new Map();
        graphItems.forEach((item) => map.set(item.id, item));
        return map;
    }, [graphItems]);

    const graphDevicePanelById = useMemo(() => {
        const map = new Map();
        Object.values(graphDevicePanels).forEach((list) => {
            (list || []).forEach((panel) => map.set(panel.id, panel));
        });
        return map;
    }, [graphDevicePanels]);

    const graphDevicePanelPathMap = useMemo(() => {
        const map = new Map();
        Object.values(graphDevicePanels).forEach((list) => {
            const tree = buildDevicePanelTree(list || []);
            const walk = (nodes, prefix = '') => {
                nodes.forEach((node) => {
                    const currentPath = prefix ? `${prefix} / ${node.name}` : node.name;
                    map.set(node.id, currentPath);
                    if (node.children?.length) {
                        walk(node.children, currentPath);
                    }
                });
            };
            walk(tree, '');
        });
        return map;
    }, [graphDevicePanels]);

    const devicePanelPathMap = useMemo(() => {
        const map = new Map();
        Object.values(devicePanels).forEach((list) => {
            const tree = buildDevicePanelTree(list || []);
            const walk = (nodes, prefix = '') => {
                nodes.forEach((node) => {
                    const currentPath = prefix ? `${prefix} / ${node.name}` : node.name;
                    map.set(node.id, currentPath);
                    if (node.children?.length) {
                        walk(node.children, currentPath);
                    }
                });
            };
            walk(tree, '');
        });
        return map;
    }, [devicePanels]);

    const itemById = useMemo(() => {
        const map = new Map();
        items.forEach((item) => map.set(item.id, item));
        return map;
    }, [items]);

    const getPendingLabel = () => {
        if (pendingPanelCable) {
            const panelItem = itemById.get(pendingPanelCable.panelId);
            if (!panelItem) return `Port ${pendingPanelCable.port}`;
            return `${panelItem.name}: ${pendingPanelCable.port}`;
        }
        if (pendingDeviceCable) {
            const panel = devicePanelById.get(pendingDeviceCable.panelId);
            const parentItem = panel ? itemById.get(panel.parent_item_id) : null;
            const deviceName = parentItem?.name || 'Urządzenie';
            const panelPath = devicePanelPathMap.get(pendingDeviceCable.panelId) || panel?.name || 'Panel';
            return `${deviceName}: ${panelPath} / ${pendingDeviceCable.port}`;
        }
        return '';
    };

    const getAllowedMediaForEndpoint = (type, panelId, port) => {
        if (type === 'panel') {
            const medium = panelPortTargets[panelId]?.[port]?.medium || graphPanelPortTargets?.[panelId]?.[port]?.medium;
            return medium ? [medium] : ['utp', 'singlemode', 'multimode'];
        }
        return ['utp', 'singlemode', 'multimode'];
    };

    const getMediumLabel = (opt) =>
        opt === 'utp' ? 'UTP' : opt === 'singlemode' ? 'Światłowód jednomodowy' : 'Światłowód wielomodowy';

    const getAllowedMediaForSelectedCable = (cable) => {
        if (!cable) return [];
        const aAllowed = getAllowedMediaForEndpoint(cable.a.type, cable.a.panelId, cable.a.port);
        const bAllowed = getAllowedMediaForEndpoint(cable.b.type, cable.b.panelId, cable.b.port);
        const filtered = aAllowed.filter((opt) => bAllowed.includes(opt));
        return Array.from(new Set(filtered));
    };

    const resolveAutoMedium = (allowed) => {
        const options = Array.isArray(allowed) ? allowed : [];
        if (options.length === 0) return '';
        if (pendingCableMedium && options.includes(pendingCableMedium)) {
            return pendingCableMedium;
        }
        return options[0];
    };

    const getSelectedCableMedium = (cable) => {
        if (!cable) return '';
        const { a, b } = cable;
        if (a.type === 'panel' && b.type === 'panel') {
            return (
                panelConnections[a.panelId]?.[a.port]?.medium ||
                panelConnections[b.panelId]?.[b.port]?.medium ||
                'utp'
            );
        }
        if ((a.type === 'panel' && b.type === 'device') || (a.type === 'device' && b.type === 'panel')) {
            const panel = a.type === 'panel' ? a : b;
            const device = a.type === 'device' ? a : b;
            return (
                panelConnections[panel.panelId]?.[panel.port]?.medium ||
                devicePanelConnections[device.panelId]?.[device.port]?.medium ||
                'utp'
            );
        }
        if (a.type === 'device' && b.type === 'device') {
            return (
                devicePanelPortTargets[a.panelId]?.[a.port]?.medium ||
                devicePanelPortTargets[b.panelId]?.[b.port]?.medium ||
                'utp'
            );
        }
        return 'utp';
    };

    const getPanelDiffSuffix = (meta) => {
        if (!meta) return '';
        const parts = [];
        const locationDiff = meta.location_id && meta.location_id !== location?.id;
        const buildingDiff = meta.building_id && meta.building_id !== building?.id;
        const roomDiff = meta.room_id && meta.room_id !== room?.id;
        const rackDiff = meta.rack_id && meta.rack_id !== rack?.id;

        if (locationDiff) {
            if (meta.location_name) parts.push(`Lokalizacja: ${meta.location_name}`);
            if (meta.building_name) parts.push(`Budynek: ${meta.building_name}`);
            if (meta.room_name) parts.push(`Pomieszczenie: ${meta.room_name}`);
            if (meta.rack_name) parts.push(`Szafa: ${meta.rack_name}`);
        } else if (buildingDiff) {
            if (meta.building_name) parts.push(`Budynek: ${meta.building_name}`);
            if (meta.room_name) parts.push(`Pomieszczenie: ${meta.room_name}`);
            if (meta.rack_name) parts.push(`Szafa: ${meta.rack_name}`);
        } else if (roomDiff) {
            if (meta.room_name) parts.push(`Pomieszczenie: ${meta.room_name}`);
            if (meta.rack_name) parts.push(`Szafa: ${meta.rack_name}`);
        } else if (rackDiff) {
            if (meta.rack_name) parts.push(`Szafa: ${meta.rack_name}`);
        }

        return parts.length ? ` (${parts.join(', ')})` : '';
    };

    const getEndpointLabel = (endpoint) => {
        if (!endpoint) return '';
        if (endpoint.type === 'panel') {
            const panelItem = itemById.get(endpoint.panelId);
            const typeLabel = 'Panel';
            const meta = panelMeta[String(endpoint.panelId)];
            const name = panelItem?.name || meta?.name || endpoint.panelId;
            return `${typeLabel}: ${name}: ${endpoint.port}${getPanelDiffSuffix(meta)}`;
        }
        if (endpoint.type === 'device') {
            const panel = devicePanelById.get(endpoint.panelId);
            const parentItem = panel ? itemById.get(panel.parent_item_id) : null;
            const typeLabel = parentItem?.type === 'server' ? 'Serwer' : 'Urządzenie';
            const deviceName = parentItem?.name || typeLabel;
            const panelPath = devicePanelPathMap.get(endpoint.panelId) || panel?.name || `Panel ${endpoint.panelId}`;
            return `${typeLabel}: ${deviceName}: ${panelPath} / ${endpoint.port}`;
        }
        return '';
    };

    const isSelectedEndpoint = (type, panelId, port) =>
        selectedCable &&
        ((selectedCable.a.type === type && selectedCable.a.panelId === panelId && selectedCable.a.port === port) ||
            (selectedCable.b.type === type && selectedCable.b.panelId === panelId && selectedCable.b.port === port));

    const clearPendingSelection = () => {
        setPendingDeviceCable(null);
        setPendingPanelCable(null);
        setPendingCableMedium('');
        setPendingCableMediaOptions(['utp', 'singlemode', 'multimode']);
    };

    const getPanelRackId = (panelId) => {
        const panelItem = itemById.get(Number(panelId)) || itemById.get(String(panelId));
        if (panelItem?.rack_id) return panelItem.rack_id;
        const meta = panelMeta[String(panelId)];
        return meta?.rack_id || null;
    };

    const buildPanelEndpoint = (panelId, port) => {
        const endpoint = { type: 'panel', panelId: Number(panelId), port: Number(port) };
        const meta = panelMeta[String(panelId)] || null;
        return {
            ...endpoint,
            rackId: getPanelRackId(panelId),
            label: getEndpointLabel(endpoint),
            rackName: meta?.rack_name || rack?.name || null,
            roomName: meta?.room_name || room?.name || null,
            buildingName: meta?.building_name || building?.name || null,
            locationName: meta?.location_name || location?.name || null
        };
    };

    const buildDeviceEndpoint = (panelId, port) => {
        const endpoint = { type: 'device', panelId: Number(panelId), port: Number(port) };
        const panel = devicePanelById.get(Number(panelId)) || devicePanelById.get(String(panelId));
        const parentItem = panel ? itemById.get(panel.parent_item_id) : null;
        return {
            ...endpoint,
            rackId: parentItem?.rack_id || rack?.id || null,
            label: getEndpointLabel(endpoint),
            rackName: rack?.name || null,
            roomName: room?.name || null,
            buildingName: building?.name || null,
            locationName: location?.name || null
        };
    };

    const isCrossRackSelection = (source, target) => {
        if (!source?.rackId || !target?.rackId) return false;
        return String(source.rackId) !== String(target.rackId);
    };

    const openLinkModeChooser = (payload) => {
        setLinkModePrompt(payload);
        setRouteProposalOpen(false);
        setRouteProposalError('');
        setRouteProposalSteps([]);
        setRouteProposalResults([]);
        setRouteProposalDebug([]);
    };

    const executeDirectLink = async (payload) => {
        const { linkKind, source, target, medium } = payload;
        if (linkKind === 'panel-device') {
            await apiRequest('/api/panel-device-ports/link', {
                method: 'POST',
                body: {
                    panelId: source.type === 'panel' ? source.panelId : target.panelId,
                    panelPort: source.type === 'panel' ? source.port : target.port,
                    devicePanelId: source.type === 'device' ? source.panelId : target.panelId,
                    devicePort: source.type === 'device' ? source.port : target.port,
                    medium
                },
                token
            });
            setPanelConnections((prev) => {
                const next = { ...prev };
                const panelEndpoint = source.type === 'panel' ? source : target;
                const deviceEndpoint = source.type === 'device' ? source : target;
                const map = { ...(next[panelEndpoint.panelId] || {}) };
                map[panelEndpoint.port] = {
                    devicePanelId: deviceEndpoint.panelId,
                    devicePort: deviceEndpoint.port,
                    medium
                };
                next[panelEndpoint.panelId] = map;
                return next;
            });
            setDevicePanelConnections((prev) => {
                const next = { ...prev };
                const panelEndpoint = source.type === 'panel' ? source : target;
                const deviceEndpoint = source.type === 'device' ? source : target;
                const map = { ...(next[deviceEndpoint.panelId] || {}) };
                map[deviceEndpoint.port] = {
                    panelId: panelEndpoint.panelId,
                    panelPort: panelEndpoint.port,
                    medium
                };
                next[deviceEndpoint.panelId] = map;
                return next;
            });
            return;
        }

        if (linkKind === 'panel-panel') {
            await apiRequest('/api/panel-ports/link', {
                method: 'POST',
                body: {
                    fromPanelId: source.panelId,
                    fromPort: source.port,
                    toPanelId: target.panelId,
                    toPort: target.port,
                    medium
                },
                token
            });
            setPanelConnections((prev) => {
                const next = { ...prev };
                const addLink = (panelId, portNumber, linkedPanelId, linkedPort) => {
                    const map = { ...(next[panelId] || {}) };
                    map[portNumber] = { panelId: linkedPanelId, panelPort: linkedPort, medium };
                    next[panelId] = map;
                };
                addLink(source.panelId, source.port, target.panelId, target.port);
                addLink(target.panelId, target.port, source.panelId, source.port);
                return next;
            });
            return;
        }

        if (linkKind === 'device-device') {
            await apiRequest('/api/device-panel-ports/link', {
                method: 'POST',
                body: {
                    fromPanelId: source.panelId,
                    fromPort: source.port,
                    toPanelId: target.panelId,
                    toPort: target.port,
                    medium
                },
                token
            });
            setDevicePanelPortTargets((prev) => {
                const next = { ...prev };
                const addLink = (panelId, portNumber, targetPanelId, targetPort) => {
                    const map = { ...(next[panelId] || {}) };
                    map[portNumber] = { panelId: targetPanelId, port: targetPort, medium };
                    next[panelId] = map;
                };
                addLink(source.panelId, source.port, target.panelId, target.port);
                addLink(target.panelId, target.port, source.panelId, source.port);
                return next;
            });
        }
    };

    const buildRoutingProposal = async (payload) => {
        const cached = globalGraphData || null;
        const data = cached || (await loadGlobalGraphData());
        if (!data) {
            throw new Error('Brak danych do trasowania.');
        }

        const debug = [];
        const preferPanelsMode = payload?.linkKind === 'panel-panel';
        const sourceNode = `${payload.source.type}:${Number(payload.source.panelId)}`;
        const targetNode = `${payload.target.type}:${Number(payload.target.panelId)}`;
        debug.push(`Źródło: ${payload.source?.label || sourceNode}`);
        debug.push(`Cel: ${payload.target?.label || targetNode}`);
        debug.push(`Węzły start/koniec: ${sourceNode} -> ${targetNode}`);
        debug.push(`Tryb trasowania: ${preferPanelsMode ? 'preferuj panele (urządzenia awaryjnie)' : 'pełny (panele + urządzenia)'}`);

        const itemMap = new Map((data.items || []).map((item) => [Number(item.id), item]));
        const panelMetaMap = data.panelMeta || {};
        const panelDeviceConnectionsMap = data.panelDeviceConnections || {};
        const devicePanelMap = new Map();
        Object.values(data.devicePanels || {}).forEach((list) => {
            (list || []).forEach((panel) => devicePanelMap.set(Number(panel.id), panel));
        });
        const devicePanelPathById = new Map();
        Object.values(data.devicePanels || {}).forEach((list) => {
            const tree = buildDevicePanelTree(list || []);
            const walk = (nodes, prefix = '') => {
                (nodes || []).forEach((node) => {
                    const currentPath = prefix ? `${prefix} / ${node.name}` : node.name;
                    devicePanelPathById.set(Number(node.id), currentPath);
                    if (node.children?.length) {
                        walk(node.children, currentPath);
                    }
                });
            };
            walk(tree, '');
        });

        const adjacency = new Map();
        const addEdge = (from, to, description) => {
            if (!adjacency.has(from)) adjacency.set(from, []);
            adjacency.get(from).push({ to, description });
        };

        const seenEdge = new Set();
        const addUndirectedEdge = (aNode, bNode, descriptionAtoB, descriptionBtoA) => {
            const key = [aNode, bNode].sort().join('|') + '|' + descriptionAtoB;
            if (seenEdge.has(key)) return;
            seenEdge.add(key);
            addEdge(aNode, bNode, descriptionAtoB);
            addEdge(bNode, aNode, descriptionBtoA || descriptionAtoB);
        };

        const addPanelToPanelEdges = (connectionsMap, sourceLabel) => {
            Object.entries(connectionsMap || {}).forEach(([panelIdRaw, map]) => {
                const panelId = Number(panelIdRaw);
                Object.entries(map || {}).forEach(([portRaw, target]) => {
                    const port = Number(portRaw);
                    const linkedPanelId = Number(target?.panelId);
                    const linkedPanelPort = Number(target?.panelPort ?? target?.port);
                    if (!Number.isInteger(linkedPanelId)) return;
                    addUndirectedEdge(
                        `panel:${panelId}`,
                        `panel:${linkedPanelId}`,
                        `Panel ${panelId} port ${port} ↔ Panel ${linkedPanelId} port ${linkedPanelPort}`,
                        `Panel ${linkedPanelId} port ${linkedPanelPort} ↔ Panel ${panelId} port ${port}`
                    );
                });
            });
            const sourceCount = Object.values(connectionsMap || {}).reduce(
                (sum, map) => sum + Object.keys(map || {}).length,
                0
            );
            debug.push(`${sourceLabel}: ${sourceCount} wpisów`);
        };

        addPanelToPanelEdges(data.panelPortTargets || {}, 'Połączenia panel-panel z konfiguracji portów');

        Object.entries(data.panelConnections || {}).forEach(([panelIdRaw, map]) => {
            const panelId = Number(panelIdRaw);
            Object.entries(map || {}).forEach(([portRaw, target]) => {
                const port = Number(portRaw);
                if (target?.panelId) {
                    addUndirectedEdge(
                        `panel:${panelId}`,
                        `panel:${Number(target.panelId)}`,
                        `Panel ${panelId} port ${port} ↔ Panel ${target.panelId} port ${target.panelPort}`,
                        `Panel ${target.panelId} port ${target.panelPort} ↔ Panel ${panelId} port ${port}`
                    );
                }
                if (target?.devicePanelId) {
                    addUndirectedEdge(
                        `panel:${panelId}`,
                        `device:${Number(target.devicePanelId)}`,
                        `Panel ${panelId} port ${port} ↔ Interfejs urządzenia ${target.devicePanelId} port ${target.devicePort}`,
                        `Interfejs urządzenia ${target.devicePanelId} port ${target.devicePort} ↔ Panel ${panelId} port ${port}`
                    );
                }
            });
        });
        const panelConnectionsCount = Object.values(data.panelConnections || {}).reduce(
            (sum, map) => sum + Object.keys(map || {}).length,
            0
        );
        debug.push(`Połączenia panelowe i panel-urządzenie (mapa główna): ${panelConnectionsCount} wpisów`);

        Object.entries(data.devicePanelPortTargets || {}).forEach(([panelIdRaw, map]) => {
            const panelId = Number(panelIdRaw);
            Object.entries(map || {}).forEach(([portRaw, target]) => {
                const port = Number(portRaw);
                if (!target?.panelId) return;
                addUndirectedEdge(
                    `device:${panelId}`,
                    `device:${Number(target.panelId)}`,
                    `Interfejs urządzenia ${panelId} port ${port} ↔ Interfejs urządzenia ${target.panelId} port ${target.port}`,
                    `Interfejs urządzenia ${target.panelId} port ${target.port} ↔ Interfejs urządzenia ${panelId} port ${port}`
                );
            });
        });

        const devicePanelsByParent = new Map();
        devicePanelMap.forEach((panel) => {
            const parentId = Number(panel.parent_item_id);
            if (!Number.isInteger(parentId)) return;
            const parentItem = itemMap.get(parentId);
            if (!parentItem || parentItem.type !== 'device') return;
            if (!devicePanelsByParent.has(parentId)) {
                devicePanelsByParent.set(parentId, []);
            }
            devicePanelsByParent.get(parentId).push(panel);
        });

        devicePanelsByParent.forEach((panels, parentId) => {
            if (!panels || panels.length < 2) return;
            const parentItem = itemMap.get(parentId);
            const deviceName = parentItem?.name || `Urządzenie ${parentId}`;
            for (let firstIndex = 0; firstIndex < panels.length; firstIndex += 1) {
                for (let secondIndex = firstIndex + 1; secondIndex < panels.length; secondIndex += 1) {
                    const firstPanel = panels[firstIndex];
                    const secondPanel = panels[secondIndex];
                    addUndirectedEdge(
                        `device:${Number(firstPanel.id)}`,
                        `device:${Number(secondPanel.id)}`,
                        `Przejście logiczne wewnątrz urządzenia ${deviceName} (${firstPanel.name} ↔ ${secondPanel.name})`,
                        `Przejście logiczne wewnątrz urządzenia ${deviceName} (${secondPanel.name} ↔ ${firstPanel.name})`
                    );
                }
            }
        });

        const panelsByRack = new Map();
        Object.entries(panelMetaMap || {}).forEach(([panelIdRaw, meta]) => {
            const panelId = Number(panelIdRaw);
            const rackId = meta?.rack_id;
            if (!Number.isInteger(panelId) || !rackId) return;
            if (!panelsByRack.has(rackId)) panelsByRack.set(rackId, []);
            panelsByRack.get(rackId).push(panelId);
        });

        const addAccessEdgesForEndpoint = (endpoint, nodeKey, roleLabel) => {
            if (!endpoint || endpoint.type !== 'device') return;
            const rackId = endpoint.rackId || null;
            if (!rackId) return;
            const panelIds = panelsByRack.get(rackId) || [];
            panelIds.forEach((panelId) => {
                const panelMeta = panelMetaMap[String(panelId)] || {};
                const panelName = panelMeta?.name || `Panel ${panelId}`;
                addUndirectedEdge(
                    nodeKey,
                    `panel:${panelId}`,
                    `${roleLabel}: podłącz do panelu ${panelName} w tej samej szafie`,
                    `Przejście z panelu ${panelName} do ${roleLabel.toLowerCase()}`
                );
            });
        };

        const getPanelRackId = (panelId) => panelMetaMap[String(panelId)]?.rack_id || null;

        const hasCrossRackPanelLink = (panelId) => {
            const sourceRackId = getPanelRackId(panelId);
            if (!sourceRackId) return false;

            const portLinks = data.panelPortTargets?.[panelId] || {};
            for (const target of Object.values(portLinks)) {
                const targetPanelId = Number(target?.panelId);
                if (!Number.isInteger(targetPanelId)) continue;
                const targetRackId = getPanelRackId(targetPanelId);
                if (targetRackId && String(targetRackId) !== String(sourceRackId)) return true;
            }

            const directLinks = data.panelConnections?.[panelId] || {};
            for (const target of Object.values(directLinks)) {
                const targetPanelId = Number(target?.panelId);
                if (!Number.isInteger(targetPanelId)) continue;
                const targetRackId = getPanelRackId(targetPanelId);
                if (targetRackId && String(targetRackId) !== String(sourceRackId)) return true;
            }

            return false;
        };

        const addEndpointTransitPanelEdges = (endpoint, nodeKey, roleLabel) => {
            if (!endpoint || endpoint.type !== 'panel') return;
            const rackId = endpoint.rackId || null;
            if (!rackId) return;
            const panelIds = panelsByRack.get(rackId) || [];
            let added = 0;
            panelIds.forEach((panelId) => {
                const targetPanelId = Number(panelId);
                if (!Number.isInteger(targetPanelId)) return;
                if (targetPanelId === Number(endpoint.panelId)) return;
                if (!hasCrossRackPanelLink(targetPanelId)) return;
                const panelName = panelMetaMap[String(targetPanelId)]?.name || `Panel ${targetPanelId}`;
                addUndirectedEdge(
                    nodeKey,
                    `panel:${targetPanelId}`,
                    `${roleLabel}: lokalnie do panelu tranzytowego ${panelName}`,
                    `Lokalny powrót z panelu tranzytowego ${panelName} do ${roleLabel.toLowerCase()}`
                );
                added += 1;
            });
            debug.push(`${roleLabel}: panele tranzytowe w tej samej szafie: ${added}`);
        };

        addAccessEdgesForEndpoint(payload.source, sourceNode, 'Start');
        addAccessEdgesForEndpoint(payload.target, targetNode, 'Cel');
        addEndpointTransitPanelEdges(payload.source, sourceNode, 'Start');
        addEndpointTransitPanelEdges(payload.target, targetNode, 'Cel');

        const sourceRackPanels = payload.source?.rackId ? panelsByRack.get(payload.source.rackId) || [] : [];
        const targetRackPanels = payload.target?.rackId ? panelsByRack.get(payload.target.rackId) || [] : [];
        debug.push(`Panele w szafie źródłowej (${payload.source?.rackId || '-'}): ${sourceRackPanels.length}`);
        debug.push(`Panele w szafie docelowej (${payload.target?.rackId || '-'}): ${targetRackPanels.length}`);

        const allNodes = new Set([sourceNode, targetNode]);
        adjacency.forEach((edges, node) => {
            allNodes.add(node);
            edges.forEach((edge) => allNodes.add(edge.to));
        });
        let edgeCount = 0;
        adjacency.forEach((edges) => {
            edgeCount += edges.length;
        });
        const sourceNeighbors = adjacency.get(sourceNode) || [];
        const targetNeighbors = adjacency.get(targetNode) || [];
        debug.push(`Liczba węzłów grafu: ${allNodes.size}`);
        debug.push(`Liczba krawędzi skierowanych: ${edgeCount}`);
        debug.push(`Sąsiedzi źródła: ${sourceNeighbors.length}`);
        debug.push(`Sąsiedzi celu: ${targetNeighbors.length}`);
        if (sourceNeighbors.length > 0) {
            debug.push(`Przykładowe krawędzie źródła: ${sourceNeighbors.slice(0, 5).map((edge) => edge.description).join(' | ')}`);
        }
        if (targetNeighbors.length > 0) {
            debug.push(`Przykładowe krawędzie celu: ${targetNeighbors.slice(0, 5).map((edge) => edge.description).join(' | ')}`);
        }

        const dist = new Map();
        const prev = new Map();
        allNodes.forEach((node) => dist.set(node, Infinity));
        dist.set(sourceNode, 0);
        const queue = [{ node: sourceNode, cost: 0 }];

        const canUseAsTransit = (nodeKey) => {
            const isDevice = String(nodeKey).startsWith('device:');
            if (!isDevice) return true;
            return nodeKey === sourceNode || nodeKey === targetNode;
        };

        const getTraversableNeighbors = (nodeKey) => {
            if (!canUseAsTransit(nodeKey)) return [];
            const neighbors = adjacency.get(nodeKey) || [];
            return neighbors.filter((edge) => canUseAsTransit(edge.to));
        };

        const reconstructFromPrev = (prevMap) => {
            if (sourceNode === targetNode) return [sourceNode];
            if (!prevMap.has(targetNode)) return null;
            const path = [targetNode];
            let currentNode = targetNode;
            while (currentNode !== sourceNode) {
                const info = prevMap.get(currentNode);
                if (!info) return null;
                path.push(info.node);
                currentNode = info.node;
            }
            path.reverse();
            return path;
        };

        const runDijkstraPath = () => {
            const localDist = new Map();
            const localPrev = new Map();
            allNodes.forEach((node) => localDist.set(node, Infinity));
            localDist.set(sourceNode, 0);
            const localQueue = [{ node: sourceNode, cost: 0 }];

            while (localQueue.length) {
                localQueue.sort((a, b) => a.cost - b.cost);
                const current = localQueue.shift();
                if (!current) break;
                if (current.cost > (localDist.get(current.node) || Infinity)) continue;
                if (current.node === targetNode) break;
                const currentIsDevice = String(current.node).startsWith('device:');
                const neighbors = getTraversableNeighbors(current.node);
                neighbors.forEach((edge) => {
                    const nextIsDevice = String(edge.to).startsWith('device:');
                    const edgeWeight = preferPanelsMode && (currentIsDevice || nextIsDevice) ? 20 : 1;
                    const nextCost = current.cost + edgeWeight;
                    if (nextCost < (localDist.get(edge.to) || Infinity)) {
                        localDist.set(edge.to, nextCost);
                        localPrev.set(edge.to, { node: current.node, edgeDescription: edge.description });
                        localQueue.push({ node: edge.to, cost: nextCost });
                    }
                });
            }

            return reconstructFromPrev(localPrev);
        };

        const runBidirectionalBfsPath = () => {
            if (sourceNode === targetNode) return [sourceNode];

            let frontierFromStart = new Set([sourceNode]);
            let frontierFromTarget = new Set([targetNode]);
            const visitedFromStart = new Set([sourceNode]);
            const visitedFromTarget = new Set([targetNode]);
            const parentFromStart = new Map();
            const parentFromTarget = new Map();
            let meetingNode = null;

            const expand = (frontier, visitedThis, visitedOther, parentThis) => {
                const nextFrontier = new Set();
                for (const nodeKey of frontier) {
                    const neighbors = getTraversableNeighbors(nodeKey);
                    for (const edge of neighbors) {
                        const neighbor = edge.to;
                        if (visitedThis.has(neighbor)) continue;
                        visitedThis.add(neighbor);
                        parentThis.set(neighbor, nodeKey);
                        if (visitedOther.has(neighbor)) {
                            return { nextFrontier, meeting: neighbor };
                        }
                        nextFrontier.add(neighbor);
                    }
                }
                return { nextFrontier, meeting: null };
            };

            while (frontierFromStart.size > 0 && frontierFromTarget.size > 0) {
                if (frontierFromStart.size <= frontierFromTarget.size) {
                    const result = expand(frontierFromStart, visitedFromStart, visitedFromTarget, parentFromStart);
                    frontierFromStart = result.nextFrontier;
                    if (result.meeting) {
                        meetingNode = result.meeting;
                        break;
                    }
                } else {
                    const result = expand(frontierFromTarget, visitedFromTarget, visitedFromStart, parentFromTarget);
                    frontierFromTarget = result.nextFrontier;
                    if (result.meeting) {
                        meetingNode = result.meeting;
                        break;
                    }
                }
            }

            if (!meetingNode) return null;

            const left = [];
            let currentNode = meetingNode;
            while (currentNode) {
                left.push(currentNode);
                currentNode = parentFromStart.get(currentNode);
            }
            left.reverse();

            const right = [];
            currentNode = meetingNode;
            while (parentFromTarget.has(currentNode)) {
                currentNode = parentFromTarget.get(currentNode);
                right.push(currentNode);
            }

            return [...left, ...right];
        };

        const nodeToLabel = (nodeKey) => {
            const [type, idRaw] = String(nodeKey).split(':');
            const id = Number(idRaw);
            if (type === 'panel') {
                const meta = panelMetaMap[String(id)] || {};
                const item = itemMap.get(id);
                const name = item?.name || meta?.name || `Panel ${id}`;
                const where = [meta.rack_name, meta.room_name, meta.building_name, meta.location_name]
                    .filter(Boolean)
                    .join(' / ');
                return where ? `Panel: ${name} (${where})` : `Panel: ${name}`;
            }
            const panel = devicePanelMap.get(id);
            const parent = panel ? itemMap.get(Number(panel.parent_item_id)) : null;
            const parentType = parent?.type === 'server' ? 'Serwer' : 'Urządzenie';
            const parentName = parent?.name || parentType;
            const panelName = panel?.name || `Interfejs ${id}`;
            return `${parentType}: ${parentName} / ${panelName}`;
        };

        const findEdgeDescription = (fromNode, toNode) => {
            const candidates = adjacency.get(fromNode) || [];
            const direct = candidates.find((edge) => edge.to === toNode);
            return direct?.description || '';
        };

        const nodeToShortLabel = (nodeKey) => {
            const [type, idRaw] = String(nodeKey).split(':');
            const id = Number(idRaw);
            if (type === 'panel') {
                const meta = panelMetaMap[String(id)] || {};
                const item = itemMap.get(id);
                const name = item?.name || meta?.name || id;
                const rackName = meta?.rack_name || `szafa-${item?.rack_id || '?'}`;
                const startU = Number(item?.start_u);
                const uLabel = Number.isInteger(startU) ? `U${startU}` : 'U?';
                return `Panel:${rackName}/${uLabel}/${name}`;
            }
            const panel = devicePanelMap.get(id);
            const parent = panel ? itemMap.get(Number(panel.parent_item_id)) : null;
            const parentType = parent?.type === 'server' ? 'Serwer' : 'Urządzenie';
            const parentName = parent?.name || parentType;
            return `${parentType}:${parentName}`;
        };

        const getNodePortFromEdge = (nodeKey, edgeDescription) => {
            if (!edgeDescription) return null;
            const [type, idRaw] = String(nodeKey).split(':');
            const id = Number(idRaw);
            if (type === 'panel') {
                const match = edgeDescription.match(new RegExp(`Panel\\s+${id}\\s+port\\s+(\\d+)`, 'i'));
                return match ? Number(match[1]) : null;
            }
            const match = edgeDescription.match(new RegExp(`Interfejs\\s+urządzenia\\s+${id}\\s+port\\s+(\\d+)`, 'i'));
            return match ? Number(match[1]) : null;
        };

        const getFreePortsForNode = (nodeKey) => {
            const [type, idRaw] = String(nodeKey).split(':');
            const id = Number(idRaw);
            if (!Number.isInteger(id)) return [];

            const occupied = new Set();
            let portCount = 0;

            if (type === 'panel') {
                portCount = Number(itemMap.get(id)?.port_count) || 0;
                Object.keys(data.panelPortTargets?.[id] || {}).forEach((portRaw) => {
                    const port = Number(portRaw);
                    if (Number.isInteger(port)) occupied.add(port);
                });
                Object.entries(data.panelConnections?.[id] || {}).forEach(([portRaw, target]) => {
                    const port = Number(portRaw);
                    if (!Number.isInteger(port)) return;
                    if (target?.panelId || target?.devicePanelId) occupied.add(port);
                });
            } else if (type === 'device') {
                portCount = Number(devicePanelMap.get(id)?.port_count) || 0;
                Object.keys(data.devicePanelPortTargets?.[id] || {}).forEach((portRaw) => {
                    const port = Number(portRaw);
                    if (Number.isInteger(port)) occupied.add(port);
                });
                Object.values(data.panelConnections || {}).forEach((map) => {
                    Object.values(map || {}).forEach((target) => {
                        if (Number(target?.devicePanelId) === id) {
                            const devicePort = Number(target?.devicePort);
                            if (Number.isInteger(devicePort)) occupied.add(devicePort);
                        }
                    });
                });
            }

            if (!Number.isInteger(portCount) || portCount < 1) return [];
            const free = [];
            for (let port = 1; port <= portCount; port += 1) {
                if (!occupied.has(port)) free.push(port);
            }
            return free;
        };

        const getPortDisplay = (nodeKey, portValue) => {
            if (Number.isInteger(portValue)) return String(portValue);
            const freePorts = getFreePortsForNode(nodeKey);
            if (freePorts.length === 0) return 'brak-wolnych';
            return `wolne(${freePorts.join(',')})`;
        };

        const getNodePortText = (nodeKey, portValue) => {
            const [type, idRaw] = String(nodeKey).split(':');
            const id = Number(idRaw);
            if (type === 'device' && Number.isInteger(id) && Number.isInteger(portValue)) {
                const panel = devicePanelMap.get(id);
                const panelPath = devicePanelPathById.get(id) || panel?.name || 'Interfejs';
                const normalizedPath = String(panelPath).replace(/\s*\/\s*/g, '/');
                return `${normalizedPath}/${portValue}`;
            }
            return getPortDisplay(nodeKey, portValue);
        };

        const formatFreePortsDisplay = (ports) => {
            if (!Array.isArray(ports) || ports.length === 0) return 'brak-wolnych';
            return `wolne(${ports.join(',')})`;
        };

        const getPanelToPanelPortPairs = (fromPanelId, toPanelId) => {
            const pairs = [];

            Object.entries(data.panelPortTargets?.[fromPanelId] || {}).forEach(([fromPortRaw, target]) => {
                const fromPort = Number(fromPortRaw);
                const targetPanelId = Number(target?.panelId);
                const toPort = Number(target?.port ?? target?.panelPort);
                if (!Number.isInteger(fromPort) || !Number.isInteger(targetPanelId) || !Number.isInteger(toPort)) return;
                if (targetPanelId !== Number(toPanelId)) return;
                pairs.push({ fromPort, toPort });
            });

            Object.entries(data.panelConnections?.[fromPanelId] || {}).forEach(([fromPortRaw, target]) => {
                const fromPort = Number(fromPortRaw);
                const targetPanelId = Number(target?.panelId);
                const toPort = Number(target?.panelPort ?? target?.port);
                if (!Number.isInteger(fromPort) || !Number.isInteger(targetPanelId) || !Number.isInteger(toPort)) return;
                if (targetPanelId !== Number(toPanelId)) return;
                pairs.push({ fromPort, toPort });
            });

            const unique = new Map();
            pairs.forEach((pair) => {
                const key = `${pair.fromPort}:${pair.toPort}`;
                unique.set(key, pair);
            });
            return Array.from(unique.values());
        };

        const isPanelPortBlockedByDevice = (panelId, port) => {
            const entry = panelDeviceConnectionsMap?.[panelId]?.[port];
            return !!entry?.devicePanelId;
        };

        const getContextFreePortsForIntermediateNode = (nodeKey, nextNodeKey) => {
            const [type, idRaw] = String(nodeKey).split(':');
            if (type !== 'panel') return getFreePortsForNode(nodeKey);
            const panelId = Number(idRaw);
            if (!Number.isInteger(panelId)) return getFreePortsForNode(nodeKey);

            const [nextType, nextIdRaw] = String(nextNodeKey || '').split(':');
            const nextId = Number(nextIdRaw);
            if (nextType !== 'panel' || !Number.isInteger(nextId)) {
                return getFreePortsForNode(nodeKey);
            }

            const pairs = getPanelToPanelPortPairs(panelId, nextId);
            if (pairs.length === 0) {
                return getFreePortsForNode(nodeKey);
            }

            const filtered = pairs
                .filter((pair) => !isPanelPortBlockedByDevice(panelId, pair.fromPort))
                .filter((pair) => !isPanelPortBlockedByDevice(nextId, pair.toPort))
                .map((pair) => pair.fromPort);
            const uniqueSorted = Array.from(new Set(filtered)).sort((a, b) => a - b);
            return uniqueSorted;
        };

        const formatPathToDisplay = (nodePath) => {
            if (!Array.isArray(nodePath) || nodePath.length === 0) return '';
            const chainParts = [];
            const sourcePort = Number(payload?.source?.port);
            const targetPort = Number(payload?.target?.port);
            chainParts.push(`${nodeToShortLabel(nodePath[0])}:${getNodePortText(nodePath[0], sourcePort)}`);

            for (let index = 1; index < nodePath.length; index += 1) {
                const node = nodePath[index];
                const prevNode = nodePath[index - 1];
                const incomingEdgeDescription = findEdgeDescription(prevNode, node);
                let incomingPort = getNodePortFromEdge(node, incomingEdgeDescription);
                if (!Number.isInteger(incomingPort) && node === targetNode && Number.isInteger(targetPort)) {
                    incomingPort = targetPort;
                }

                const isLastNode = index === nodePath.length - 1;
                const shouldShowFreePorts = !isLastNode;

                if (shouldShowFreePorts) {
                    const nextNode = nodePath[index + 1];
                    const nextIsPanel = String(nextNode || '').startsWith('panel:');
                    const prevIsPanel = String(prevNode || '').startsWith('panel:');
                    const panelNeighbor = nextIsPanel ? nextNode : prevIsPanel ? prevNode : nextNode;
                    const contextFreePorts = getContextFreePortsForIntermediateNode(node, panelNeighbor);
                    chainParts.push(`${nodeToShortLabel(node)}:${formatFreePortsDisplay(contextFreePorts)}`);
                } else {
                    chainParts.push(`${nodeToShortLabel(node)}:${getNodePortText(node, incomingPort)}`);
                }
            }

            return chainParts.join(' <--> ');
        };

        const nowNs = () =>
            typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now() * 1_000_000
                : Date.now() * 1_000_000;

        const dijkstraStart = nowNs();
        const dijkstraPath = runDijkstraPath();
        const dijkstraDuration = Math.max(0, nowNs() - dijkstraStart);

        const bfsStart = nowNs();
        const bidirectionalBfsPath = runBidirectionalBfsPath();
        const bfsDuration = Math.max(0, nowNs() - bfsStart);

        const results = [
            {
                algorithm: 'Dijkstra',
                durationNs: dijkstraDuration,
                step: dijkstraPath ? formatPathToDisplay(dijkstraPath) : '',
                error: dijkstraPath ? '' : 'Nie znaleziono trasy.'
            },
            {
                algorithm: 'Bidirectional BFS',
                durationNs: bfsDuration,
                step: bidirectionalBfsPath ? formatPathToDisplay(bidirectionalBfsPath) : '',
                error: bidirectionalBfsPath ? '' : 'Nie znaleziono trasy.'
            }
        ];

        const anyPath = results.some((entry) => !!entry.step);
        if (!anyPath) {
            const noRouteError = new Error('Nie znaleziono trasy po istniejących połączeniach i panelach.');
            noRouteError.debug = debug;
            throw noRouteError;
        }

        const referencePath = dijkstraPath || bidirectionalBfsPath || [];
        const usesDeviceNode = referencePath.some((nodeKey) => String(nodeKey).startsWith('device:'));
        if (preferPanelsMode) {
            debug.push(`Użyto przejścia przez urządzenie: ${usesDeviceNode ? 'tak' : 'nie'}`);
        }
        debug.push('Reguła: urządzenie może być tylko początkiem lub końcem trasy.');
        debug.push(`Długość znalezionej ścieżki (kroki): ${Math.max(0, referencePath.length - 1)}`);

        return { results, debug };
    };

    const connectionsOverview = useMemo(() => {
        const panelPanel = [];
        const panelDevice = [];
        const deviceDevice = [];

        const panelPairSeen = new Set();
        Object.entries(graphPanelConnections).forEach(([panelId, map]) => {
            Object.entries(map || {}).forEach(([port, target]) => {
                if (target?.panelId) {
                    const a = { panelId: Number(panelId), port: Number(port) };
                    const b = { panelId: Number(target.panelId), port: Number(target.panelPort) };
                    const key = [
                        `${Math.min(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.min(a.port, b.port) : a.panelId < b.panelId ? a.port : b.port}`,
                        `${Math.max(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.max(a.port, b.port) : a.panelId < b.panelId ? b.port : a.port}`
                    ].join('|');
                    if (panelPairSeen.has(key)) return;
                    panelPairSeen.add(key);
                    panelPanel.push({
                        a: { type: 'panel', panelId: a.panelId, port: a.port },
                        b: { type: 'panel', panelId: b.panelId, port: b.port },
                        medium: target.medium || 'utp'
                    });
                }
                if (target?.devicePanelId) {
                    panelDevice.push({
                        a: { type: 'panel', panelId: Number(panelId), port: Number(port) },
                        b: { type: 'device', panelId: Number(target.devicePanelId), port: Number(target.devicePort) },
                        medium: target.medium || 'utp'
                    });
                }
            });
        });

        const devicePairSeen = new Set();
        Object.entries(graphDevicePanelPortTargets).forEach(([panelId, map]) => {
            Object.entries(map || {}).forEach(([port, target]) => {
                if (!target?.panelId) return;
                const a = { panelId: Number(panelId), port: Number(port) };
                const b = { panelId: Number(target.panelId), port: Number(target.port) };
                const key = [
                    `${Math.min(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.min(a.port, b.port) : a.panelId < b.panelId ? a.port : b.port}`,
                    `${Math.max(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.max(a.port, b.port) : a.panelId < b.panelId ? b.port : a.port}`
                ].join('|');
                if (devicePairSeen.has(key)) return;
                devicePairSeen.add(key);
                deviceDevice.push({
                    a: { type: 'device', panelId: a.panelId, port: a.port },
                    b: { type: 'device', panelId: b.panelId, port: b.port },
                    medium: target.medium || 'utp'
                });
            });
        });

        return { panelPanel, panelDevice, deviceDevice };
    }, [graphPanelConnections, graphDevicePanelPortTargets]);

    const [connectionsGraph, setConnectionsGraph] = useState(null);
    const computedConnectionsGraph = useMemo(() => {
        const panelNodes = [];
        const deviceNodes = [];
        const edges = [];

        const endpointKey = (endpoint) => `${endpoint.type}:${endpoint.panelId}:${endpoint.port}`;
        const endpointByKey = new Map();

        const registerEndpoint = (endpoint) => {
            const key = endpointKey(endpoint);
            if (!endpointByKey.has(key)) {
                endpointByKey.set(key, endpoint);
            }
            return key;
        };

        const portEdges = [];
        const addPortEdge = (a, b, type, medium = null) => {
            const aKey = registerEndpoint(a);
            const bKey = registerEndpoint(b);
            portEdges.push({ aKey, bKey, type, medium });
        };

        connectionsOverview.panelPanel.forEach((conn) => {
            addPortEdge(conn.a, conn.b, 'panel-panel', conn.medium || 'utp');
        });

        connectionsOverview.panelDevice.forEach((conn) => {
            const panelEndpoint = conn.a.type === 'panel' ? conn.a : conn.b;
            const deviceEndpoint = conn.a.type === 'device' ? conn.a : conn.b;
            addPortEdge(panelEndpoint, deviceEndpoint, 'panel-device', conn.medium || 'utp');
        });

        connectionsOverview.deviceDevice.forEach((conn) => {
            addPortEdge(conn.a, conn.b, 'device-device', conn.medium || 'utp');
        });

        Object.entries(graphPanelPortTargets).forEach(([panelId, map]) => {
            Object.entries(map || {}).forEach(([port, target]) => {
                if (!target?.panelId) return;
                if (!graphPanelConnections[panelId]?.[port]) return;
                addPortEdge(
                    { type: 'panel', panelId: Number(panelId), port: Number(port) },
                    { type: 'panel', panelId: Number(target.panelId), port: Number(target.port) },
                    'panel-target',
                    target.medium || 'utp'
                );
            });
        });

        const adjacency = new Map();
        portEdges.forEach((edge, index) => {
            if (!adjacency.has(edge.aKey)) adjacency.set(edge.aKey, []);
            if (!adjacency.has(edge.bKey)) adjacency.set(edge.bKey, []);
            adjacency.get(edge.aKey).push({ index, other: edge.bKey });
            adjacency.get(edge.bKey).push({ index, other: edge.aKey });
        });

        const isTerminal = (key) => {
            const endpoint = endpointByKey.get(key);
            const degree = adjacency.get(key)?.length || 0;
            return endpoint?.type === 'device' || degree !== 2;
        };

        const visitedEdges = new Set();
        const paths = [];

        const walkPath = (startKey, edgeRef) => {
            const pathNodes = [startKey];
            const pathEdges = [];
            let currentKey = startKey;
            let currentEdge = edgeRef;

            while (currentEdge) {
                const edgeIndex = currentEdge.index;
                if (visitedEdges.has(edgeIndex)) break;
                visitedEdges.add(edgeIndex);
                const edge = portEdges[edgeIndex];
                const nextKey = edge.aKey === currentKey ? edge.bKey : edge.aKey;
                pathEdges.push(edge);
                pathNodes.push(nextKey);
                if (isTerminal(nextKey)) break;
                const nextEdges = (adjacency.get(nextKey) || []).filter((entry) => entry.index !== edgeIndex);
                currentKey = nextKey;
                currentEdge = nextEdges[0];
            }

            return { pathNodes, pathEdges };
        };

        adjacency.forEach((edgesForNode, nodeKey) => {
            if (!isTerminal(nodeKey)) return;
            edgesForNode.forEach((edgeRef) => {
                if (visitedEdges.has(edgeRef.index)) return;
                paths.push(walkPath(nodeKey, edgeRef));
            });
        });

        portEdges.forEach((edge, index) => {
            if (visitedEdges.has(index)) return;
            const seed = edge.aKey;
            const edgeRef = (adjacency.get(seed) || []).find((entry) => entry.index === index);
            if (!edgeRef) return;
            paths.push(walkPath(seed, edgeRef));
        });

        const panelNodeMap = new Map();
        const deviceNodeMap = new Map();

        const getPanelNodeLabel = (endpoint) => {
            const meta = graphPanelMeta[String(endpoint.panelId)];
            const panelItem = graphItemById.get(endpoint.panelId);
            const name = panelItem?.name || meta?.name || endpoint.panelId;
            const lines = [];
            lines.push(`Port: ${endpoint.port}`);
            return lines.join('\n');
        };

        const getDeviceNodeLabel = (endpoint) => {
            const devicePanel = graphDevicePanelById.get(endpoint.panelId);
            const panelPath = graphDevicePanelPathMap.get(endpoint.panelId) || devicePanel?.name || `Panel ${endpoint.panelId}`;
            const lines = [];
            lines.push(`${panelPath} / ${endpoint.port}`);
            return lines.join('\n');
        };

        const getGraphEndpointLabel = (endpoint) => {
            if (!endpoint) return '';
            if (endpoint.type === 'panel') {
                return getPanelNodeLabel(endpoint).split('\n').join(' / ');
            }
            if (endpoint.type === 'device') {
                return getDeviceNodeLabel(endpoint).split('\n').join(' / ');
            }
            return '';
        };

        const getShortEndpointLabel = (endpoint) => {
            if (!endpoint) return '';
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)];
                const panelItem = graphItemById.get(endpoint.panelId);
                const name = panelItem?.name || meta?.name || endpoint.panelId;
                return `Panel: ${name} / Port: ${endpoint.port}`;
            }
            if (endpoint.type === 'device') {
                const devicePanel = graphDevicePanelById.get(endpoint.panelId);
                const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
                const parentItem = graphItemById.get(parentItemId);
                const typeLabel = parentItem?.type === 'server' ? 'Serwer' : 'Urządzenie';
                const name = parentItem?.name || parentItemId;
                const panelPath = graphDevicePanelPathMap.get(endpoint.panelId) || devicePanel?.name || `Panel ${endpoint.panelId}`;
                return `${typeLabel}: ${name} / ${panelPath} / ${endpoint.port}`;
            }
            return '';
        };

        const getEndpointRackKey = (endpoint) => {
            if (!endpoint) return null;
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)];
                return meta?.rack_id || meta?.rack_name || null;
            }
            if (endpoint.type === 'device') {
                const devicePanel = graphDevicePanelById.get(endpoint.panelId);
                const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
                const parentItem = graphItemById.get(parentItemId);
                const rackMeta = parentItem?.rack_id ? graphRackMetaById?.[parentItem.rack_id] : null;
                return rackMeta?.id || rackMeta?.name || parentItem?.rack_id || null;
            }
            return null;
        };

        const getEndpointLocationParts = (endpoint) => {
            if (!endpoint) return {};
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)] || {};
                return {
                    location: meta.location_name || null,
                    building: meta.building_name || null,
                    room: meta.room_name || null,
                    rack: meta.rack_name || null
                };
            }
            if (endpoint.type === 'device') {
                const devicePanel = graphDevicePanelById.get(endpoint.panelId);
                const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
                const parentItem = graphItemById.get(parentItemId);
                const rackMeta = parentItem?.rack_id ? graphRackMetaById?.[parentItem.rack_id] : null;
                return {
                    location: rackMeta?.location_name || location?.name || null,
                    building: rackMeta?.building_name || building?.name || null,
                    room: rackMeta?.room_name || room?.name || null,
                    rack: rackMeta?.name || rack?.name || null
                };
            }
            return {};
        };

        const getDiffEndpointLabel = (endpoint, otherEndpoint) => {
            if (!endpoint) return '';
            const parts = getEndpointLocationParts(endpoint);
            const otherParts = getEndpointLocationParts(otherEndpoint);
            const diffLines = [];
            if (parts.location && parts.location !== otherParts.location) {
                diffLines.push(`Lokalizacja: ${parts.location}`);
            }
            if (parts.building && parts.building !== otherParts.building) {
                diffLines.push(`Budynek: ${parts.building}`);
            }
            if (parts.room && parts.room !== otherParts.room) {
                diffLines.push(`Pomieszczenie: ${parts.room}`);
            }
            if (parts.rack && parts.rack !== otherParts.rack) {
                diffLines.push(`Szafa: ${parts.rack}`);
            }
            const core = endpoint.type === 'panel'
                ? getShortEndpointLabel(endpoint)
                : getShortEndpointLabel(endpoint);
            return diffLines.length ? `${diffLines.join(' / ')} / ${core}` : core;
        };

        const getNodeIdForEndpoint = (endpoint) => {
            if (endpoint.type === 'panel') {
                if (!showPanelNodes) return null;
                const key = `panel:${endpoint.panelId}:${endpoint.port}`;
                if (!panelNodeMap.has(key)) {
                    panelNodeMap.set(key, {
                        id: key,
                        label: getPanelNodeLabel(endpoint)
                    });
                }
                return key;
            }

            const key = `device:${endpoint.panelId}:${endpoint.port}`;
            if (!deviceNodeMap.has(key)) {
                deviceNodeMap.set(key, {
                    id: key,
                    label: getDeviceNodeLabel(endpoint)
                });
            }
            return key;
        };

        const addEdgeByEndpoints = (aEndpoint, bEndpoint, type, medium = null) => {
            const aKey = getNodeIdForEndpoint(aEndpoint);
            const bKey = getNodeIdForEndpoint(bEndpoint);
            if (!aKey || !bKey) return;
            const rackA = getEndpointRackKey(aEndpoint);
            const rackB = getEndpointRackKey(bEndpoint);
            const useShort = rackA && rackB && rackA === rackB;
            const label = useShort
                ? `${getShortEndpointLabel(aEndpoint)} ↔ ${getShortEndpointLabel(bEndpoint)}`
                : `${getDiffEndpointLabel(aEndpoint, bEndpoint)} ↔ ${getDiffEndpointLabel(bEndpoint, aEndpoint)}`;
            edges.push({ type, aKey, bKey, label, medium });
        };

        const displayPaths = [];
        if (showPanelNodes) {
            paths.forEach((path) => {
                const endpoints = path.pathNodes
                    .map((key) => endpointByKey.get(key))
                    .filter(Boolean);
                if (endpoints.length) displayPaths.push(endpoints);
                path.pathEdges.forEach((edge, edgeIndex) => {
                    const aEndpoint = endpointByKey.get(path.pathNodes[edgeIndex]);
                    const bEndpoint = endpointByKey.get(path.pathNodes[edgeIndex + 1]);
                    if (!aEndpoint || !bEndpoint) return;
                    addEdgeByEndpoints(aEndpoint, bEndpoint, edge.type, edge.medium || null);
                });
            });
        } else {
            const deviceKeys = Array.from(endpointByKey.keys()).filter((key) => {
                const endpoint = endpointByKey.get(key);
                return endpoint?.type === 'device';
            });

            const deviceEdgesMap = new Map();
            const addDeviceEdge = (aKey, bKey) => {
                if (aKey === bKey) return;
                const key = [aKey, bKey].sort().join('|');
                if (deviceEdgesMap.has(key)) return;
                const aEndpoint = endpointByKey.get(aKey);
                const bEndpoint = endpointByKey.get(bKey);
                if (!aEndpoint || !bEndpoint) return;
                deviceEdgesMap.set(key, {
                    aEndpoint,
                    bEndpoint
                });
            };

            deviceKeys.forEach((startKey) => {
                const visited = new Set([startKey]);
                const queue = [startKey];
                while (queue.length) {
                    const currentKey = queue.shift();
                    const neighbors = adjacency.get(currentKey) || [];
                    neighbors.forEach(({ other }) => {
                        if (visited.has(other)) return;
                        const endpoint = endpointByKey.get(other);
                        if (!endpoint) return;
                        if (endpoint.type === 'panel') {
                            visited.add(other);
                            queue.push(other);
                            return;
                        }
                        if (endpoint.type === 'device') {
                            addDeviceEdge(startKey, other);
                            visited.add(other);
                        }
                    });
                }
            });

            const deviceEdges = Array.from(deviceEdgesMap.values());
            deviceEdges.forEach(({ aEndpoint, bEndpoint }) => {
                addEdgeByEndpoints(aEndpoint, bEndpoint, 'device-device');
            });

            const deviceAdj = new Map();
            deviceEdges.forEach(({ aEndpoint, bEndpoint }) => {
                const aKey = endpointKey(aEndpoint);
                const bKey = endpointKey(bEndpoint);
                if (!deviceAdj.has(aKey)) deviceAdj.set(aKey, new Set());
                if (!deviceAdj.has(bKey)) deviceAdj.set(bKey, new Set());
                deviceAdj.get(aKey).add(bKey);
                deviceAdj.get(bKey).add(aKey);
            });

            const visitedDevices = new Set();
            deviceKeys.forEach((deviceKey) => {
                if (visitedDevices.has(deviceKey)) return;
                const stack = [deviceKey];
                const component = [];
                visitedDevices.add(deviceKey);
                while (stack.length) {
                    const key = stack.pop();
                    const endpoint = endpointByKey.get(key);
                    if (endpoint) component.push(endpoint);
                    const neighbors = deviceAdj.get(key) || new Set();
                    neighbors.forEach((neighbor) => {
                        if (!visitedDevices.has(neighbor)) {
                            visitedDevices.add(neighbor);
                            stack.push(neighbor);
                        }
                    });
                }
                if (component.length) {
                    component.sort((a, b) => getGraphEndpointLabel(a).localeCompare(getGraphEndpointLabel(b)));
                    displayPaths.push(component);
                }
            });
        }

        const uniqueEdgesMap = new Map();
        edges.forEach((edge) => {
            const key = [edge.aKey, edge.bKey].sort().join('|');
            if (!uniqueEdgesMap.has(key)) {
                uniqueEdgesMap.set(key, edge);
            }
        });
        const uniqueEdges = Array.from(uniqueEdgesMap.values());

        const panelList = Array.from(panelNodeMap.values());
        const deviceList = Array.from(deviceNodeMap.values());

        const rowHeight = 32;
        const nodeHeight = 21;
        const nodeWidth = 180;
        const columnGap = 60;
        const stepX = nodeWidth + columnGap;
        const startX = 40;

        const getGroupKey = (endpoint) => {
            if (!endpoint) return 'unknown';
            if (endpoint.type === 'panel') {
                return `panel:${endpoint.panelId}`;
            }
            const devicePanel = graphDevicePanelById.get(endpoint.panelId);
            const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
            return `device:${parentItemId}`;
        };

        const getGroupLabel = (endpoint) => {
            if (!endpoint) return '';
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)];
                const panelItem = graphItemById.get(endpoint.panelId);
                const name = panelItem?.name || meta?.name || `Panel ${endpoint.panelId}`;
                const locationName = meta?.location_name || location?.name;
                const buildingName = meta?.building_name || building?.name;
                const roomName = meta?.room_name || room?.name;
                const rackName = meta?.rack_name || rack?.name;
                const lines = [`Panel: ${name}`];
                if (locationName) lines.push(`Lokalizacja: ${locationName}`);
                if (buildingName) lines.push(`Budynek: ${buildingName}`);
                if (roomName) lines.push(`Pomieszczenie: ${roomName}`);
                if (rackName) lines.push(`Szafa: ${rackName}`);
                return lines.join('\n');
            }
            const devicePanel = graphDevicePanelById.get(endpoint.panelId);
            const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
            const parentItem = graphItemById.get(parentItemId);
            const typeLabel = parentItem?.type === 'server' ? 'Serwer' : 'Urządzenie';
            const name = parentItem?.name || `Urządzenie ${parentItemId}`;
            const rackMeta = parentItem?.rack_id ? graphRackMetaById?.[parentItem.rack_id] : null;
            const locationName = rackMeta?.location_name || location?.name;
            const buildingName = rackMeta?.building_name || building?.name;
            const roomName = rackMeta?.room_name || room?.name;
            const rackName = rackMeta?.name || rack?.name;
            const lines = [`${typeLabel}: ${name}`];
            if (parentItem?.ipv4) lines.push(`IPv4: ${parentItem.ipv4}`);
            if (parentItem?.hostname) lines.push(`Hostname: ${parentItem.hostname}`);
            if (parentItem?.owner) lines.push(`Opiekun: ${parentItem.owner}`);
            if (locationName) lines.push(`Lokalizacja: ${locationName}`);
            if (buildingName) lines.push(`Budynek: ${buildingName}`);
            if (roomName) lines.push(`Pomieszczenie: ${roomName}`);
            if (rackName) lines.push(`Szafa: ${rackName}`);
            return lines.join('\n');
        };

        const groupOrder = new Map();
        const groupLabels = new Map();
        const nodeGroupMap = new Map();
        displayPaths.forEach((pathEndpoints) => {
            pathEndpoints.forEach((endpoint) => {
                const groupKey = getGroupKey(endpoint);
                if (!groupOrder.has(groupKey)) {
                    groupOrder.set(groupKey, groupOrder.size);
                }
                if (!groupLabels.has(groupKey)) {
                    groupLabels.set(groupKey, getGroupLabel(endpoint));
                }
            });
        });

        const positions = new Map();
        const orderedNodeIds = [];
        const seenNodes = new Set();
        const groupMembersMap = new Map();
        const nodeLabelMap = new Map();
        panelList.forEach((node) => nodeLabelMap.set(node.id, node.label));
        deviceList.forEach((node) => nodeLabelMap.set(node.id, node.label));
        displayPaths.forEach((pathEndpoints) => {
            pathEndpoints.forEach((endpoint) => {
                const instanceKey = getNodeIdForEndpoint(endpoint);
                if (!instanceKey || seenNodes.has(instanceKey)) return;
                seenNodes.add(instanceKey);
                orderedNodeIds.push(instanceKey);
                const groupKey = getGroupKey(endpoint);
                nodeGroupMap.set(instanceKey, groupKey);
                if (!groupMembersMap.has(groupKey)) {
                    groupMembersMap.set(groupKey, []);
                }
                groupMembersMap.get(groupKey).push(instanceKey);
            });
        });

        const groupGap = 24;
        const maxColumnHeight = 900;
        let currentX = startX;
        let currentY = 40;
        let maxY = currentY;
        Array.from(groupOrder.keys()).forEach((groupKey) => {
            const members = (groupMembersMap.get(groupKey) || []).slice();
            members.sort((a, b) => (nodeLabelMap.get(a) || '').localeCompare(nodeLabelMap.get(b) || ''));
            const groupHeight = members.length * rowHeight + (members.length ? groupGap : 0);
            if (currentY + groupHeight > maxColumnHeight && currentY > 40) {
                currentX += nodeWidth + columnGap;
                currentY = 40;
            }
            members.forEach((instanceKey) => {
                positions.set(instanceKey, {
                    x: currentX,
                    y: currentY,
                    width: nodeWidth,
                    height: nodeHeight
                });
                currentY += rowHeight;
            });
            if (members.length) {
                currentY += groupGap;
            }
            maxY = Math.max(maxY, currentY);
        });

        const height = Math.max(1, maxY) + 80;
        const width = currentX + nodeWidth + 200;

        const groups = Array.from(groupOrder.keys()).map((groupKey) => ({
            id: groupKey,
            label: groupLabels.get(groupKey) || groupKey,
            memberIds: Array.from(nodeGroupMap.entries())
                .filter(([, key]) => key === groupKey)
                .map(([nodeId]) => nodeId),
            labelPos: groupLabelPositions[groupKey] || null
        }));

        return {
            panelList,
            deviceList,
            edges: uniqueEdges,
            positions,
            width,
            height,
            groups,
            nodeGroupMap
        };
    }, [
        connectionsOverview,
        graphDevicePanelById,
        graphDevicePanelPathMap,
        graphItemById,
        graphPanelMeta,
        graphPanelPortTargets,
        graphPanelConnections,
        graphRackMetaById,
        showPanelNodes,
        groupLabelPositions
    ]);
    useEffect(() => {
        setConnectionsGraph(computedConnectionsGraph);
    }, [computedConnectionsGraph]);
    const graph = connectionsGraph || computedConnectionsGraph;

    const mergedGraphPositions = useMemo(() => {
        const merged = new Map(graph.positions);
        Object.entries(graphPositions).forEach(([key, pos]) => {
            if (!pos) return;
            merged.set(key, { ...merged.get(key), ...pos });
        });
        return merged;
    }, [graph.positions, graphPositions]);

    const graphBounds = useMemo(() => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const pos of mergedGraphPositions.values()) {
            if (!pos) continue;
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + pos.width);
            maxY = Math.max(maxY, pos.y + pos.height);
        }

        diagramRects.forEach((rect) => {
            if (!rect) return;
            minX = Math.min(minX, rect.x);
            minY = Math.min(minY, rect.y);
            maxX = Math.max(maxX, rect.x + rect.width);
            maxY = Math.max(maxY, rect.y + rect.height);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
            return { x: 0, y: 0, width: graph.width, height: graph.height };
        }

        const padding = 120;
        return {
            x: Math.floor(minX - padding),
            y: Math.floor(minY - padding),
            width: Math.ceil(maxX - minX + padding * 2),
            height: Math.ceil(maxY - minY + padding * 2)
        };
    }, [mergedGraphPositions, diagramRects, graph.width, graph.height]);

    const getSvgPoint = (event) => {
        const svg = connectionsSvgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX + viewBox.x,
            y: (event.clientY - rect.top) * scaleY + viewBox.y
        };
    };

    const getGraphPoint = (event) => {
        const point = getSvgPoint(event);
        return {
            x: (point.x - graphPan.x) / graphZoom,
            y: (point.y - graphPan.y) / graphZoom
        };
    };

    const handleNodeMouseDown = (nodeId, event) => {
        const pos = mergedGraphPositions.get(nodeId);
        if (!pos) return;
        const point = getSvgPoint(event);
        setDraggingNode({
            id: nodeId,
            offsetX: (point.x - graphPan.x) / graphZoom - pos.x,
            offsetY: (point.y - graphPan.y) / graphZoom - pos.y,
            width: pos.width,
            height: pos.height
        });
        event.preventDefault();
    };

    const handleGroupMouseDown = (groupId, event) => {
        const group = graph.groups?.find((g) => g.id === groupId);
        if (!group || !group.memberIds?.length) return;
        const point = getGraphPoint(event);
        const members = group.memberIds
            .map((id) => {
                const pos = mergedGraphPositions.get(id);
                if (!pos) return null;
                return { id, x: pos.x, y: pos.y, width: pos.width, height: pos.height };
            })
            .filter(Boolean);
        if (members.length === 0) return;
        setDraggingGroup({
            id: groupId,
            startX: point.x,
            startY: point.y,
            members,
            labelPos: group.labelPos ? { ...group.labelPos } : null
        });
        event.preventDefault();
    };

    const handleRectMouseDown = (rectId, event) => {
        const rect = diagramRects.find((item) => item.id === rectId);
        if (!rect) return;
        const point = getGraphPoint(event);
        setDraggingRect({
            id: rectId,
            offsetX: point.x - rect.x,
            offsetY: point.y - rect.y
        });
        event.preventDefault();
    };

    const handleRectResizeMouseDown = (rectId, event) => {
        const rect = diagramRects.find((item) => item.id === rectId);
        if (!rect) return;
        const point = getGraphPoint(event);
        setResizingRect({
            id: rectId,
            startX: point.x,
            startY: point.y,
            startW: rect.width,
            startH: rect.height
        });
        event.preventDefault();
    };

    const handleSvgMouseDown = (event) => {
        if (event.target !== event.currentTarget) return;
        const point = getSvgPoint(event);
        setPanning({
            startX: point.x,
            startY: point.y,
            startPanX: graphPan.x,
            startPanY: graphPan.y
        });
    };

    const handleSvgMouseMove = (event) => {
        if (resizingRect) {
            const point = getGraphPoint(event);
            const dx = point.x - resizingRect.startX;
            const dy = point.y - resizingRect.startY;
            setDiagramRects((prev) =>
                prev.map((rect) =>
                    rect.id === resizingRect.id
                        ? {
                            ...rect,
                            width: Math.max(40, resizingRect.startW + dx),
                            height: Math.max(30, resizingRect.startH + dy)
                        }
                        : rect
                )
            );
            return;
        }
        if (draggingRect) {
            const point = getGraphPoint(event);
            const nextX = point.x - draggingRect.offsetX;
            const nextY = point.y - draggingRect.offsetY;
            setDiagramRects((prev) =>
                prev.map((rect) =>
                    rect.id === draggingRect.id
                        ? { ...rect, x: nextX, y: nextY }
                        : rect
                )
            );
            return;
        }
        if (draggingGroup) {
            const point = getGraphPoint(event);
            const dx = point.x - draggingGroup.startX;
            const dy = point.y - draggingGroup.startY;
            setGraphPositions((prev) => {
                const next = { ...prev };
                draggingGroup.members.forEach((member) => {
                    next[member.id] = {
                        x: member.x + dx,
                        y: member.y + dy,
                        width: member.width,
                        height: member.height
                    };
                });
                return next;
            });
            if (draggingGroup.labelPos) {
                setGroupLabelPositions((prev) => ({
                    ...prev,
                    [draggingGroup.id]: {
                        x: draggingGroup.labelPos.x + dx,
                        y: draggingGroup.labelPos.y + dy
                    }
                }));
            }
            return;
        }
        if (draggingNode) {
            const point = getSvgPoint(event);
            let nextX = (point.x - graphPan.x) / graphZoom - draggingNode.offsetX;
            let nextY = (point.y - graphPan.y) / graphZoom - draggingNode.offsetY;
            if (draggingNode.isGroupLabel && draggingNode.groupId) {
                const group = graph.groups?.find((g) => g.id === draggingNode.groupId);
                if (group) {
                    const members = group.memberIds || [];
                    let minX = Infinity;
                    let minY = Infinity;
                    let maxX = -Infinity;
                    let maxY = -Infinity;
                    members.forEach((id) => {
                        const pos = mergedGraphPositions.get(id);
                        if (!pos) return;
                        minX = Math.min(minX, pos.x);
                        minY = Math.min(minY, pos.y);
                        maxX = Math.max(maxX, pos.x + pos.width);
                        maxY = Math.max(maxY, pos.y + pos.height);
                    });
                    if (Number.isFinite(minX)) {
                        const padding = 18;
                        let labelX = group.labelPos?.x ?? minX + (maxX - minX) / 2 - draggingNode.width / 2;
                        let labelY = group.labelPos?.y ?? minY - padding + 8;
                        minX = Math.min(minX, labelX);
                        minY = Math.min(minY, labelY);
                        maxX = Math.max(maxX, labelX + draggingNode.width);
                        maxY = Math.max(maxY, labelY + draggingNode.height);
                        const baseX = minX - padding;
                        const baseY = minY - padding;
                        const baseW = maxX - minX + padding * 2;
                        const baseH = maxY - minY + padding * 2;
                        const maxLabelX = baseX + baseW - draggingNode.width;
                        const maxLabelY = baseY + baseH - draggingNode.height;
                        nextX = Math.min(Math.max(nextX, baseX), maxLabelX);
                        nextY = Math.min(Math.max(nextY, baseY), maxLabelY);
                    }
                }
                setGroupLabelPositions((prev) => ({
                    ...prev,
                    [draggingNode.groupId]: { x: nextX, y: nextY }
                }));
            } else {
                setGraphPositions((prev) => ({
                    ...prev,
                    [draggingNode.id]: {
                        x: nextX,
                        y: nextY,
                        width: draggingNode.width,
                        height: draggingNode.height
                    }
                }));
            }
            return;
        }
        if (!panning) return;
        const point = getSvgPoint(event);
        const rect = connectionsSvgRef.current?.getBoundingClientRect();
        const panSpeedX = rect?.width
            ? Math.min(2, Math.max(0.5, 1000 / rect.width))
            : 1;
        setGraphPan({
            x: panning.startPanX + (point.x - panning.startX) * panSpeedX,
            y: panning.startPanY + (point.y - panning.startY)
        });
    };

    const handleSvgMouseUp = () => {
        if (draggingNode) {
            setDraggingNode(null);
        }
        if (draggingGroup) {
            setDraggingGroup(null);
        }
        if (draggingRect) {
            setDraggingRect(null);
        }
        if (resizingRect) {
            setResizingRect(null);
        }
        if (panning) {
            setPanning(null);
        }
    };

    const handleSvgWheel = (event) => {
        event.preventDefault();
        const svg = connectionsSvgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const cursorX = (event.clientX - rect.left) * scaleX + viewBox.x;
        const cursorY = (event.clientY - rect.top) * scaleY + viewBox.y;

        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = Math.min(8, Math.max(0.15, graphZoom * zoomFactor));
        const zoomRatio = nextZoom / graphZoom;

        setGraphPan((prev) => ({
            x: cursorX - (cursorX - prev.x) * zoomRatio,
            y: cursorY - (cursorY - prev.y) * zoomRatio
        }));
        setGraphZoom(nextZoom);
    };

    useEffect(() => {
        const svg = connectionsSvgRef.current;
        if (!svg) return undefined;
        const handleWheel = (event) => handleSvgWheel(event);
        svg.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            svg.removeEventListener('wheel', handleWheel);
        };
    }, [handleSvgWheel]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            const isTypingTarget =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);
            if (isTypingTarget) return;
            const step = event.shiftKey ? 80 : 40;
            let dx = 0;
            let dy = 0;
            if (event.key === 'ArrowLeft') dx = step;
            if (event.key === 'ArrowRight') dx = -step;
            if (event.key === 'ArrowUp') dy = step;
            if (event.key === 'ArrowDown') dy = -step;
            if (dx === 0 && dy === 0) return;
            event.preventDefault();
            setGraphPan((prev) => ({
                x: prev.x + dx,
                y: prev.y + dy
            }));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const resetConnectionsLayout = () => {
        setGraphPositions({});
        setGraphPan({ x: 0, y: 0 });
        setGraphZoom(1);
        setDraggingNode(null);
        setDraggingGroup(null);
        setDraggingRect(null);
        setResizingRect(null);
        setPanning(null);
        if (token) {
            apiRequest(`/api/diagram-layouts-global/${layoutKey}`, {
                method: 'DELETE',
                token
            }).catch(() => { });
        }
    };

    const openRectForm = (rect) => {
        setRectFormOpen(true);
        setRectEditingId(rect?.id || null);
        setRectForm({
            name: rect?.name || '',
            layer: rect?.layer || 5,
            color: rect?.color || '#93c5fd'
        });
    };

    const addDiagramRect = () => {
        const id = `rect-${Date.now()}`;
        const newRect = {
            id,
            name: 'Nowy prostokąt',
            layer: 5,
            color: '#93c5fd',
            x: 40,
            y: 40,
            width: 220,
            height: 140
        };
        setDiagramRects((prev) => [...prev, newRect]);
        openRectForm(newRect);
    };

    const saveRectForm = () => {
        const layerValue = Math.min(10, Math.max(1, Number(rectForm.layer) || 1));
        if (rectEditingId) {
            setDiagramRects((prev) =>
                prev.map((rect) =>
                    rect.id === rectEditingId
                        ? { ...rect, name: rectForm.name.trim() || rect.name, layer: layerValue, color: rectForm.color }
                        : rect
                )
            );
        }
        setRectFormOpen(false);
        setRectEditingId(null);
    };

    const removeRect = () => {
        if (!rectEditingId) return;
        setDiagramRects((prev) => prev.filter((rect) => rect.id !== rectEditingId));
        setRectFormOpen(false);
        setRectEditingId(null);
    };
    const removeSelectedCable = async () => {
        if (!selectedCable) return;
        try {
            setError('');
            const a = selectedCable.a;
            const b = selectedCable.b;
            if (a.type === 'panel' && b.type === 'panel') {
                await apiRequest('/api/panel-ports/link', {
                    method: 'DELETE',
                    body: {
                        fromPanelId: a.panelId,
                        fromPort: a.port,
                        toPanelId: b.panelId,
                        toPort: b.port
                    },
                    token
                });
                setPanelConnections((prev) => {
                    const next = { ...prev };
                    if (a.panelId === b.panelId) {
                        const map = { ...(next[a.panelId] || {}) };
                        delete map[a.port];
                        delete map[b.port];
                        next[a.panelId] = map;
                    } else {
                        const mapA = { ...(next[a.panelId] || {}) };
                        const mapB = { ...(next[b.panelId] || {}) };
                        delete mapA[a.port];
                        delete mapB[b.port];
                        next[a.panelId] = mapA;
                        next[b.panelId] = mapB;
                    }
                    return next;
                });
            } else if (
                (a.type === 'panel' && b.type === 'device') ||
                (a.type === 'device' && b.type === 'panel')
            ) {
                const panel = a.type === 'panel' ? a : b;
                const device = a.type === 'device' ? a : b;
                await apiRequest('/api/panel-device-ports/link', {
                    method: 'DELETE',
                    body: {
                        panelId: panel.panelId,
                        panelPort: panel.port,
                        devicePanelId: device.panelId,
                        devicePort: device.port
                    },
                    token
                });
                setPanelConnections((prev) => {
                    const next = { ...prev };
                    const map = { ...(next[panel.panelId] || {}) };
                    delete map[panel.port];
                    next[panel.panelId] = map;
                    return next;
                });
                setDevicePanelConnections((prev) => {
                    const next = { ...prev };
                    const map = { ...(next[device.panelId] || {}) };
                    delete map[device.port];
                    next[device.panelId] = map;
                    return next;
                });
            } else if (a.type === 'device' && b.type === 'device') {
                await apiRequest('/api/device-panel-ports/link', {
                    method: 'DELETE',
                    body: {
                        fromPanelId: a.panelId,
                        fromPort: a.port,
                        toPanelId: b.panelId,
                        toPort: b.port
                    },
                    token
                });
                setDevicePanelPortTargets((prev) => {
                    const next = { ...prev };
                    if (a.panelId === b.panelId) {
                        const map = { ...(next[a.panelId] || {}) };
                        delete map[a.port];
                        delete map[b.port];
                        next[a.panelId] = map;
                    } else {
                        const mapA = { ...(next[a.panelId] || {}) };
                        const mapB = { ...(next[b.panelId] || {}) };
                        delete mapA[a.port];
                        delete mapB[b.port];
                        next[a.panelId] = mapA;
                        next[b.panelId] = mapB;
                    }
                    return next;
                });
            }
            setSelectedCable(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const updateSelectedCableMedium = async (nextMedium) => {
        if (!selectedCable) return;
        const allowed = getAllowedMediaForSelectedCable(selectedCable);
        if (!nextMedium || (allowed.length && !allowed.includes(nextMedium))) {
            setError('Nie można ustawić medium niezgodnego z celem gniazda.');
            return;
        }
        try {
            setError('');
            const { a, b } = selectedCable;
            if (a.type === 'panel' && b.type === 'panel') {
                await apiRequest('/api/panel-ports/link', {
                    method: 'POST',
                    body: {
                        fromPanelId: a.panelId,
                        fromPort: a.port,
                        toPanelId: b.panelId,
                        toPort: b.port,
                        medium: nextMedium
                    },
                    token
                });
                setPanelConnections((prev) => {
                    const next = { ...prev };
                    const mapA = { ...(next[a.panelId] || {}) };
                    const mapB = { ...(next[b.panelId] || {}) };
                    if (mapA[a.port]) mapA[a.port] = { ...mapA[a.port], medium: nextMedium };
                    if (mapB[b.port]) mapB[b.port] = { ...mapB[b.port], medium: nextMedium };
                    next[a.panelId] = mapA;
                    next[b.panelId] = mapB;
                    return next;
                });
                return;
            }
            if ((a.type === 'panel' && b.type === 'device') || (a.type === 'device' && b.type === 'panel')) {
                const panel = a.type === 'panel' ? a : b;
                const device = a.type === 'device' ? a : b;
                await apiRequest('/api/panel-device-ports/link', {
                    method: 'POST',
                    body: {
                        panelId: panel.panelId,
                        panelPort: panel.port,
                        devicePanelId: device.panelId,
                        devicePort: device.port,
                        medium: nextMedium
                    },
                    token
                });
                setPanelConnections((prev) => {
                    const next = { ...prev };
                    const map = { ...(next[panel.panelId] || {}) };
                    if (map[panel.port]) map[panel.port] = { ...map[panel.port], medium: nextMedium };
                    next[panel.panelId] = map;
                    return next;
                });
                setDevicePanelConnections((prev) => {
                    const next = { ...prev };
                    const map = { ...(next[device.panelId] || {}) };
                    if (map[device.port]) map[device.port] = { ...map[device.port], medium: nextMedium };
                    next[device.panelId] = map;
                    return next;
                });
                return;
            }
            if (a.type === 'device' && b.type === 'device') {
                await apiRequest('/api/device-panel-ports/link', {
                    method: 'POST',
                    body: {
                        fromPanelId: a.panelId,
                        fromPort: a.port,
                        toPanelId: b.panelId,
                        toPort: b.port,
                        medium: nextMedium
                    },
                    token
                });
                setDevicePanelPortTargets((prev) => {
                    const next = { ...prev };
                    const mapA = { ...(next[a.panelId] || {}) };
                    const mapB = { ...(next[b.panelId] || {}) };
                    if (mapA[a.port]) mapA[a.port] = { ...mapA[a.port], medium: nextMedium };
                    if (mapB[b.port]) mapB[b.port] = { ...mapB[b.port], medium: nextMedium };
                    next[a.panelId] = mapA;
                    next[b.panelId] = mapB;
                    return next;
                });
            }
        } catch (err) {
            setError(err.message);
        }
    };


    const handleDevicePortClick = async (panel, port) => {
        if (!panel || !port) return;
        if (!pendingDeviceCable && !pendingPanelCable) {
            if (isSelectedEndpoint('device', panel.id, port)) {
                setSelectedCable(null);
                return;
            }
            const target = devicePanelConnections[panel.id]?.[port] || devicePanelPortTargets[panel.id]?.[port];
            if (target) {
                if (devicePanelConnections[panel.id]?.[port]) {
                    setSelectedCable({
                        a: { type: 'device', panelId: panel.id, port },
                        b: { type: 'panel', panelId: target.panelId, port: target.panelPort }
                    });
                } else {
                    setSelectedCable({
                        a: { type: 'device', panelId: panel.id, port },
                        b: { type: 'device', panelId: target.panelId, port: target.port }
                    });
                }
                return;
            }
            setSelectedCable(null);
        }
        if (pendingPanelCable) {
            let keepPending = false;
            try {
                setError('');
                const allowed = pendingCableMediaOptions.filter((opt) =>
                    getAllowedMediaForEndpoint('device', panel.id, port).includes(opt)
                );
                if (allowed.length === 0) {
                    setError('Nie można połączyć gniazd o różnych mediach.');
                    return;
                }
                const medium = resolveAutoMedium(allowed);
                setPendingCableMediaOptions(allowed);
                setPendingCableMedium(medium);
                const source = pendingPanelCable.label
                    ? pendingPanelCable
                    : buildPanelEndpoint(pendingPanelCable.panelId, pendingPanelCable.port);
                const target = buildDeviceEndpoint(panel.id, port);
                const payload = {
                    linkKind: 'panel-device',
                    source,
                    target,
                    medium
                };

                if (isCrossRackSelection(source, target)) {
                    keepPending = true;
                    openLinkModeChooser(payload);
                    return;
                }

                await executeDirectLink(payload);
            } catch (err) {
                setError(err.message);
            } finally {
                if (!keepPending) {
                    clearPendingSelection();
                }
            }
            return;
        }
        if (!pendingDeviceCable) {
            const allowed = getAllowedMediaForEndpoint('device', panel.id, port);
            const medium = resolveAutoMedium(allowed);
            setPendingCableMediaOptions(allowed);
            setPendingCableMedium(medium);
            setPendingDeviceCable(buildDeviceEndpoint(panel.id, port));
            setPendingPanelCable(null);
            setSelectedCable(null);
            return;
        }
        if (pendingDeviceCable.panelId === panel.id && pendingDeviceCable.port === port) {
            setPendingDeviceCable(null);
            return;
        }
        let keepPending = false;
        try {
            setError('');
            const allowed = pendingCableMediaOptions.filter((opt) =>
                getAllowedMediaForEndpoint('device', panel.id, port).includes(opt)
            );
            if (allowed.length === 0) {
                setError('Nie można połączyć gniazd o różnych mediach.');
                return;
            }
            const medium = resolveAutoMedium(allowed);
            setPendingCableMediaOptions(allowed);
            setPendingCableMedium(medium);
            const source = pendingDeviceCable.label
                ? pendingDeviceCable
                : buildDeviceEndpoint(pendingDeviceCable.panelId, pendingDeviceCable.port);
            const target = buildDeviceEndpoint(panel.id, port);
            const payload = {
                linkKind: 'device-device',
                source,
                target,
                medium
            };

            if (isCrossRackSelection(source, target)) {
                keepPending = true;
                openLinkModeChooser(payload);
                return;
            }

            await executeDirectLink(payload);
        } catch (err) {
            setError(err.message);
        } finally {
            if (!keepPending) {
                clearPendingSelection();
            }
        }
    };

    const handlePanelPortClick = async (panelItem, port) => {
        if (!panelItem || !port) return;
        if (!pendingDeviceCable && !pendingPanelCable) {
            if (isSelectedEndpoint('panel', panelItem.id, port)) {
                setSelectedCable(null);
                return;
            }
            const target = panelConnections[panelItem.id]?.[port];
            if (target) {
                if (target.devicePanelId) {
                    setSelectedCable({
                        a: { type: 'panel', panelId: panelItem.id, port },
                        b: { type: 'device', panelId: target.devicePanelId, port: target.devicePort }
                    });
                } else if (target.panelId) {
                    setSelectedCable({
                        a: { type: 'panel', panelId: panelItem.id, port },
                        b: { type: 'panel', panelId: target.panelId, port: target.panelPort }
                    });
                }
                return;
            }
            setSelectedCable(null);
        }
        if (pendingDeviceCable) {
            let keepPending = false;
            try {
                setError('');
                const allowed = pendingCableMediaOptions.filter((opt) =>
                    getAllowedMediaForEndpoint('panel', panelItem.id, port).includes(opt)
                );
                if (allowed.length === 0) {
                    setError('Nie można połączyć gniazd o różnych mediach.');
                    return;
                }
                const medium = resolveAutoMedium(allowed);
                setPendingCableMediaOptions(allowed);
                setPendingCableMedium(medium);
                const source = pendingDeviceCable.label
                    ? pendingDeviceCable
                    : buildDeviceEndpoint(pendingDeviceCable.panelId, pendingDeviceCable.port);
                const target = buildPanelEndpoint(panelItem.id, port);
                const payload = {
                    linkKind: 'panel-device',
                    source,
                    target,
                    medium
                };

                if (isCrossRackSelection(source, target)) {
                    keepPending = true;
                    openLinkModeChooser(payload);
                    return;
                }

                await executeDirectLink(payload);
            } catch (err) {
                setError(err.message);
            } finally {
                if (!keepPending) {
                    clearPendingSelection();
                }
            }
            return;
        }
        if (!pendingPanelCable) {
            const allowed = getAllowedMediaForEndpoint('panel', panelItem.id, port);
            const medium = resolveAutoMedium(allowed);
            setPendingCableMediaOptions(allowed);
            setPendingCableMedium(medium);
            setPendingPanelCable(buildPanelEndpoint(panelItem.id, port));
            setPendingDeviceCable(null);
            setSelectedCable(null);
            return;
        }
        if (pendingPanelCable.panelId === panelItem.id && pendingPanelCable.port === port) {
            setPendingPanelCable(null);
            return;
        }
        let keepPending = false;
        try {
            setError('');
            const sourcePanelId = pendingPanelCable.panelId;
            const sourcePort = pendingPanelCable.port;
            const targetPanelId = panelItem.id;
            const targetPort = port;
            const allowed = pendingCableMediaOptions.filter((opt) =>
                getAllowedMediaForEndpoint('panel', panelItem.id, port).includes(opt)
            );
            if (allowed.length === 0) {
                setError('Nie można połączyć gniazd o różnych mediach.');
                return;
            }
            const medium = resolveAutoMedium(allowed);
            setPendingCableMediaOptions(allowed);
            setPendingCableMedium(medium);
            const source = pendingPanelCable.label
                ? pendingPanelCable
                : buildPanelEndpoint(sourcePanelId, sourcePort);
            const target = buildPanelEndpoint(targetPanelId, targetPort);
            const payload = {
                linkKind: 'panel-panel',
                source,
                target,
                medium
            };

            if (isCrossRackSelection(source, target)) {
                keepPending = true;
                openLinkModeChooser(payload);
                return;
            }

            await executeDirectLink(payload);
        } catch (err) {
            setError(err.message);
        } finally {
            if (!keepPending) {
                clearPendingSelection();
            }
        }
    };

    const handleLinkModeDirect = async () => {
        if (!linkModePrompt) return;
        try {
            setError('');
            await executeDirectLink(linkModePrompt);
            setLinkModePrompt(null);
            clearPendingSelection();
        } catch (err) {
            setError(err.message || 'Nie udało się utworzyć połączenia.');
        }
    };

    const handleLinkModeRouteProposal = async () => {
        if (!linkModePrompt) return;
        setRouteProposalOpen(true);
        setRouteProposalLoading(true);
        setRouteProposalError('');
        setRouteProposalSteps([]);
        setRouteProposalResults([]);
        setRouteProposalDebug([]);
        try {
            const result = await buildRoutingProposal(linkModePrompt);
            const steps = Array.isArray(result) ? result : result?.steps || [];
            const results = Array.isArray(result?.results) ? result.results : [];
            const debug = Array.isArray(result?.debug) ? result.debug : [];
            setRouteProposalSteps(steps);
            setRouteProposalResults(results);
            setRouteProposalDebug(debug);
        } catch (err) {
            setRouteProposalError(err.message || 'Nie udało się wyznaczyć trasy.');
            setRouteProposalDebug(Array.isArray(err?.debug) ? err.debug : []);
        } finally {
            setRouteProposalLoading(false);
            setLinkModePrompt(null);
            clearPendingSelection();
        }
    };

    const refreshDevicePanels = async (itemId) => {
        const list = await apiRequest(`/api/devices/${itemId}/panels`, { token });
        setDevicePanelList(list || []);
        setDevicePanels((prev) => ({ ...prev, [itemId]: list || [] }));
    };

    const openDevicePanelModal = async (itemId) => {
        setDevicePanelModalOpen(true);
        setDevicePanelItemId(itemId);
        setDevicePanelEditingId(null);
        setDevicePanelForm({ name: '', portCount: 24, portRows: 1, portFlow: 'row', parentPanelId: null });
        setDevicePanelError('');
        await refreshDevicePanels(itemId);
    };

    const refreshServerDisks = async (itemId) => {
        const data = await apiRequest(`/api/servers/${itemId}/disks`, { token });
        setServerDiskList(data?.disks || []);
    };

    const openServerDisksModal = async (itemId) => {
        setServerDisksModalOpen(true);
        setServerDiskItemId(itemId);
        setServerDiskEditingId(null);
        setServerDiskForm({
            name: '',
            owner: '',
            sizeValue: '',
            sizeUnit: 'GB',
            clause: '',
            serial: '',
            assetNo: ''
        });
        setServerDiskError('');
        await refreshServerDisks(itemId);
    };

    function startCreate(startU) {
        setEditingId(null);
        setForm({
            name: '',
            type: 'panel',
            startU,
            heightU: 1,
            portCount: 24,
            ipv4: '',
            serial: '',
            hostname: '',
            owner: ''
        });
        setShowForm(true);
        setError('');
        setTemplateId('');
        setTemplateName('');
        setPendingPanelLayout(null);
        setPendingDevicePanels(null);
    }

    function startEdit(item) {
        setEditingId(item.id);
        setForm({
            name: item.name,
            type: item.type,
            startU: item.start_u,
            heightU: item.height_u,
            portCount: item.port_count || 24,
            ipv4: item.ipv4 || '',
            serial: item.serial || '',
            hostname: item.hostname || '',
            owner: item.owner || ''
        });
        if (item.type === 'device' || item.type === 'server') {
            refreshDevicePanels(item.id);
        }
        setShowForm(true);
        setError('');
        setTemplateId('');
        setTemplateName('');
        setPendingPanelLayout(null);
        setPendingDevicePanels(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                name: form.name,
                type: form.type,
                startU: Number(form.startU),
                heightU: Number(form.heightU),
                portCount: form.type === 'panel' ? Number(form.portCount) : undefined,
                ipv4: form.type === 'panel' ? undefined : form.ipv4,
                serial: form.type === 'panel' ? undefined : form.serial,
                hostname: form.type === 'panel' ? undefined : form.hostname,
                owner: form.type === 'panel' ? undefined : form.owner
            };
            let savedItem = null;
            if (editingId) {
                savedItem = await apiRequest(`/api/rack-items/${editingId}`, {
                    method: 'PUT',
                    body: payload,
                    token
                });
            } else {
                savedItem = await apiRequest(`/api/racks/${rack.id}/items`, {
                    method: 'POST',
                    body: payload,
                    token
                });
            }
            if (!editingId && savedItem?.id) {
                if (payload.type === 'panel' && pendingPanelLayout) {
                    await apiRequest(`/api/panels/${savedItem.id}/ports`, {
                        method: 'PUT',
                        body: {
                            portCount: Number(payload.portCount),
                            portRows: Number(pendingPanelLayout.portRows) || 1,
                            portFlow: pendingPanelLayout.portFlow === 'column' ? 'column' : 'row',
                            mode: 'group',
                            ranges: [],
                            links: []
                        },
                        token
                    });
                }
                if ((payload.type === 'device' || payload.type === 'server') && Array.isArray(pendingDevicePanels)) {
                    await apiRequest(`/api/devices/${savedItem.id}/panels/bulk`, {
                        method: 'POST',
                        body: { panels: pendingDevicePanels },
                        token
                    });
                }
            }
            await reload();
            setShowForm(false);
            setEditingId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Czy na pewno chcesz usunąć to urządzenie?')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiRequest(`/api/rack-items/${id}`, { method: 'DELETE', token });
            await reload();
            setShowForm(false);
            setEditingId(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const itemByUnit = new Map();
    const topUnitForItem = new Map();
    items.forEach((item) => {
        const top = item.start_u;
        const bottom = item.start_u - item.height_u + 1;
        topUnitForItem.set(item.id, top);
        for (let u = bottom; u <= top; u += 1) {
            itemByUnit.set(u, item);
        }
    });

    const getDevicePanelNameLabel = (panelId) => {
        const panel = devicePanelById.get(panelId);
        if (!panel) return '';
        return devicePanelPathMap.get(panelId) || panel?.name || `Panel ${panelId}`;
    };

    const getDevicePanelPortLabel = (panelId, portNumber) => {
        if (!panelId || !portNumber) return '';
        const panelName = getDevicePanelNameLabel(panelId);
        return panelName ? `${panelName} / ${portNumber}` : `${portNumber}`;
    };

    const sfpPanel = sfpPanelId ? devicePanelById.get(sfpPanelId) : null;
    const sfpPortMap = sfpPanelId ? sfpAssignments[sfpPanelId] || {} : {};
    const sfpPortTotal = Number(sfpPanel?.port_count) || 0;
    const sfpRows = Math.max(1, Number(sfpPanel?.port_rows) || 1);
    const sfpFlow = sfpPanel?.port_flow === 'column' ? 'column' : 'row';
    const sfpPerRow = Math.ceil(sfpPortTotal / sfpRows) || 1;

    const selectedCableMedium = selectedCable ? getSelectedCableMedium(selectedCable) : '';
    const selectedCableAllowedMedia = selectedCable ? getAllowedMediaForSelectedCable(selectedCable) : [];

    return (
        <div className="card rack-card">
            <div className="rack-layout">
                <div className="rack-side-left">
                    <div className="card cable-panel">
                        <h4>Połączenia</h4>
                        {pendingPanelCable || pendingDeviceCable ? (
                            <p>Wybrany port: {getPendingLabel()}</p>
                        ) : selectedCable ? (
                            <p>
                                Połączenie: {getEndpointLabel(selectedCable.a)} ↔{' '}
                                {getEndpointLabel(selectedCable.b)}
                            </p>
                        ) : (
                            <p>Wybierz pierwszy port.</p>
                        )}
                        {(pendingDeviceCable || pendingPanelCable) && (
                            <button
                                className="secondary"
                                type="button"
                                onClick={() => {
                                    setPendingDeviceCable(null);
                                    setPendingPanelCable(null);
                                    setPendingCableMedium('');
                                    setPendingCableMediaOptions(['utp', 'singlemode', 'multimode']);
                                }}
                            >
                                Wyczyść wybór
                            </button>
                        )}
                        {(pendingDeviceCable || pendingPanelCable) && (
                            <label>
                                Medium kabla
                                <select
                                    value={pendingCableMedium || ''}
                                    onChange={(e) => setPendingCableMedium(e.target.value)}
                                >
                                    <option value="" disabled>
                                        Wybierz medium
                                    </option>
                                    {pendingCableMediaOptions.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {getMediumLabel(opt)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {selectedCable && !(pendingDeviceCable || pendingPanelCable) && (
                            <label>
                                Medium połączenia
                                <select
                                    value={
                                        selectedCableAllowedMedia.includes(selectedCableMedium)
                                            ? selectedCableMedium
                                            : selectedCableAllowedMedia[0] || ''
                                    }
                                    onChange={(e) => updateSelectedCableMedium(e.target.value)}
                                    disabled={!selectedCableAllowedMedia.length || selectedCableAllowedMedia.length === 1}
                                >
                                    {selectedCableAllowedMedia.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {getMediumLabel(opt)}
                                        </option>
                                    ))}
                                </select>
                                {!selectedCableAllowedMedia.length && (
                                    <p className="error">Brak zgodnych mediów dla tego połączenia.</p>
                                )}
                            </label>
                        )}
                        {selectedCable && !(pendingDeviceCable || pendingPanelCable) && (
                            <div className="actions">
                                <button
                                    className="danger"
                                    type="button"
                                    onClick={removeSelectedCable}
                                >
                                    Usuń połączenie
                                </button>
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={() => setSelectedCable(null)}
                                >
                                    Wyczyść podświetlenie
                                </button>
                            </div>
                        )}
                    </div>
                    {showForm && (form.type === 'device' || form.type === 'server') && editingId && (
                        <div className="device-preview">
                            <h4>Podgląd gniazd</h4>
                            {devicePanels[editingId]?.length ? (
                                <div className="device-preview-list">
                                    {(() => {
                                        const tree = buildDevicePanelTree(devicePanels[editingId] || []);
                                        const withPath = (nodes, prefix = '') =>
                                            nodes.flatMap((node) => {
                                                const currentPath = prefix ? `${prefix} / ${node.name}` : node.name;
                                                const entry = { ...node, path: currentPath };
                                                if (node.children?.length) {
                                                    return [entry, ...withPath(node.children, currentPath)];
                                                }
                                                return [entry];
                                            });
                                        return withPath(tree).map((panel) => (
                                            <div
                                                key={panel.id}
                                                className={`device-preview-row depth-${panel.depth}`}
                                            >
                                                <span className="device-preview-name">
                                                    {panel.path}
                                                </span>
                                                {(panel.port_count ?? 0) > 0 ? (
                                                    (() => {
                                                        const total = Number(panel.port_count) || 0;
                                                        const rows = Math.max(1, Number(panel.port_rows) || 1);
                                                        const perRow = Math.ceil(total / rows) || 1;
                                                        const flow = panel.port_flow === 'column' ? 'column' : 'row';
                                                        return (
                                                            <span
                                                                className="device-preview-ports"
                                                                style={{
                                                                    gridTemplateColumns:
                                                                        flow === 'row'
                                                                            ? `repeat(${perRow}, 8px)`
                                                                            : `repeat(${perRow}, 8px)`,
                                                                    gridTemplateRows:
                                                                        flow === 'row'
                                                                            ? `repeat(${rows}, 8px)`
                                                                            : `repeat(${rows}, 8px)`,
                                                                    gridAutoFlow: flow === 'row' ? 'row' : 'column'
                                                                }}
                                                            >
                                                                {Array.from({ length: total }, (_, idx) => idx + 1).map(
                                                                    (port) => (
                                                                        <span
                                                                            key={port}
                                                                            className={`rack-port${devicePanelPortTargets[panel.id]?.[port] || devicePanelConnections[panel.id]?.[port] ? ' rack-port-connected' : ''}${pendingDeviceCable && pendingDeviceCable.panelId === panel.id && pendingDeviceCable.port === port ? ' rack-port-pending' : ''}${isSelectedEndpoint('device', panel.id, port) ? ' rack-port-selected' : ''}`}
                                                                            aria-label={`Gniazdo ${port}`}
                                                                            title={`${panel.path} / ${port}`}
                                                                            role="button"
                                                                            tabIndex={0}
                                                                            onClick={() => handleDevicePortClick(panel, port)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                                    e.preventDefault();
                                                                                    handleDevicePortClick(panel, port);
                                                                                }
                                                                            }}
                                                                        />
                                                                    )
                                                                )}
                                                            </span>
                                                        );
                                                    })()
                                                ) : null}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            ) : (
                                <p className="rack-hint">Brak paneli w urządzeniu.</p>
                            )}
                        </div>
                    )}
                </div>
                <div className="rack-preview-area">
                    <div className="rack-preview">
                        {units.map((u) => {
                            const item = itemByUnit.get(u);
                            const isTop = item && topUnitForItem.get(item.id) === u;
                            const typeClass = item?.type === 'router' ? 'server' : item?.type;
                            return (
                                <div
                                    key={u}
                                    className={`rack-unit ${item ? `rack-unit-${typeClass}` : ''} ${item && !isTop ? 'rack-unit-continuation' : ''
                                        }`}
                                >
                                    <span>{u}U</span>
                                    {isTop && (
                                        <span className="rack-item-label">
                                            <span className="rack-item-name">
                                                {item.name} ({item.height_u}U)
                                            </span>
                                            {item.type === 'panel' && item.port_count ? (
                                                <span
                                                    className="rack-item-ports rack-item-ports-grid"
                                                    style={(() => {
                                                        const layout = panelLayouts[item.id] || { rows: 1, flow: 'row' };
                                                        const rows = Math.max(1, Number(layout.rows) || 1);
                                                        const total = Number(item.port_count) || 0;
                                                        const perRow = Math.ceil(total / rows) || 1;
                                                        const flow = layout.flow === 'column' ? 'column' : 'row';
                                                        return {
                                                            gridTemplateColumns:
                                                                flow === 'row'
                                                                    ? `repeat(${perRow}, 6px)`
                                                                    : `repeat(${perRow}, 6px)`,
                                                            gridTemplateRows:
                                                                flow === 'row'
                                                                    ? `repeat(${rows}, 6px)`
                                                                    : `repeat(${rows}, 6px)`,
                                                            gridAutoFlow: flow === 'row' ? 'row' : 'column'
                                                        };
                                                    })()}
                                                >
                                                    {Array.from(
                                                        { length: item.port_count },
                                                        (_, idx) => idx + 1
                                                    ).map((port) => {
                                                        const target = panelPortTargets[item.id]?.[port];
                                                        const nextTarget = panelPortTargets[item.id]?.[port + 1];
                                                        const targetKey = target?.panelId || '';
                                                        const nextKey = nextTarget?.panelId || '';
                                                        const addGap =
                                                            port < item.port_count && targetKey !== nextKey;
                                                        return (
                                                            <span
                                                                key={port}
                                                                className={`rack-port ${target?.panelId ? ' rack-port-target' : ''}${panelConnections[item.id]?.[port] ? ' rack-port-connected' : ''}${pendingPanelCable && pendingPanelCable.panelId === item.id && pendingPanelCable.port === port ? ' rack-port-pending' : ''}${isSelectedEndpoint('panel', item.id, port) ? ' rack-port-selected' : ''}`}
                                                                aria-label={`Port ${port}`}
                                                                title={`U${u} Gniazdo ${port}\n${buildPortTitle(target, port)}`}
                                                                style={addGap ? { marginRight: 6 } : undefined}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => handlePanelPortClick(item, port)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        handlePanelPortClick(item, port);
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </span>
                                            ) : null}
                                        </span>
                                    )}
                                    {(!item || isTop) && (
                                        <button
                                            className="secondary rack-unit-action"
                                            type="button"
                                            onClick={() => (item ? startEdit(item) : startCreate(u))}
                                        >
                                            {item ? 'Edytuj' : 'Dodaj'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="rack-side">
                    {error && <p className="error">{error}</p>}
                    {loading && <p>Ładowanie...</p>}
                    <div className="rack-hint">
                        Wybrane urządzenia/serwery: {Object.keys(selectedInfrastructureItems || {}).length}
                    </div>
                    {!showForm && (
                        <div className="rack-hint">
                            Kliknij U w szafie, aby dodać element.
                        </div>
                    )}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="rack-form">
                            <label>
                                Nazwa
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </label>
                            <label>
                                Typ
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                                >
                                    <option value="panel">Panel</option>
                                    <option value="device">Urządzenie</option>
                                    <option value="server">Serwer</option>
                                </select>
                            </label>
                            {(form.type === 'device' || form.type === 'server') && (
                                <label>
                                    IPv4
                                    <input
                                        value={form.ipv4}
                                        onChange={(e) => setForm({ ...form, ipv4: e.target.value })}
                                        placeholder="np. 192.168.1.10"
                                    />
                                </label>
                            )}
                            {(form.type === 'device' || form.type === 'server') && (
                                <label>
                                    Hostname
                                    <input
                                        value={form.hostname}
                                        onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                                    />
                                </label>
                            )}
                            {(form.type === 'device' || form.type === 'server') && (
                                <label>
                                    Osoba odpowiedzialna
                                    <input
                                        value={form.owner}
                                        onChange={(e) => setForm({ ...form, owner: e.target.value })}
                                    />
                                </label>
                            )}
                            {(form.type === 'device' || form.type === 'server') && (
                                <label>
                                    Numer seryjny
                                    <input
                                        value={form.serial}
                                        onChange={(e) => setForm({ ...form, serial: e.target.value })}
                                    />
                                </label>
                            )}
                            {form.type === 'panel' && (
                                <label>
                                    Liczba gniazd
                                    <input
                                        type="number"
                                        min={1}
                                        value={form.portCount}
                                        onChange={(e) =>
                                            setForm({ ...form, portCount: e.target.value })
                                        }
                                        required
                                    />
                                </label>
                            )}
                            <label>
                                Start U
                                <input
                                    type="number"
                                    min={1}
                                    max={height}
                                    value={form.startU}
                                    onChange={(e) => setForm({ ...form, startU: e.target.value })}
                                    required
                                />
                            </label>
                            <label>
                                Wysokość (U)
                                <input
                                    type="number"
                                    min={1}
                                    max={height}
                                    value={form.heightU}
                                    onChange={(e) => setForm({ ...form, heightU: e.target.value })}
                                    required
                                />
                            </label>
                            <div className="actions">
                                {editingId && (
                                    <button
                                        className="danger"
                                        type="button"
                                        onClick={() => handleDelete(editingId)}
                                    >
                                        Usuń
                                    </button>
                                )}
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                >
                                    Zamknij
                                </button>
                                {editingId && form.type === 'panel' && (() => {
                                    const currentItem = itemById.get(editingId);
                                    if (!currentItem) return null;
                                    const isSelected = !!selectedPanelItems?.[currentItem.id];
                                    return (
                                        <button
                                            className="secondary"
                                            type="button"
                                            onClick={() => togglePanelSelection(currentItem)}
                                        >
                                            {isSelected ? 'Usuń panel z wybranych' : 'Dodaj panel do wybranych'}
                                        </button>
                                    );
                                })()}
                                {editingId && (form.type === 'device' || form.type === 'server') && (() => {
                                    const currentItem = itemById.get(editingId);
                                    if (!currentItem) return null;
                                    const isSelected = !!selectedInfrastructureItems?.[currentItem.id];
                                    return (
                                        <button
                                            className="secondary"
                                            type="button"
                                            onClick={() => toggleInfrastructureSelection(currentItem)}
                                        >
                                            {isSelected ? 'Usuń z wybranych' : 'Dodaj do wybranych'}
                                        </button>
                                    );
                                })()}
                                {editingId && form.type === 'panel' && (
                                    <button
                                        className="secondary"
                                        type="button"
                                        onClick={async () => {
                                            setPanelModalOpen(true);
                                            setPanelError('');
                                            const panelsData = await apiRequest('/api/panels', { token });
                                            setPanels(panelsData.filter((p) => p.id !== editingId));
                                            const targetPanels = panelsData.filter((p) => p.id !== editingId);
                                            if (targetPanels.length > 0) {
                                                const targets = await Promise.all(
                                                    targetPanels.map((p) =>
                                                        apiRequest(`/api/panels/${p.id}/ports`, { token })
                                                            .then((portsData) => ({ id: String(p.id), ...portsData }))
                                                            .catch(() => ({ id: String(p.id), portCount: p.port_count || 0, ports: [] }))
                                                    )
                                                );
                                                const targetMap = {};
                                                targets.forEach((t) => {
                                                    targetMap[t.id] = { portCount: t.portCount || 0, ports: t.ports || [] };
                                                });
                                                setPanelTargetPorts(targetMap);
                                            } else {
                                                setPanelTargetPorts({});
                                            }
                                            const portsData = await apiRequest(`/api/panels/${editingId}/ports`, { token });
                                            setPanelRanges(
                                                buildRangesFromPorts(portsData.ports || [], portsData.portCount || 1)
                                            );
                                            setPanelRows(portsData.portRows || 1);
                                            setPanelFlow(portsData.portFlow === 'column' ? 'column' : 'row');
                                            setForm((prev) => ({
                                                ...prev,
                                                portCount: portsData.portCount || prev.portCount
                                            }));
                                        }}
                                    >
                                        Konfiguruj gniazda
                                    </button>
                                )}
                                {editingId && (form.type === 'device' || form.type === 'server') && (
                                    <button
                                        className="secondary"
                                        type="button"
                                        onClick={() => openDevicePanelModal(editingId)}
                                    >
                                        Konfiguruj panele
                                    </button>
                                )}
                                {editingId && form.type === 'server' && (
                                    <button
                                        className="secondary"
                                        type="button"
                                        onClick={() => openServerDisksModal(editingId)}
                                    >
                                        Zarządzaj dyskami
                                    </button>
                                )}
                                <button className="primary" type="submit" disabled={loading}>
                                    Zapisz
                                </button>
                            </div>
                            <div className="template-actions">
                                <label>
                                    Szablon
                                    <select
                                        value={templateId}
                                        onChange={(e) => setTemplateId(e.target.value)}
                                    >
                                        <option value="">(brak)</option>
                                        {templates
                                            .filter((t) => t.type === form.type)
                                            .map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                    </select>
                                </label>
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={() => {
                                        const selected = templates.find((t) => String(t.id) === String(templateId));
                                        if (!selected) return;
                                        const payload = selected.payload || {};
                                        setForm((prev) => ({
                                            ...prev,
                                            type: selected.type,
                                            name: payload.name || prev.name,
                                            heightU: payload.heightU || prev.heightU,
                                            portCount: payload.portCount ?? prev.portCount
                                        }));
                                        if (selected.type === 'panel') {
                                            setPendingPanelLayout({
                                                portRows: payload.portRows || 1,
                                                portFlow: payload.portFlow === 'column' ? 'column' : 'row'
                                            });
                                        }
                                        if (selected.type === 'device' || selected.type === 'server') {
                                            setPendingDevicePanels(payload.devicePanels || []);
                                        }
                                    }}
                                >
                                    Zastosuj
                                </button>
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={() => {
                                        setTemplateEditError('');
                                        setTemplateModalOpen(true);
                                    }}
                                >
                                    Zarządzaj
                                </button>
                            </div>
                            <div className="template-actions">
                                <label>
                                    Nazwa szablonu
                                    <input
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="np. Switch 24x"
                                    />
                                </label>
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            if (!templateName.trim()) {
                                                setError('Podaj nazwę szablonu');
                                                return;
                                            }
                                            const payload = {
                                                name: form.name,
                                                heightU: Number(form.heightU),
                                                portCount: form.type === 'panel' ? Number(form.portCount) : null,
                                                portRows: panelLayouts[editingId]?.rows || 1,
                                                portFlow: panelLayouts[editingId]?.flow || 'row',
                                                devicePanels: (editingId && (form.type === 'device' || form.type === 'server'))
                                                    ? (devicePanels[editingId] || []).map((p, idx) => ({
                                                        tempId: p.id || `tmp-${idx}`,
                                                        parentTempId: p.parent_panel_id || null,
                                                        name: p.name,
                                                        portCount: p.port_count,
                                                        portRows: p.port_rows || 1,
                                                        portFlow: p.port_flow || 'row'
                                                    }))
                                                    : []
                                            };
                                            const created = await apiRequest('/api/templates', {
                                                method: 'POST',
                                                body: {
                                                    name: templateName.trim(),
                                                    type: form.type,
                                                    payload
                                                },
                                                token
                                            });
                                            setTemplates((prev) => [...prev, created]);
                                            setTemplateName('');
                                        } catch (err) {
                                            setError(err.message);
                                        }
                                    }}
                                >
                                    Zapisz jako szablon
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            {linkModePrompt && (
                <div className="modal-backdrop" onClick={() => setLinkModePrompt(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Połączenie między szafami</h3>
                        <p>Wybrano dwa gniazda w różnych szafach.</p>
                        <p><strong>Start:</strong> {linkModePrompt.source?.label || '-'}</p>
                        <p><strong>Koniec:</strong> {linkModePrompt.target?.label || '-'}</p>
                        <div className="actions">
                            <button className="secondary" type="button" onClick={() => setLinkModePrompt(null)}>
                                Anuluj
                            </button>
                            <button className="secondary" type="button" onClick={handleLinkModeDirect}>
                                Połącz jak wcześniej
                            </button>
                            <button className="primary" type="button" onClick={handleLinkModeRouteProposal}>
                                Tryb proponowania tras
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {routeProposalOpen && (
                <div className="modal-backdrop" onClick={() => setRouteProposalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Propozycja tras (Dijkstra / Bidirectional BFS)</h3>
                        {routeProposalLoading && <p>Wyznaczanie trasy...</p>}
                        {routeProposalError && <p className="error">{routeProposalError}</p>}
                        {!routeProposalLoading && routeProposalError && routeProposalDebug.length > 0 && (
                            <>
                                <p>Szczegóły diagnostyczne:</p>
                                <ul className="route-proposal-list">
                                    {routeProposalDebug.map((entry, index) => (
                                        <li key={`route-debug-${index}`}>{entry}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {!routeProposalLoading && !routeProposalError && routeProposalResults.length === 0 && (
                            <p>Brak propozycji trasy.</p>
                        )}
                        {!routeProposalLoading && routeProposalResults.length > 0 && (
                            <div>
                                {routeProposalResults.map((entry, index) => (
                                    <div key={`route-result-${index}`}>
                                        <p><strong>{entry.algorithm}</strong> ({entry.durationNs} ns)</p>
                                        {entry.error ? (
                                            <p className="error">{entry.error}</p>
                                        ) : (
                                            <ol className="route-proposal-list">
                                                <li>{entry.step}</li>
                                            </ol>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="actions">
                            <button className="secondary" type="button" onClick={() => setRouteProposalOpen(false)}>
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {panelModalOpen && editingId && (
                <div className="modal-backdrop" onClick={() => setPanelModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Konfiguracja panelu</h3>
                        <label>
                            Liczba gniazd
                            <input
                                type="number"
                                min={1}
                                value={form.portCount}
                                onChange={(e) =>
                                    setForm({ ...form, portCount: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Liczba wierszy w podglądzie
                            <input
                                type="number"
                                min={1}
                                value={panelRows}
                                onChange={(e) => setPanelRows(e.target.value)}
                            />
                        </label>
                        <label>
                            Układ gniazd
                            <select
                                value={panelFlow}
                                onChange={(e) => setPanelFlow(e.target.value)}
                            >
                                <option value="row">Wierszami</option>
                                <option value="column">Kolumnami</option>
                            </select>
                        </label>
                        <div className="panel-legend">
                            <span>Legenda:</span>
                            <span>Start</span>
                            <span>Koniec</span>
                            <span>Panel docelowy</span>
                            <span>Start portu</span>
                            <span>Medium</span>
                            <span>(brak) = bez połączenia</span>
                        </div>
                        <div className="panel-links">
                            {panelRanges.map((range, idx) => (
                                <div key={idx} className="panel-link-row group-row">
                                    <input
                                        type="number"
                                        min={1}
                                        max={Math.max(1, Number(form.portCount) || 1)}
                                        value={range.start}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPanelRanges((prev) =>
                                                prev.map((r, i) =>
                                                    i === idx
                                                        ? normalizeRange({ ...r, start: val }, idx, prev, form.portCount)
                                                        : r
                                                )
                                            );
                                        }}
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        max={Math.max(1, Number(form.portCount) || 1)}
                                        value={range.end}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPanelRanges((prev) =>
                                                prev.map((r, i) =>
                                                    i === idx
                                                        ? normalizeRange({ ...r, end: val }, idx, prev, form.portCount)
                                                        : r
                                                )
                                            );
                                        }}
                                    />
                                    <select
                                        value={range.targetPanelId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPanelRanges((prev) =>
                                                prev.map((r, i) =>
                                                    i === idx
                                                        ? normalizeRange({ ...r, targetPanelId: val }, idx, prev, form.portCount)
                                                        : r
                                                )
                                            );
                                        }}
                                    >
                                        <option value="">(brak)</option>
                                        {sortedPanels.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {buildPanelOptionLabel(p)}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min={1}
                                        max={
                                            range.targetPanelId
                                                ? Math.max(
                                                    1,
                                                    Number(
                                                        panelTargetPorts[String(range.targetPanelId)]?.portCount ||
                                                        panels.find((p) => String(p.id) === String(range.targetPanelId))
                                                            ?.port_count
                                                    ) || 1
                                                )
                                                : undefined
                                        }
                                        value={range.targetStart}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPanelRanges((prev) =>
                                                prev.map((r, i) =>
                                                    i === idx
                                                        ? normalizeRange({ ...r, targetStart: val }, idx, prev, form.portCount)
                                                        : r
                                                )
                                            );
                                        }}
                                    />
                                    <select
                                        value={range.medium || 'utp'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPanelRanges((prev) =>
                                                prev.map((r, i) =>
                                                    i === idx ? { ...r, medium: val } : r
                                                )
                                            );
                                        }}
                                    >
                                        <option value="utp">UTP</option>
                                        <option value="singlemode">Światłowód jednomodowy</option>
                                        <option value="multimode">Światłowód wielomodowy</option>
                                    </select>
                                    <button
                                        className="secondary"
                                        type="button"
                                        onClick={() => setPanelRanges((prev) => prev.filter((_, i) => i !== idx))}
                                    >
                                        Usuń
                                    </button>
                                </div>
                            ))}
                            <button
                                className="secondary"
                                type="button"
                                onClick={() =>
                                    setPanelRanges((prev) => [
                                        ...prev,
                                        { start: 1, end: 1, targetPanelId: '', targetStart: 1, medium: 'utp' }
                                    ])
                                }
                            >
                                Dodaj zakres
                            </button>
                        </div>
                        {panelError && <p className="error">{panelError}</p>}
                        <div className="actions">
                            <button className="secondary" onClick={() => setPanelModalOpen(false)}>
                                Zamknij
                            </button>
                            <button
                                className="primary"
                                onClick={async () => {
                                    try {
                                        setPanelError('');
                                        await apiRequest(`/api/panels/${editingId}/ports`, {
                                            method: 'PUT',
                                            body: {
                                                portCount: Number(form.portCount),
                                                portRows: Number(panelRows) || 1,
                                                portFlow: panelFlow === 'column' ? 'column' : 'row',
                                                mode: 'group',
                                                ranges: panelRanges.map((r) => ({
                                                    start: Number(r.start),
                                                    end: Number(r.end),
                                                    targetPanelId: r.targetPanelId ? Number(r.targetPanelId) : null,
                                                    targetStart: Number(r.targetStart),
                                                    medium: r.medium || 'utp'
                                                })),
                                                links: []
                                            },
                                            token
                                        });
                                        setPanelModalOpen(false);
                                        await reload();
                                    } catch (err) {
                                        setPanelError(err.message);
                                    }
                                }}
                            >
                                Zapisz
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {devicePanelModalOpen && devicePanelItemId && (
                <div className="modal-backdrop" onClick={() => setDevicePanelModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Panele w urządzeniu</h3>
                        {devicePanelError && <p className="error">{devicePanelError}</p>}
                        <div className="device-panel-list">
                            {flattenDevicePanelTree(buildDevicePanelTree(devicePanelList)).map((panel) => (
                                <div
                                    key={panel.id}
                                    className={`device-panel-row depth-${panel.depth}`}
                                >
                                    <div>
                                        <strong>{panel.name}</strong>
                                        {panel.port_count !== null && panel.port_count !== undefined ? (
                                            <span className="user-meta">
                                                {panel.port_count} gniazd
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="location-actions">
                                        <button
                                            className="secondary"
                                            type="button"
                                            onClick={() => openSfpModal(panel.id)}
                                        >
                                            SFP
                                        </button>
                                        <button
                                            className="secondary"
                                            type="button"
                                            onClick={() => {
                                                setDevicePanelEditingId(null);
                                                setDevicePanelForm({
                                                    name: '',
                                                    portCount: 24,
                                                    portRows: 1,
                                                    portFlow: 'row',
                                                    parentPanelId: panel.id
                                                });
                                            }}
                                        >
                                            Dodaj podrzędny
                                        </button>
                                        <button
                                            className="secondary"
                                            type="button"
                                            onClick={() => {
                                                setDevicePanelEditingId(panel.id);
                                                setDevicePanelForm({
                                                    name: panel.name,
                                                    portCount:
                                                        panel.port_count === null || panel.port_count === undefined
                                                            ? ''
                                                            : panel.port_count,
                                                    portRows: panel.port_rows || 1,
                                                    portFlow: panel.port_flow === 'column' ? 'column' : 'row',
                                                    parentPanelId: panel.parent_panel_id || null
                                                });
                                            }}
                                        >
                                            Edytuj
                                        </button>
                                        <button
                                            className="danger"
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    setDevicePanelError('');
                                                    await apiRequest(`/api/device-panels/${panel.id}`, {
                                                        method: 'DELETE',
                                                        token
                                                    });
                                                    await refreshDevicePanels(devicePanelItemId);
                                                } catch (err) {
                                                    setDevicePanelError(err.message);
                                                }
                                            }}
                                        >
                                            Usuń
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="device-panel-form">
                            <h4>
                                {devicePanelEditingId
                                    ? 'Edytuj panel'
                                    : devicePanelForm.parentPanelId
                                        ? 'Dodaj panel podrzędny'
                                        : 'Dodaj panel'}
                            </h4>
                            <label>
                                Nazwa
                                <input
                                    value={devicePanelForm.name}
                                    onChange={(e) =>
                                        setDevicePanelForm((prev) => ({
                                            ...prev,
                                            name: e.target.value
                                        }))
                                    }
                                />
                            </label>
                            <label>
                                Liczba gniazd
                                <input
                                    type="number"
                                    min={0}
                                    value={devicePanelForm.portCount}
                                    onChange={(e) =>
                                        setDevicePanelForm((prev) => ({
                                            ...prev,
                                            portCount: e.target.value
                                        }))
                                    }
                                />
                            </label>
                            <label>
                                Liczba wierszy w podglądzie
                                <input
                                    type="number"
                                    min={1}
                                    value={devicePanelForm.portRows}
                                    onChange={(e) =>
                                        setDevicePanelForm((prev) => ({
                                            ...prev,
                                            portRows: e.target.value
                                        }))
                                    }
                                />
                            </label>
                            <label>
                                Układ gniazd
                                <select
                                    value={devicePanelForm.portFlow}
                                    onChange={(e) =>
                                        setDevicePanelForm((prev) => ({
                                            ...prev,
                                            portFlow: e.target.value
                                        }))
                                    }
                                >
                                    <option value="row">Wierszami</option>
                                    <option value="column">Kolumnami</option>
                                </select>
                            </label>
                            <div className="actions">
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={() => {
                                        setDevicePanelEditingId(null);
                                        setDevicePanelForm({ name: '', portCount: 24, portRows: 1, portFlow: 'row', parentPanelId: null });
                                    }}
                                >
                                    Wyczyść
                                </button>
                                <button
                                    className="primary"
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            setDevicePanelError('');
                                            const portValue =
                                                devicePanelForm.portCount === ''
                                                    ? null
                                                    : Number(devicePanelForm.portCount);
                                            const rowsValue = Math.max(1, Number(devicePanelForm.portRows) || 1);
                                            const flowValue = devicePanelForm.portFlow === 'column' ? 'column' : 'row';
                                            if (devicePanelEditingId) {
                                                await apiRequest(`/api/device-panels/${devicePanelEditingId}`, {
                                                    method: 'PUT',
                                                    body: {
                                                        name: devicePanelForm.name,
                                                        portCount: portValue,
                                                        portRows: rowsValue,
                                                        portFlow: flowValue
                                                    },
                                                    token
                                                });
                                            } else if (devicePanelForm.parentPanelId) {
                                                await apiRequest(
                                                    `/api/device-panels/${devicePanelForm.parentPanelId}/children`,
                                                    {
                                                        method: 'POST',
                                                        body: {
                                                            name: devicePanelForm.name,
                                                            portCount: portValue,
                                                            portRows: rowsValue,
                                                            portFlow: flowValue
                                                        },
                                                        token
                                                    }
                                                );
                                            } else {
                                                await apiRequest(`/api/devices/${devicePanelItemId}/panels`, {
                                                    method: 'POST',
                                                    body: {
                                                        name: devicePanelForm.name,
                                                        portCount: portValue,
                                                        portRows: rowsValue,
                                                        portFlow: flowValue
                                                    },
                                                    token
                                                });
                                            }
                                            await refreshDevicePanels(devicePanelItemId);
                                            setDevicePanelEditingId(null);
                                            setDevicePanelForm({ name: '', portCount: 24, portRows: 1, portFlow: 'row', parentPanelId: null });
                                        } catch (err) {
                                            setDevicePanelError(err.message);
                                        }
                                    }}
                                >
                                    Zapisz
                                </button>
                            </div>
                        </div>
                        <div className="actions">
                            <button
                                className="secondary"
                                type="button"
                                onClick={() => setDevicePanelModalOpen(false)}
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {serverDisksModalOpen && serverDiskItemId && (
                <div className="modal-backdrop" onClick={() => setServerDisksModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Dyski w serwerze</h3>
                        {serverDiskError && <p className="error">{serverDiskError}</p>}
                        <div className="server-disk-list">
                            {serverDiskList.length === 0 && <p>Brak dysków.</p>}
                            {serverDiskList.map((disk) => (
                                <div key={disk.id} className="server-disk-row">
                                    <div>
                                        <strong>{disk.name}</strong>
                                        <span className="user-meta">
                                            {disk.size_value ? `${disk.size_value} ${disk.size_unit || ''}` : 'Brak rozmiaru'}
                                        </span>
                                        {disk.owner && <span className="user-meta">Właściciel: {disk.owner}</span>}
                                    </div>
                                    <div className="location-actions">
                                        <button
                                            className="secondary"
                                            type="button"
                                            onClick={() => {
                                                setServerDiskEditingId(disk.id);
                                                setServerDiskForm({
                                                    name: disk.name || '',
                                                    owner: disk.owner || '',
                                                    sizeValue: disk.size_value ?? '',
                                                    sizeUnit: (disk.size_unit || 'GB').toUpperCase(),
                                                    clause: disk.clause || '',
                                                    serial: disk.serial || '',
                                                    assetNo: disk.asset_no || ''
                                                });
                                            }}
                                        >
                                            Edytuj
                                        </button>
                                        <button
                                            className="danger"
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    setServerDiskError('');
                                                    await apiRequest(`/api/servers/${serverDiskItemId}/disks/${disk.id}`, {
                                                        method: 'DELETE',
                                                        token
                                                    });
                                                    await refreshServerDisks(serverDiskItemId);
                                                } catch (err) {
                                                    setServerDiskError(err.message);
                                                }
                                            }}
                                        >
                                            Usuń
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="server-disk-form">
                            <h4>{serverDiskEditingId ? 'Edytuj dysk' : 'Dodaj dysk'}</h4>
                            <label>
                                Nazwa
                                <input
                                    value={serverDiskForm.name}
                                    onChange={(e) =>
                                        setServerDiskForm((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                />
                            </label>
                            <label>
                                Właściciel
                                <input
                                    value={serverDiskForm.owner}
                                    onChange={(e) =>
                                        setServerDiskForm((prev) => ({ ...prev, owner: e.target.value }))
                                    }
                                />
                            </label>
                            <label>
                                Rozmiar
                                <div className="server-disk-size">
                                    <input
                                        type="number"
                                        min={0}
                                        value={serverDiskForm.sizeValue}
                                        onChange={(e) =>
                                            setServerDiskForm((prev) => ({ ...prev, sizeValue: e.target.value }))
                                        }
                                    />
                                    <select
                                        value={serverDiskForm.sizeUnit}
                                        onChange={(e) =>
                                            setServerDiskForm((prev) => ({ ...prev, sizeUnit: e.target.value }))
                                        }
                                    >
                                        <option value="GB">GB</option>
                                        <option value="TB">TB</option>
                                    </select>
                                </div>
                            </label>
                            <label>
                                Klauzula
                                <input
                                    value={serverDiskForm.clause}
                                    onChange={(e) =>
                                        setServerDiskForm((prev) => ({ ...prev, clause: e.target.value }))
                                    }
                                />
                            </label>
                            <label>
                                Numer seryjny
                                <input
                                    value={serverDiskForm.serial}
                                    onChange={(e) =>
                                        setServerDiskForm((prev) => ({ ...prev, serial: e.target.value }))
                                    }
                                />
                            </label>
                            <label>
                                Numer ewidencyjny
                                <input
                                    value={serverDiskForm.assetNo}
                                    onChange={(e) =>
                                        setServerDiskForm((prev) => ({ ...prev, assetNo: e.target.value }))
                                    }
                                />
                            </label>
                            <div className="actions">
                                <button
                                    className="secondary"
                                    type="button"
                                    onClick={() => {
                                        setServerDiskEditingId(null);
                                        setServerDiskForm({
                                            name: '',
                                            owner: '',
                                            sizeValue: '',
                                            sizeUnit: 'GB',
                                            clause: '',
                                            serial: '',
                                            assetNo: ''
                                        });
                                    }}
                                >
                                    Wyczyść
                                </button>
                                <button
                                    className="primary"
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            setServerDiskError('');
                                            const payload = {
                                                name: serverDiskForm.name,
                                                owner: serverDiskForm.owner,
                                                sizeValue: serverDiskForm.sizeValue === '' ? null : Number(serverDiskForm.sizeValue),
                                                sizeUnit: serverDiskForm.sizeUnit,
                                                clause: serverDiskForm.clause,
                                                serial: serverDiskForm.serial,
                                                assetNo: serverDiskForm.assetNo
                                            };
                                            if (!payload.name.trim()) {
                                                setServerDiskError('Nazwa jest wymagana.');
                                                return;
                                            }
                                            if (serverDiskEditingId) {
                                                await apiRequest(`/api/servers/${serverDiskItemId}/disks/${serverDiskEditingId}`, {
                                                    method: 'PUT',
                                                    body: payload,
                                                    token
                                                });
                                            } else {
                                                await apiRequest(`/api/servers/${serverDiskItemId}/disks`, {
                                                    method: 'POST',
                                                    body: payload,
                                                    token
                                                });
                                            }
                                            await refreshServerDisks(serverDiskItemId);
                                            setServerDiskEditingId(null);
                                            setServerDiskForm({
                                                name: '',
                                                owner: '',
                                                sizeValue: '',
                                                sizeUnit: 'GB',
                                                clause: '',
                                                serial: '',
                                                assetNo: ''
                                            });
                                        } catch (err) {
                                            setServerDiskError(err.message);
                                        }
                                    }}
                                >
                                    Zapisz
                                </button>
                            </div>
                        </div>
                        <div className="actions">
                            <button
                                className="secondary"
                                type="button"
                                onClick={() => setServerDisksModalOpen(false)}
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {sfpModalOpen && sfpPanelId && (
                <div className="modal-backdrop" onClick={() => setSfpModalOpen(false)}>
                    <div className="modal sfp-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Moduły SFP</h3>
                        {sfpPanel ? (
                            <p className="helper">Panel: {getDevicePanelNameLabel(sfpPanelId)}</p>
                        ) : null}
                        {sfpError && <p className="error">{sfpError}</p>}
                        {sfpPortTotal > 0 ? (
                            <div className="sfp-layout">
                                <div
                                    className="sfp-ports"
                                    style={{
                                        gridTemplateColumns:
                                            sfpFlow === 'row'
                                                ? `repeat(${sfpPerRow}, 12px)`
                                                : `repeat(${sfpPerRow}, 12px)`,
                                        gridTemplateRows:
                                            sfpFlow === 'row'
                                                ? `repeat(${sfpRows}, 12px)`
                                                : `repeat(${sfpRows}, 12px)`,
                                        gridAutoFlow: sfpFlow === 'row' ? 'row' : 'column'
                                    }}
                                >
                                    {Array.from({ length: sfpPortTotal }, (_, idx) => idx + 1).map((port) => {
                                        const assigned = sfpPortMap[port];
                                        return (
                                            <button
                                                key={port}
                                                type="button"
                                                className={`rack-port sfp-port${assigned ? ' sfp-port-assigned' : ''}${sfpPortNumber === port ? ' sfp-port-selected' : ''}`}
                                                title={`${port}${assigned?.sfpTypeName ? ` • ${assigned.sfpTypeName}` : ''}`}
                                                onClick={() => {
                                                    setSfpPortNumber(port);
                                                    setSfpForm({
                                                        sfpTypeId: assigned?.sfpTypeId ? String(assigned.sfpTypeId) : '',
                                                        owner: assigned?.owner || '',
                                                        serial: assigned?.serial || '',
                                                        newType: ''
                                                    });
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="sfp-form">
                                    <h4>Konfiguracja gniazda</h4>
                                    <p>
                                        Gniazdo:{' '}
                                        {sfpPortNumber
                                            ? getDevicePanelPortLabel(sfpPanelId, sfpPortNumber)
                                            : '-'}
                                    </p>
                                    <label>
                                        Typ SFP
                                        <select
                                            value={sfpForm.sfpTypeId}
                                            onChange={(e) =>
                                                setSfpForm((prev) => ({
                                                    ...prev,
                                                    sfpTypeId: e.target.value
                                                }))
                                            }
                                        >
                                            <option value="">(brak)</option>
                                            {sfpTypes.map((type) => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Właściciel
                                        <input
                                            value={sfpForm.owner}
                                            onChange={(e) =>
                                                setSfpForm((prev) => ({ ...prev, owner: e.target.value }))
                                            }
                                        />
                                    </label>
                                    <label>
                                        Numer seryjny
                                        <input
                                            value={sfpForm.serial}
                                            onChange={(e) =>
                                                setSfpForm((prev) => ({ ...prev, serial: e.target.value }))
                                            }
                                        />
                                    </label>
                                    <label>
                                        Dodaj nowy typ
                                        <div className="sfp-new-type">
                                            <input
                                                value={sfpForm.newType}
                                                onChange={(e) =>
                                                    setSfpForm((prev) => ({ ...prev, newType: e.target.value }))
                                                }
                                            />
                                            <button className="secondary" type="button" onClick={handleAddSfpType}>
                                                Dodaj
                                            </button>
                                        </div>
                                    </label>
                                    <div className="actions">
                                        <button className="secondary" type="button" onClick={clearSfpAssignment}>
                                            Wyczyść
                                        </button>
                                        <button className="primary" type="button" onClick={saveSfpAssignment}>
                                            Zapisz
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p>Panel nie ma gniazd.</p>
                        )}
                        <div className="actions">
                            <button className="secondary" type="button" onClick={() => setSfpModalOpen(false)}>
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {templateModalOpen && (
                <div className="modal-backdrop" onClick={() => setTemplateModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Szablony</h3>
                        {templateEditError && <p className="error">{templateEditError}</p>}
                        <div className="template-list">
                            {templates.length === 0 && <p>Brak szablonów.</p>}
                            {templates.map((tpl) => (
                                <div key={tpl.id} className="template-row">
                                    <div>
                                        <strong>{tpl.name}</strong>
                                        <span className="user-meta">{tpl.type}</span>
                                    </div>
                                    <div className="location-actions">
                                        <button
                                            className="secondary"
                                            type="button"
                                            onClick={() => {
                                                setTemplateEditing(tpl);
                                                setTemplateEditError('');
                                                const payload = tpl.payload || {};
                                                const panels = (payload.devicePanels || []).map((panel, idx) => ({
                                                    tempId: panel.tempId || `tmp-${Date.now()}-${idx}`,
                                                    parentTempId: panel.parentTempId || panel.parent_panel_id || null,
                                                    name: panel.name || '',
                                                    portCount: panel.portCount ?? panel.port_count ?? null,
                                                    portRows: panel.portRows || panel.port_rows || 1,
                                                    portFlow: panel.portFlow || panel.port_flow || 'row'
                                                }));
                                                setTemplateEditForm({
                                                    name: tpl.name,
                                                    heightU: payload.heightU ?? 1,
                                                    portCount: payload.portCount ?? '',
                                                    portRows: payload.portRows || 1,
                                                    portFlow: payload.portFlow === 'column' ? 'column' : 'row',
                                                    devicePanels: panels
                                                });
                                                setTemplateEditPanelEditingId(null);
                                                setTemplateEditPanelForm({
                                                    name: '',
                                                    portCount: 24,
                                                    portRows: 1,
                                                    portFlow: 'row',
                                                    parentTempId: ''
                                                });
                                            }}
                                        >
                                            Edytuj
                                        </button>
                                        <button
                                            className="danger"
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await apiRequest(`/api/templates/${tpl.id}`, {
                                                        method: 'DELETE',
                                                        token
                                                    });
                                                    setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
                                                    if (templateEditing?.id === tpl.id) {
                                                        setTemplateEditing(null);
                                                        setTemplateEditForm({
                                                            name: '',
                                                            heightU: 1,
                                                            portCount: '',
                                                            portRows: 1,
                                                            portFlow: 'row',
                                                            devicePanels: []
                                                        });
                                                        setTemplateEditPanelEditingId(null);
                                                        setTemplateEditPanelForm({
                                                            name: '',
                                                            portCount: 24,
                                                            portRows: 1,
                                                            portFlow: 'row',
                                                            parentTempId: ''
                                                        });
                                                    }
                                                } catch (err) {
                                                    setTemplateEditError(err.message);
                                                }
                                            }}
                                        >
                                            Usuń
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {templateEditing && (
                            <div className="template-edit">
                                <h4>Edytuj szablon</h4>
                                <label>
                                    Nazwa
                                    <input
                                        value={templateEditForm.name}
                                        onChange={(e) =>
                                            setTemplateEditForm((prev) => ({
                                                ...prev,
                                                name: e.target.value
                                            }))
                                        }
                                    />
                                </label>
                                <label>
                                    Wysokość U
                                    <input
                                        type="number"
                                        min={1}
                                        value={templateEditForm.heightU}
                                        onChange={(e) =>
                                            setTemplateEditForm((prev) => ({
                                                ...prev,
                                                heightU: e.target.value
                                            }))
                                        }
                                    />
                                </label>
                                {templateEditing.type === 'panel' && (
                                    <>
                                        <label>
                                            Liczba gniazd
                                            <input
                                                type="number"
                                                min={0}
                                                value={templateEditForm.portCount}
                                                onChange={(e) =>
                                                    setTemplateEditForm((prev) => ({
                                                        ...prev,
                                                        portCount: e.target.value
                                                    }))
                                                }
                                            />
                                        </label>
                                        <label>
                                            Liczba wierszy w podglądzie
                                            <input
                                                type="number"
                                                min={1}
                                                value={templateEditForm.portRows}
                                                onChange={(e) =>
                                                    setTemplateEditForm((prev) => ({
                                                        ...prev,
                                                        portRows: e.target.value
                                                    }))
                                                }
                                            />
                                        </label>
                                        <label>
                                            Układ gniazd
                                            <select
                                                value={templateEditForm.portFlow}
                                                onChange={(e) =>
                                                    setTemplateEditForm((prev) => ({
                                                        ...prev,
                                                        portFlow: e.target.value
                                                    }))
                                                }
                                            >
                                                <option value="row">Wierszami</option>
                                                <option value="column">Kolumnami</option>
                                            </select>
                                        </label>
                                    </>
                                )}
                                {(templateEditing.type === 'device' || templateEditing.type === 'server') && (
                                    <>
                                        <div className="device-panel-list">
                                            {templateEditForm.devicePanels.length === 0 && <p>Brak paneli.</p>}
                                            {templateEditForm.devicePanels.map((panel) => {
                                                const parent = panel.parentTempId
                                                    ? templateEditForm.devicePanels.find(
                                                        (p) => p.tempId === panel.parentTempId
                                                    )
                                                    : null;
                                                return (
                                                    <div key={panel.tempId} className="device-panel-row">
                                                        <div>
                                                            <strong>{panel.name || 'Bez nazwy'}</strong>
                                                            <span className="user-meta">
                                                                {panel.portCount ?? 0} gniazd
                                                            </span>
                                                            <span className="user-meta">
                                                                {panel.portRows || 1} wiersz
                                                            </span>
                                                            <span className="user-meta">
                                                                {panel.portFlow === 'column' ? 'Kolumny' : 'Wiersze'}
                                                            </span>
                                                            {parent && (
                                                                <span className="user-meta">Nadrzędny: {parent.name}</span>
                                                            )}
                                                        </div>
                                                        <div className="location-actions">
                                                            <button
                                                                className="secondary"
                                                                type="button"
                                                                onClick={() => {
                                                                    setTemplateEditPanelEditingId(panel.tempId);
                                                                    setTemplateEditPanelForm({
                                                                        name: panel.name,
                                                                        portCount:
                                                                            panel.portCount === null || panel.portCount === undefined
                                                                                ? ''
                                                                                : panel.portCount,
                                                                        portRows: panel.portRows || 1,
                                                                        portFlow: panel.portFlow === 'column' ? 'column' : 'row',
                                                                        parentTempId: panel.parentTempId || ''
                                                                    });
                                                                }}
                                                            >
                                                                Edytuj
                                                            </button>
                                                            <button
                                                                className="danger"
                                                                type="button"
                                                                onClick={() => {
                                                                    setTemplateEditForm((prev) => {
                                                                        const remaining = prev.devicePanels.filter(
                                                                            (p) => p.tempId !== panel.tempId
                                                                        );
                                                                        return {
                                                                            ...prev,
                                                                            devicePanels: remaining.map((p) =>
                                                                                p.parentTempId === panel.tempId
                                                                                    ? { ...p, parentTempId: null }
                                                                                    : p
                                                                            )
                                                                        };
                                                                    });
                                                                    if (templateEditPanelEditingId === panel.tempId) {
                                                                        setTemplateEditPanelEditingId(null);
                                                                        setTemplateEditPanelForm({
                                                                            name: '',
                                                                            portCount: 24,
                                                                            portRows: 1,
                                                                            portFlow: 'row',
                                                                            parentTempId: ''
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                Usuń
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="device-panel-form">
                                            <h4>
                                                {templateEditPanelEditingId
                                                    ? 'Edytuj panel'
                                                    : 'Dodaj panel'}
                                            </h4>
                                            <label>
                                                Nazwa
                                                <input
                                                    value={templateEditPanelForm.name}
                                                    onChange={(e) =>
                                                        setTemplateEditPanelForm((prev) => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))
                                                    }
                                                />
                                            </label>
                                            <label>
                                                Liczba gniazd
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={templateEditPanelForm.portCount}
                                                    onChange={(e) =>
                                                        setTemplateEditPanelForm((prev) => ({
                                                            ...prev,
                                                            portCount: e.target.value
                                                        }))
                                                    }
                                                />
                                            </label>
                                            <label>
                                                Liczba wierszy w podglądzie
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={templateEditPanelForm.portRows}
                                                    onChange={(e) =>
                                                        setTemplateEditPanelForm((prev) => ({
                                                            ...prev,
                                                            portRows: e.target.value
                                                        }))
                                                    }
                                                />
                                            </label>
                                            <label>
                                                Układ gniazd
                                                <select
                                                    value={templateEditPanelForm.portFlow}
                                                    onChange={(e) =>
                                                        setTemplateEditPanelForm((prev) => ({
                                                            ...prev,
                                                            portFlow: e.target.value
                                                        }))
                                                    }
                                                >
                                                    <option value="row">Wierszami</option>
                                                    <option value="column">Kolumnami</option>
                                                </select>
                                            </label>
                                            <label>
                                                Panel nadrzędny
                                                <select
                                                    value={templateEditPanelForm.parentTempId}
                                                    onChange={(e) =>
                                                        setTemplateEditPanelForm((prev) => ({
                                                            ...prev,
                                                            parentTempId: e.target.value
                                                        }))
                                                    }
                                                >
                                                    <option value="">(brak)</option>
                                                    {templateEditForm.devicePanels
                                                        .filter((p) => p.tempId !== templateEditPanelEditingId)
                                                        .map((p) => (
                                                            <option key={p.tempId} value={p.tempId}>
                                                                {p.name || `Panel ${p.tempId}`}
                                                            </option>
                                                        ))}
                                                </select>
                                            </label>
                                            <div className="actions">
                                                <button
                                                    className="secondary"
                                                    type="button"
                                                    onClick={() => {
                                                        setTemplateEditPanelEditingId(null);
                                                        setTemplateEditPanelForm({
                                                            name: '',
                                                            portCount: 24,
                                                            portRows: 1,
                                                            portFlow: 'row',
                                                            parentTempId: ''
                                                        });
                                                    }}
                                                >
                                                    Wyczyść
                                                </button>
                                                <button
                                                    className="primary"
                                                    type="button"
                                                    onClick={() => {
                                                        setTemplateEditError('');
                                                        if (!templateEditPanelForm.name.trim()) {
                                                            setTemplateEditError('Podaj nazwę panelu');
                                                            return;
                                                        }
                                                        const portValue =
                                                            templateEditPanelForm.portCount === ''
                                                                ? null
                                                                : Number(templateEditPanelForm.portCount);
                                                        if (portValue !== null && (!Number.isInteger(portValue) || portValue < 0)) {
                                                            setTemplateEditError('Nieprawidłowa liczba gniazd');
                                                            return;
                                                        }
                                                        const rowsValue = Math.max(1, Number(templateEditPanelForm.portRows) || 1);
                                                        const flowValue =
                                                            templateEditPanelForm.portFlow === 'column' ? 'column' : 'row';
                                                        const parentTempId = templateEditPanelForm.parentTempId || null;
                                                        if (templateEditPanelEditingId) {
                                                            setTemplateEditForm((prev) => ({
                                                                ...prev,
                                                                devicePanels: prev.devicePanels.map((p) =>
                                                                    p.tempId === templateEditPanelEditingId
                                                                        ? {
                                                                            ...p,
                                                                            name: templateEditPanelForm.name.trim(),
                                                                            portCount: portValue,
                                                                            portRows: rowsValue,
                                                                            portFlow: flowValue,
                                                                            parentTempId
                                                                        }
                                                                        : p
                                                                )
                                                            }));
                                                        } else {
                                                            const newPanel = {
                                                                tempId: `tmp-${Date.now()}`,
                                                                name: templateEditPanelForm.name.trim(),
                                                                portCount: portValue,
                                                                portRows: rowsValue,
                                                                portFlow: flowValue,
                                                                parentTempId
                                                            };
                                                            setTemplateEditForm((prev) => ({
                                                                ...prev,
                                                                devicePanels: [...prev.devicePanels, newPanel]
                                                            }));
                                                        }
                                                        setTemplateEditPanelEditingId(null);
                                                        setTemplateEditPanelForm({
                                                            name: '',
                                                            portCount: 24,
                                                            portRows: 1,
                                                            portFlow: 'row',
                                                            parentTempId: ''
                                                        });
                                                    }}
                                                >
                                                    Zapisz panel
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="actions">
                                    <button
                                        className="secondary"
                                        type="button"
                                        onClick={() => {
                                            setTemplateEditing(null);
                                            setTemplateEditForm({
                                                name: '',
                                                heightU: 1,
                                                portCount: '',
                                                portRows: 1,
                                                portFlow: 'row',
                                                devicePanels: []
                                            });
                                            setTemplateEditPanelEditingId(null);
                                            setTemplateEditPanelForm({
                                                name: '',
                                                portCount: 24,
                                                portRows: 1,
                                                portFlow: 'row',
                                                parentTempId: ''
                                            });
                                        }}
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        className="primary"
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                if (!templateEditForm.name.trim()) {
                                                    setTemplateEditError('Podaj nazwę');
                                                    return;
                                                }
                                                const heightValue = Math.max(1, Number(templateEditForm.heightU) || 1);
                                                let payload = { ...(templateEditing.payload || {}), heightU: heightValue };
                                                if (templateEditing.type === 'panel') {
                                                    const portValue =
                                                        templateEditForm.portCount === ''
                                                            ? null
                                                            : Number(templateEditForm.portCount);
                                                    if (portValue !== null && (!Number.isInteger(portValue) || portValue < 0)) {
                                                        setTemplateEditError('Nieprawidłowa liczba gniazd');
                                                        return;
                                                    }
                                                    const rowsValue = Math.max(1, Number(templateEditForm.portRows) || 1);
                                                    const flowValue = templateEditForm.portFlow === 'column' ? 'column' : 'row';
                                                    payload = {
                                                        ...payload,
                                                        portCount: portValue,
                                                        portRows: rowsValue,
                                                        portFlow: flowValue
                                                    };
                                                }
                                                if (templateEditing.type === 'device' || templateEditing.type === 'server') {
                                                    payload = { ...payload, devicePanels: templateEditForm.devicePanels || [] };
                                                }
                                                const updated = await apiRequest(`/api/templates/${templateEditing.id}`, {
                                                    method: 'PUT',
                                                    body: {
                                                        name: templateEditForm.name.trim(),
                                                        payload
                                                    },
                                                    token
                                                });
                                                setTemplates((prev) =>
                                                    prev.map((t) => (t.id === updated.id ? updated : t))
                                                );
                                                setTemplateEditing(null);
                                                setTemplateEditForm({
                                                    name: '',
                                                    heightU: 1,
                                                    portCount: '',
                                                    portRows: 1,
                                                    portFlow: 'row',
                                                    devicePanels: []
                                                });
                                                setTemplateEditPanelEditingId(null);
                                                setTemplateEditPanelForm({
                                                    name: '',
                                                    portCount: 24,
                                                    portRows: 1,
                                                    portFlow: 'row',
                                                    parentTempId: ''
                                                });
                                            } catch (err) {
                                                setTemplateEditError(err.message);
                                            }
                                        }}
                                    >
                                        Zapisz
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="actions">
                            <button
                                className="secondary"
                                type="button"
                                onClick={() => setTemplateModalOpen(false)}
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {connectionsModalOpen && (
                <div className="modal-backdrop full-modal-backdrop" onClick={() => setConnectionsModalOpen(false)}>
                    <div className="modal full-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Schemat połączeń</h3>
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={showPanelNodes}
                                    onChange={(e) => setShowPanelNodes(e.target.checked)}
                                />
                                Pokaż panele
                            </label>
                            <button
                                className="secondary"
                                type="button"
                                onClick={addDiagramRect}
                            >
                                Dodaj prostokąt
                            </button>
                            <button
                                className="secondary"
                                type="button"
                                onClick={resetConnectionsLayout}
                            >
                                Reset układu
                            </button>
                            <button
                                className="secondary"
                                type="button"
                                onClick={() => setConnectionsModalOpen(false)}
                            >
                                Zamknij
                            </button>
                        </div>
                        {rectFormOpen && (
                            <div className="connections-rect-form">
                                <label>
                                    Nazwa
                                    <input
                                        value={rectForm.name}
                                        onChange={(e) => setRectForm((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                </label>
                                <label>
                                    Warstwa (1-10)
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={rectForm.layer}
                                        onChange={(e) => setRectForm((prev) => ({ ...prev, layer: e.target.value }))}
                                    />
                                </label>
                                <label>
                                    Kolor
                                    <input
                                        type="color"
                                        value={rectForm.color}
                                        onChange={(e) => setRectForm((prev) => ({ ...prev, color: e.target.value }))}
                                    />
                                </label>
                                <div className="actions">
                                    <button className="secondary" type="button" onClick={() => setRectFormOpen(false)}>
                                        Anuluj
                                    </button>
                                    {rectEditingId && (
                                        <button className="danger" type="button" onClick={removeRect}>
                                            Usuń
                                        </button>
                                    )}
                                    <button className="primary" type="button" onClick={saveRectForm}>
                                        Zapisz
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="connections-graph">
                            {globalGraphLoading && connectionsModalOpen ? (
                                <p>Ładowanie schematu...</p>
                            ) : globalGraphError ? (
                                <p className="error">{globalGraphError}</p>
                            ) : graph.edges.length === 0 ? (
                                <p>Brak połączeń.</p>
                            ) : (
                                <svg
                                    viewBox={`${graphBounds.x} ${graphBounds.y} ${graphBounds.width} ${graphBounds.height}`}
                                    className={`connections-svg${draggingNode || panning ? ' is-dragging' : ''}`}
                                    ref={connectionsSvgRef}
                                    onMouseDown={handleSvgMouseDown}
                                    onMouseMove={handleSvgMouseMove}
                                    onMouseUp={handleSvgMouseUp}
                                    onMouseLeave={handleSvgMouseUp}
                                    onWheel={undefined}
                                >
                                    <g transform={`translate(${graphPan.x} ${graphPan.y}) scale(${graphZoom})`}>
                                        {diagramRects
                                            .slice()
                                            .sort((a, b) => (a.layer || 1) - (b.layer || 1))
                                            .map((rect) => (
                                                <g key={`overlay-${rect.id}`}>
                                                    <rect
                                                        x={rect.x}
                                                        y={rect.y}
                                                        width={rect.width}
                                                        height={rect.height}
                                                        rx="8"
                                                        className="diagram-overlay-rect"
                                                        style={{
                                                            fill: rect.color,
                                                            fillOpacity: 0.25,
                                                            stroke: rect.color
                                                        }}
                                                        onMouseDown={(event) => handleRectMouseDown(rect.id, event)}
                                                    />
                                                    <text
                                                        x={rect.x + 8}
                                                        y={rect.y + 16}
                                                        className="diagram-overlay-label"
                                                        onMouseDown={(event) => event.stopPropagation()}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            openRectForm(rect);
                                                        }}
                                                    >
                                                        {rect.name}
                                                    </text>
                                                    <rect
                                                        x={rect.x + rect.width - 10}
                                                        y={rect.y + rect.height - 10}
                                                        width={10}
                                                        height={10}
                                                        className="diagram-overlay-handle"
                                                        style={{ fill: rect.color }}
                                                        onMouseDown={(event) => handleRectResizeMouseDown(rect.id, event)}
                                                    />
                                                </g>
                                            ))}
                                        {graph.groups?.map((group) => {
                                            const members = group.memberIds || [];
                                            if (members.length === 0) return null;
                                            // Label size (to include in group bounds)
                                            const labelLines = (group.label || '').split('\n');
                                            const lineHeight = 14;
                                            const labelHeight = Math.max(1, labelLines.length) * lineHeight;
                                            const labelTextLength = Math.max(...labelLines.map((l) => l.length), 0);
                                            const labelWidth = Math.max(120, Math.min(480, labelTextLength * 9 + 32));

                                            let minX = Infinity;
                                            let minY = Infinity;
                                            let maxX = -Infinity;
                                            let maxY = -Infinity;
                                            members.forEach((id) => {
                                                const pos = mergedGraphPositions.get(id);
                                                if (!pos) return;
                                                minX = Math.min(minX, pos.x);
                                                minY = Math.min(minY, pos.y);
                                                maxX = Math.max(maxX, pos.x + pos.width);
                                                maxY = Math.max(maxY, pos.y + pos.height);
                                            });
                                            if (!Number.isFinite(minX)) return null;
                                            const padding = 18;

                                            // Default label position (top center inside the group)
                                            let labelNodeX = minX + (maxX - minX) / 2 - labelWidth / 2;
                                            let labelNodeY = minY - padding + 8;
                                            if (group.labelPos && typeof group.labelPos.x === 'number' && typeof group.labelPos.y === 'number') {
                                                labelNodeX = group.labelPos.x;
                                                labelNodeY = group.labelPos.y;
                                            }

                                            // Expand bounds to include label node
                                            minX = Math.min(minX, labelNodeX);
                                            minY = Math.min(minY, labelNodeY);
                                            maxX = Math.max(maxX, labelNodeX + labelWidth);
                                            maxY = Math.max(maxY, labelNodeY + labelHeight + 8);

                                            const rectX = minX - padding;
                                            const rectY = minY - padding;
                                            const rectW = maxX - minX + padding * 2;
                                            const rectH = maxY - minY + padding * 2;
                                            return (
                                                <g key={`group-bg-${group.id}`} onMouseDown={(event) => handleGroupMouseDown(group.id, event)}>
                                                    <rect
                                                        x={rectX}
                                                        y={rectY}
                                                        width={rectW}
                                                        height={rectH}
                                                        rx="6"
                                                        className="connections-group"
                                                    />
                                                </g>
                                            );
                                        })}
                                        {graph.edges.map((edge, idx) => {
                                            const aPos = mergedGraphPositions.get(edge.aKey);
                                            const bPos = mergedGraphPositions.get(edge.bKey);
                                            if (!aPos || !bPos) return null;
                                            const aCx = aPos.x + aPos.width / 2;
                                            const aCy = aPos.y + aPos.height / 2;
                                            const bCx = bPos.x + bPos.width / 2;
                                            const bCy = bPos.y + bPos.height / 2;
                                            const dx = bCx - aCx;
                                            const dy = bCy - aCy;
                                            const len = Math.hypot(dx, dy) || 1;
                                            const ux = dx / len;
                                            const uy = dy / len;
                                            const aHalfW = aPos.width / 2;
                                            const aHalfH = aPos.height / 2;
                                            const bHalfW = bPos.width / 2;
                                            const bHalfH = bPos.height / 2;
                                            const aOffset = Math.min(aHalfW, aHalfH) + 2;
                                            const bOffset = Math.min(bHalfW, bHalfH) + 2;
                                            const ax = aCx + ux * aOffset;
                                            const ay = aCy + uy * aOffset;
                                            const bx = bCx - ux * bOffset;
                                            const by = bCy - uy * bOffset;
                                            const curveOffset = Math.min(120, len / 2);
                                            const c1x = ax + ux * curveOffset;
                                            const c1y = ay + uy * curveOffset;
                                            const c2x = bx - ux * curveOffset;
                                            const c2y = by - uy * curveOffset;
                                            const curve = `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`;
                                            const labelOffset = ((idx % 6) - 2.5) * 10;
                                            return (
                                                <g key={`edge-${idx}`}>
                                                    <path
                                                        d={curve}
                                                        className={`connections-line${edge.type === 'panel-target' ? ' connections-line-target' : ''}${edge.medium ? ` connections-line-${edge.medium}` : ''}`}
                                                    />
                                                    <text x={(ax + bx) / 2} y={(ay + by) / 2 - 6 + labelOffset} className="connections-line-label">
                                                        {edge.label}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                        {graph.groups?.map((group) => {
                                            const members = group.memberIds || [];
                                            if (members.length === 0) return null;
                                            // Calculate label node size and position
                                            const labelLines = (group.label || '').split('\n');
                                            const lineHeight = 14;
                                            const labelHeight = Math.max(1, labelLines.length) * lineHeight;
                                            // Estimate label width based on text length (fallback to 120-480px)
                                            const labelTextLength = Math.max(...labelLines.map(l => l.length), 0);
                                            const labelWidth = Math.max(120, Math.min(480, labelTextLength * 9 + 32));
                                            // We'll place the label node at the top of the group area, horizontally centered over the group nodes
                                            let minX = Infinity;
                                            let minY = Infinity;
                                            let maxX = -Infinity;
                                            let maxY = -Infinity;
                                            members.forEach((id) => {
                                                const pos = mergedGraphPositions.get(id);
                                                if (!pos) return;
                                                minX = Math.min(minX, pos.x);
                                                minY = Math.min(minY, pos.y);
                                                maxX = Math.max(maxX, pos.x + pos.width);
                                                maxY = Math.max(maxY, pos.y + pos.height);
                                            });
                                            if (!Number.isFinite(minX)) return null;
                                            const padding = 18;
                                            // Place label node horizontally centered above the group nodes, but inside the group area
                                            let labelNodeX = minX + (maxX - minX) / 2 - labelWidth / 2;
                                            let labelNodeY = minY - padding + 8; // 8px below the top padding
                                            if (group.labelPos && typeof group.labelPos.x === 'number' && typeof group.labelPos.y === 'number') {
                                                labelNodeX = group.labelPos.x;
                                                labelNodeY = group.labelPos.y;
                                            }
                                            // Now include the label node in the bounding box calculation
                                            minX = Math.min(minX, labelNodeX);
                                            minY = Math.min(minY, labelNodeY);
                                            maxX = Math.max(maxX, labelNodeX + labelWidth);
                                            maxY = Math.max(maxY, labelNodeY + labelHeight + 8); // 8px vertical padding for label node
                                            const rectX = minX - padding;
                                            const rectY = minY - padding;
                                            const rectW = maxX - minX + padding * 2;
                                            const rectH = maxY - minY + padding * 2;
                                            const handleLabelMouseDown = (event) => {
                                                event.stopPropagation();
                                                const point = getGraphPoint(event);
                                                setDraggingNode({
                                                    id: `group-label-${group.id}`,
                                                    offsetX: point.x - labelNodeX,
                                                    offsetY: point.y - labelNodeY,
                                                    width: labelWidth,
                                                    height: labelHeight + 8,
                                                    groupId: group.id,
                                                    isGroupLabel: true
                                                });
                                            };
                                            // Render group area background
                                            // Render label node as a rounded rectangle with text inside
                                            return (
                                                <g key={`group-label-${group.id}`}>
                                                    {/* Group area background (already rendered above) */}
                                                    {/* Label node as a rounded rectangle with text */}
                                                    <rect
                                                        x={labelNodeX}
                                                        y={labelNodeY}
                                                        width={labelWidth}
                                                        height={labelHeight + 8}
                                                        rx="6"
                                                        className="connections-node group-label-node"
                                                        onMouseDown={handleLabelMouseDown}
                                                    />
                                                    <text x={labelNodeX + labelWidth / 2} y={labelNodeY + (labelHeight + 8) / 2 - (labelLines.length - 1) * 6}
                                                        className="connections-node-label" textAnchor="middle"
                                                        onMouseDown={handleLabelMouseDown}
                                                    >
                                                        {labelLines.map((line, idx) => (
                                                            <tspan key={`${group.id}-label-${idx}`} x={labelNodeX + labelWidth / 2} dy={idx === 0 ? 0 : 12}>
                                                                {line}
                                                            </tspan>
                                                        ))}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                        {graph.panelList.map((node) => {
                                            const pos = mergedGraphPositions.get(node.id);
                                            if (!pos) return null;
                                            const lines = node.label.split('\n');
                                            const centerX = pos.x + pos.width / 2;
                                            const centerY = pos.y + pos.height / 2;
                                            const startY = centerY - (lines.length - 1) * 6;
                                            return (
                                                <g key={node.id} onMouseDown={(event) => handleNodeMouseDown(node.id, event)}>
                                                    <rect
                                                        x={pos.x}
                                                        y={pos.y}
                                                        width={pos.width}
                                                        height={pos.height}
                                                        rx="6"
                                                        className="connections-node panel-node"
                                                    />
                                                    <text x={centerX} y={startY} className="connections-node-label" textAnchor="middle">
                                                        {lines.map((line, idx) => (
                                                            <tspan key={`${node.id}-line-${idx}`} x={centerX} dy={idx === 0 ? 0 : 12}>
                                                                {line}
                                                            </tspan>
                                                        ))}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                        {graph.deviceList.map((node) => {
                                            const pos = mergedGraphPositions.get(node.id);
                                            if (!pos) return null;
                                            const lines = node.label.split('\n');
                                            const centerX = pos.x + pos.width / 2;
                                            const centerY = pos.y + pos.height / 2;
                                            const startY = centerY - (lines.length - 1) * 6;
                                            return (
                                                <g key={node.id} onMouseDown={(event) => handleNodeMouseDown(node.id, event)}>
                                                    <rect
                                                        x={pos.x}
                                                        y={pos.y}
                                                        width={pos.width}
                                                        height={pos.height}
                                                        rx="6"
                                                        className="connections-node device-node"
                                                    />
                                                    <text x={centerX} y={startY} className="connections-node-label" textAnchor="middle">
                                                        {lines.map((line, idx) => (
                                                            <tspan key={`${node.id}-line-${idx}`} x={centerX} dy={idx === 0 ? 0 : 12}>
                                                                {line}
                                                            </tspan>
                                                        ))}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </g>
                                </svg>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UsersManager({ token, currentUserId }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        username: '',
        role: 'user',
        password: '',
        mustChangePassword: true
    });
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!token) return;
        reload();
    }, [token]);

    async function reload() {
        setLoading(true);
        setError('');
        try {
            const data = await apiRequest('/api/users', { token });
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function startCreate() {
        setEditingId(null);
        setForm({ username: '', role: 'user', password: '', mustChangePassword: true });
        setError('');
        setShowForm(false);
    }

    function startEdit(user) {
        setEditingId(user.id);
        setForm({
            username: user.username,
            role: user.role || 'user',
            password: '',
            mustChangePassword: !!user.must_change_password
        });
        setError('');
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                username: form.username,
                role: form.role,
                mustChangePassword: !!form.mustChangePassword
            };
            if (form.password) {
                payload.password = form.password;
            }

            if (editingId) {
                await apiRequest(`/api/users/${editingId}`, {
                    method: 'PUT',
                    body: payload,
                    token
                });
            } else {
                if (!form.password) {
                    throw new Error('Hasło jest wymagane dla nowego użytkownika');
                }
                await apiRequest('/api/users', {
                    method: 'POST',
                    body: payload,
                    token
                });
            }
            await reload();
            startCreate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiRequest(`/api/users/${id}`, { method: 'DELETE', token });
            await reload();
            if (editingId === id) {
                startCreate();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card">
            <h1>Użytkownicy</h1>
            <input
                className="search"
                placeholder="Szukaj użytkownika..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            <div className="users-list">
                {users.length === 0 && !loading && <p>Brak użytkowników.</p>}
                {users
                    .filter((user) =>
                        user.username.toLowerCase().includes(query.trim().toLowerCase())
                    )
                    .map((user) => (
                        <div key={user.id} className="user-row">
                            <div>
                                <strong>{user.username}</strong>
                                <span className="user-meta">{user.role}</span>
                                {user.must_change_password ? (
                                    <span className="user-flag">wymuś zmianę</span>
                                ) : null}
                            </div>
                            <div className="location-actions">
                                <button className="secondary" onClick={() => startEdit(user)}>
                                    Edytuj
                                </button>
                                <button
                                    className="danger"
                                    onClick={() => handleDelete(user.id)}
                                    disabled={user.id === currentUserId}
                                >
                                    Usuń
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
            {!showForm && (
                <div className="actions">
                    <button className="primary" onClick={() => setShowForm(true)}>
                        Dodaj nowego
                    </button>
                </div>
            )}

            {showForm && (
                <>
                    <h2>{editingId ? 'Edytuj użytkownika' : 'Dodaj użytkownika'}</h2>
                    <form onSubmit={handleSubmit} className="users-form">
                        <label>
                            Login
                            <input
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                required
                            />
                        </label>
                        <label>
                            Typ konta
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                            >
                                <option value="user">Użytkownik</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </label>
                        <label>
                            Hasło {editingId && <small>(pozostaw puste, aby nie zmieniać)</small>}
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder={editingId ? '••••••••' : ''}
                            />
                        </label>
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={form.mustChangePassword}
                                onChange={(e) =>
                                    setForm({ ...form, mustChangePassword: e.target.checked })
                                }
                            />
                            Wymuś zmianę hasła przy logowaniu
                        </label>
                        <div className="actions">
                            <button className="secondary" type="button" onClick={startCreate}>
                                Anuluj
                            </button>
                            <button className="primary" type="submit" disabled={loading}>
                                {editingId ? 'Zapisz zmiany' : 'Dodaj'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}

function AuditLogsManager({ token }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        setError('');
        const url = query?.trim()
            ? `/api/audit-logs?query=${encodeURIComponent(query.trim())}`
            : '/api/audit-logs';
        apiRequest(url, { token })
            .then((data) => {
                if (cancelled) return;
                setItems(data?.items || []);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token, query]);

    const actionLabels = {
        read: 'Odczyt',
        create: 'Utworzenie',
        update: 'Edycja',
        delete: 'Usunięcie',
        other: 'Operacja'
    };

    return (
        <div className="card audit-logs-card">
            <h1>Logi</h1>
            <input
                className="search"
                placeholder="Szukaj po użytkowniku lub opisie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            {!loading && items.length === 0 && <p>Brak logów.</p>}
            {items.length > 0 && (
                <div className="audit-logs-list">
                    <div className="audit-logs-header">
                        <span>Data</span>
                        <span>Użytkownik</span>
                        <span>Akcja</span>
                        <span>Opis</span>
                    </div>
                    {items.map((item) => (
                        <div key={item.id} className="audit-logs-row">
                            <span>
                                {item.created_at
                                    ? new Date(item.created_at).toLocaleString('pl-PL')
                                    : '-'}
                            </span>
                            <span>{item.username || '-'}</span>
                            <span>{actionLabels[item.action] || item.action || '-'}</span>
                            <span>{item.description || '-'}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SfpInventoryManager({ token, query }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        setError('');
        const url = query?.trim()
            ? `/api/sfp-inventory?query=${encodeURIComponent(query.trim())}`
            : '/api/sfp-inventory';
        apiRequest(url, { token })
            .then((data) => {
                if (cancelled) return;
                setItems(data?.items || []);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token, query]);

    return (
        <div className="card sfp-inventory-card">
            <h1>Wkładki SFP</h1>
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            {!loading && items.length === 0 && <p>Brak wkładek SFP.</p>}
            {items.length > 0 && (
                <div className="sfp-inventory-list">
                    <div className="sfp-inventory-header">
                        <span>Typ</span>
                        <span>Właściciel</span>
                        <span>Numer seryjny</span>
                        <span>Urządzenie</span>
                        <span>Gniazdo</span>
                    </div>
                    {items.map((item, idx) => (
                        <div key={`${item.panel_id}-${item.port_number}-${idx}`} className="sfp-inventory-row">
                            <span>{item.sfp_type_name || '-'}</span>
                            <span>{item.owner || '-'}</span>
                            <span>{item.serial || '-'}</span>
                            <span>
                                {[
                                    item.location_name ? `Lokalizacja: ${item.location_name}` : null,
                                    item.building_name ? `Budynek: ${item.building_name}` : null,
                                    item.room_name ? `Pomieszczenie: ${item.room_name}` : null,
                                    item.rack_name ? `Szafa: ${item.rack_name}` : null,
                                    `${item.device_type === 'server' ? 'Serwer' : 'Urządzenie'}: ${item.device_name || '-'}`
                                ]
                                    .filter(Boolean)
                                    .join(' / ')}
                            </span>
                            <span>
                                {(item.panel_path || item.panel_name || '-') + (item.port_number ? ` / ${item.port_number}` : '')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function DiskInventoryManager({ token, query }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        setError('');
        const url = query?.trim()
            ? `/api/disk-inventory?query=${encodeURIComponent(query.trim())}`
            : '/api/disk-inventory';
        apiRequest(url, { token })
            .then((data) => {
                if (cancelled) return;
                setItems(data?.items || []);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token, query]);

    return (
        <div className="card disk-inventory-card">
            <h1>Dyski</h1>
            {error && <p className="error">{error}</p>}
            {loading && <p>Ładowanie...</p>}
            {!loading && items.length === 0 && <p>Brak dysków.</p>}
            {items.length > 0 && (
                <div className="disk-inventory-list">
                    <div className="disk-inventory-header">
                        <span>Nazwa</span>
                        <span>Właściciel</span>
                        <span>Rozmiar</span>
                        <span>Klauzula</span>
                        <span>Numer seryjny</span>
                        <span>Numer ewidencyjny</span>
                        <span>Serwer</span>
                    </div>
                    {items.map((item) => (
                        <div key={item.id} className="disk-inventory-row">
                            <span>{item.name || '-'}</span>
                            <span>{item.owner || '-'}</span>
                            <span>
                                {item.size_value !== null && item.size_value !== undefined
                                    ? `${item.size_value} ${item.size_unit || ''}`
                                    : '-'}
                            </span>
                            <span>{item.clause || '-'}</span>
                            <span>{item.serial || '-'}</span>
                            <span>{item.asset_no || '-'}</span>
                            <span>
                                {[
                                    item.location_name ? `Lokalizacja: ${item.location_name}` : null,
                                    item.building_name ? `Budynek: ${item.building_name}` : null,
                                    item.room_name ? `Pomieszczenie: ${item.room_name}` : null,
                                    item.rack_name ? `Szafa: ${item.rack_name}` : null,
                                    `${item.server_type === 'server' ? 'Serwer' : 'Urządzenie'}: ${item.server_name || '-'}`
                                ]
                                    .filter(Boolean)
                                    .join(' / ')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ConnectionsGlobalManager({ token, showPanels = true, layoutKey, selectedItemIds = null, selectedItemsMap = null, edgeMode = 'all' }) {
    const resolvedLayoutKey = layoutKey || (showPanels ? 'connections-graph-panels' : 'connections-graph-no-panels');
    const [globalGraphData, setGlobalGraphData] = useState(null);
    const [globalGraphLoading, setGlobalGraphLoading] = useState(false);
    const [globalGraphError, setGlobalGraphError] = useState('');
    const [graphPositions, setGraphPositions] = useState({});
    const [groupLabelPositions, setGroupLabelPositions] = useState({});
    const [draggingNode, setDraggingNode] = useState(null);
    const [draggingGroup, setDraggingGroup] = useState(null);
    const [draggingRect, setDraggingRect] = useState(null);
    const [resizingRect, setResizingRect] = useState(null);
    const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
    const [panning, setPanning] = useState(null);
    const [graphZoom, setGraphZoom] = useState(1);
    const showPanelNodes = showPanels;
    const [diagramRects, setDiagramRects] = useState([]);
    const [rectFormOpen, setRectFormOpen] = useState(false);
    const [rectEditingId, setRectEditingId] = useState(null);
    const [rectForm, setRectForm] = useState({
        name: '',
        layer: 5,
        color: '#93c5fd'
    });
    const [viewBoxBounds, setViewBoxBounds] = useState(null);
    const [layoutLoaded, setLayoutLoaded] = useState(false);
    const [hasAutoCentered, setHasAutoCentered] = useState(false);
    const [isEditUnlocked, setIsEditUnlocked] = useState(false);
    const connectionsSvgRef = React.useRef(null);
    const layoutAppliedRef = React.useRef(false);
    const layoutHasPayloadRef = React.useRef(false);
    const hasUserInteractionRef = React.useRef(false);
    const dataLoadedRef = React.useRef(false);
    const lastTokenRef = React.useRef(null);
    const moveRafRef = React.useRef(null);
    const movePendingRef = React.useRef(null);
    const selectedItemIdSet = useMemo(
        () => new Set((selectedItemIds || []).map((id) => String(id))),
        [selectedItemIds]
    );
    const selectedItemsById = useMemo(() => selectedItemsMap || {}, [selectedItemsMap]);
    const selectionType = edgeMode === 'selected-panels' ? 'panel' : 'device';

    const buildDevicePanelTreeLocal = (panels) => {
        const map = new Map();
        panels.forEach((panel) => map.set(panel.id, { ...panel, children: [] }));
        const roots = [];
        map.forEach((panel) => {
            if (panel.parent_panel_id) {
                const parent = map.get(panel.parent_panel_id);
                if (parent) {
                    parent.children.push(panel);
                    return;
                }
            }
            roots.push(panel);
        });
        return roots;
    };

    const applyLayoutPayload = (payload) => {
        if (!payload) return;
        try {
            const parsed = JSON.parse(payload);
            if (parsed?.positions) setGraphPositions(parsed.positions);
            if (parsed?.pan) setGraphPan(parsed.pan);
            if (parsed?.zoom) setGraphZoom(parsed.zoom);
            if (Array.isArray(parsed?.rectangles)) setDiagramRects(parsed.rectangles);
            if (parsed?.groupLabelPositions && typeof parsed.groupLabelPositions === 'object') {
                setGroupLabelPositions(parsed.groupLabelPositions);
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        return () => {
            if (moveRafRef.current) {
                cancelAnimationFrame(moveRafRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!token) return;
        if (lastTokenRef.current !== token) {
            dataLoadedRef.current = false;
            lastTokenRef.current = token;
        }
        if (dataLoadedRef.current) return;
        let cancelled = false;
        setGlobalGraphLoading(true);
        setGlobalGraphError('');
        const loadData = async () => {
            try {
                const locations = await apiRequest('/api/locations', { token });
                const locationMap = {};
                locations.forEach((loc) => {
                    locationMap[loc.id] = { id: loc.id, name: loc.name };
                });

                const buildings = [];
                for (const loc of locations) {
                    const locBuildings = await apiRequest(`/api/locations/${loc.id}/buildings`, { token });
                    locBuildings.forEach((b) => {
                        buildings.push({ ...b, location_id: loc.id, location_name: loc.name });
                    });
                }

                const rooms = [];
                for (const buildingItem of buildings) {
                    const buildingRooms = await apiRequest(`/api/buildings/${buildingItem.id}/rooms`, { token });
                    buildingRooms.forEach((roomItem) => {
                        rooms.push({
                            ...roomItem,
                            building_id: buildingItem.id,
                            building_name: buildingItem.name,
                            location_id: buildingItem.location_id,
                            location_name: buildingItem.location_name
                        });
                    });
                }

                const racks = [];
                for (const roomItem of rooms) {
                    const roomRacks = await apiRequest(`/api/rooms/${roomItem.id}/racks`, { token });
                    roomRacks.forEach((rackItem) => {
                        racks.push({
                            ...rackItem,
                            room_id: roomItem.id,
                            room_name: roomItem.name,
                            building_id: roomItem.building_id,
                            building_name: roomItem.building_name,
                            location_id: roomItem.location_id,
                            location_name: roomItem.location_name
                        });
                    });
                }

                const rackMetaById = {};
                racks.forEach((rackItem) => {
                    rackMetaById[rackItem.id] = rackItem;
                });

                const itemsPerRack = await Promise.all(
                    racks.map((rackItem) =>
                        apiRequest(`/api/racks/${rackItem.id}/items`, { token })
                            .then((list) => list || [])
                            .catch(() => [])
                    )
                );
                const allItems = itemsPerRack.flat();

                const panelsData = await apiRequest('/api/panels', { token });
                const metaMap = {};
                panelsData.forEach((panelItem) => {
                    metaMap[String(panelItem.id)] = panelItem;
                });

                const panelItems = allItems.filter((item) => item.type === 'panel');
                const deviceItems = allItems.filter((item) => item.type === 'device' || item.type === 'server');

                const nextPanelTargets = {};
                const nextPanelConnections = {};

                if (panelItems.length > 0) {
                    const panelPortsResults = await Promise.all(
                        panelItems.map((panelItem) =>
                            apiRequest(`/api/panels/${panelItem.id}/ports`, { token })
                                .then((portsData) => ({
                                    panelId: panelItem.id,
                                    ports: portsData.ports || []
                                }))
                                .catch(() => ({ panelId: panelItem.id, ports: [] }))
                        )
                    );
                    panelPortsResults.forEach((res) => {
                        const map = {};
                        res.ports.forEach((p) => {
                            if (p.linked_panel_id) {
                                map[p.port_number] = {
                                    panelId: String(p.linked_panel_id),
                                    port: p.linked_port_number,
                                    medium: p.medium || 'utp'
                                };
                            }
                        });
                        nextPanelTargets[res.panelId] = map;
                    });

                    const panelDeviceConnections = await Promise.all(
                        panelItems.map((panelItem) =>
                            apiRequest(`/api/panels/${panelItem.id}/connections`, { token })
                                .then((res) => ({ panelId: panelItem.id, connections: res.connections || [] }))
                                .catch(() => ({ panelId: panelItem.id, connections: [] }))
                        )
                    );
                    panelDeviceConnections.forEach((res) => {
                        const map = {};
                        res.connections.forEach((row) => {
                            map[row.panel_port_number] = {
                                devicePanelId: row.device_panel_id,
                                devicePort: row.device_port_number,
                                medium: row.medium || 'utp'
                            };
                        });
                        nextPanelConnections[res.panelId] = map;
                    });

                    const panelCableConnections = await Promise.all(
                        panelItems.map((panelItem) =>
                            apiRequest(`/api/panels/${panelItem.id}/cable-connections`, { token })
                                .then((res) => ({ panelId: panelItem.id, connections: res.connections || [] }))
                                .catch(() => ({ panelId: panelItem.id, connections: [] }))
                        )
                    );
                    panelCableConnections.forEach((res) => {
                        const map = { ...(nextPanelConnections[res.panelId] || {}) };
                        res.connections.forEach((row) => {
                            map[row.port_number] = {
                                panelId: row.linked_panel_id,
                                panelPort: row.linked_port_number,
                                medium: row.medium || 'utp'
                            };
                        });
                        nextPanelConnections[res.panelId] = map;
                    });
                }

                const devicePanelsMap = {};
                const nextDeviceTargets = {};

                if (deviceItems.length > 0) {
                    const deviceResults = await Promise.all(
                        deviceItems.map((item) =>
                            apiRequest(`/api/devices/${item.id}/panels`, { token })
                                .then((list) => ({ id: item.id, panels: list || [] }))
                                .catch(() => ({ id: item.id, panels: [] }))
                        )
                    );
                    deviceResults.forEach((res) => {
                        devicePanelsMap[res.id] = res.panels;
                    });

                    const allPanels = deviceResults.flatMap((res) => res.panels || []);
                    if (allPanels.length > 0) {
                        const portResults = await Promise.all(
                            allPanels.map((panelItem) =>
                                apiRequest(`/api/device-panels/${panelItem.id}/ports`, { token })
                                    .then((portsData) => ({ panelId: panelItem.id, ports: portsData.ports || [] }))
                                    .catch(() => ({ panelId: panelItem.id, ports: [] }))
                            )
                        );
                        portResults.forEach((res) => {
                            const map = {};
                            res.ports.forEach((p) => {
                                if (p.linked_panel_id) {
                                    map[p.port_number] = {
                                        panelId: p.linked_panel_id,
                                        port: p.linked_port_number,
                                        medium: p.medium || 'utp'
                                    };
                                }
                            });
                            nextDeviceTargets[res.panelId] = map;
                        });
                    }
                }

                if (!cancelled) {
                    setGlobalGraphData({
                        items: allItems,
                        panelMeta: metaMap,
                        panelConnections: nextPanelConnections,
                        panelPortTargets: nextPanelTargets,
                        devicePanels: devicePanelsMap,
                        devicePanelPortTargets: nextDeviceTargets,
                        rackMetaById
                    });
                    dataLoadedRef.current = true;
                }
            } catch (err) {
                if (!cancelled) setGlobalGraphError(err.message || 'Nie udało się wczytać schematu.');
            } finally {
                if (!cancelled) setGlobalGraphLoading(false);
            }
        };
        loadData();
        return () => {
            cancelled = true;
        };
    }, [token]);

    useEffect(() => {
        setHasAutoCentered(false);
        layoutAppliedRef.current = false;
        layoutHasPayloadRef.current = false;
        hasUserInteractionRef.current = false;
    }, [resolvedLayoutKey]);

    useEffect(() => {
        if (!layoutLoaded || globalGraphLoading || globalGraphError) return;
        if (hasAutoCentered) return;
        if (layoutHasPayloadRef.current) return;
        setGraphPan({ x: 0, y: 0 });
        setGraphZoom(1);
        setHasAutoCentered(true);
    }, [layoutLoaded, globalGraphLoading, globalGraphError, hasAutoCentered]);

    useEffect(() => {
        if (!token) return;
        setLayoutLoaded(false);
        apiRequest(`/api/diagram-layouts-global/${resolvedLayoutKey}`, { token })
            .then((res) => {
                if (res?.payload) {
                    layoutHasPayloadRef.current = true;
                    if (!layoutAppliedRef.current && !hasUserInteractionRef.current) {
                        applyLayoutPayload(res.payload);
                        layoutAppliedRef.current = true;
                    }
                }
                setLayoutLoaded(true);
            })
            .catch(() => setLayoutLoaded(true));
    }, [token, resolvedLayoutKey]);

    useEffect(() => {
        if (!layoutLoaded || !token) return;
        const timeoutId = setTimeout(() => {
            apiRequest(`/api/diagram-layouts-global/${resolvedLayoutKey}`, {
                method: 'PUT',
                token,
                body: {
                    payload: JSON.stringify({
                        positions: graphPositions,
                        pan: graphPan,
                        zoom: graphZoom,
                        rectangles: diagramRects,
                        groupLabelPositions
                    })
                }
            }).catch(() => { });
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [graphPositions, graphPan, graphZoom, diagramRects, groupLabelPositions, layoutLoaded, token, resolvedLayoutKey]);

    const graphItems = globalGraphData?.items || [];
    const graphPanelMeta = globalGraphData?.panelMeta || {};
    const graphPanelConnections = globalGraphData?.panelConnections || {};
    const graphPanelPortTargets = globalGraphData?.panelPortTargets || {};
    const graphDevicePanels = globalGraphData?.devicePanels || {};
    const graphDevicePanelPortTargets = globalGraphData?.devicePanelPortTargets || {};
    const graphRackMetaById = globalGraphData?.rackMetaById || null;

    const graphItemById = useMemo(() => {
        const map = new Map();
        graphItems.forEach((item) => map.set(item.id, item));
        return map;
    }, [graphItems]);

    const graphDevicePanelById = useMemo(() => {
        const map = new Map();
        Object.values(graphDevicePanels).forEach((list) => {
            (list || []).forEach((panel) => map.set(panel.id, panel));
        });
        return map;
    }, [graphDevicePanels]);

    const graphDevicePanelPathMap = useMemo(() => {
        const map = new Map();
        Object.values(graphDevicePanels).forEach((list) => {
            const tree = buildDevicePanelTreeLocal(list || []);
            const walk = (nodes, prefix = '') => {
                nodes.forEach((node) => {
                    const currentPath = prefix ? `${prefix} / ${node.name}` : node.name;
                    map.set(node.id, currentPath);
                    if (node.children?.length) {
                        walk(node.children, currentPath);
                    }
                });
            };
            walk(tree, '');
        });
        return map;
    }, [graphDevicePanels]);

    const connectionsOverview = useMemo(() => {
        const panelPanel = [];
        const panelDevice = [];
        const deviceDevice = [];

        const panelPairSeen = new Set();
        Object.entries(graphPanelConnections).forEach(([panelId, map]) => {
            Object.entries(map || {}).forEach(([port, target]) => {
                if (target?.panelId) {
                    const a = { panelId: Number(panelId), port: Number(port) };
                    const b = { panelId: Number(target.panelId), port: Number(target.panelPort) };
                    const key = [
                        `${Math.min(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.min(a.port, b.port) : a.panelId < b.panelId ? a.port : b.port}`,
                        `${Math.max(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.max(a.port, b.port) : a.panelId < b.panelId ? b.port : a.port}`
                    ].join('|');
                    if (panelPairSeen.has(key)) return;
                    panelPairSeen.add(key);
                    panelPanel.push({
                        a: { type: 'panel', panelId: a.panelId, port: a.port },
                        b: { type: 'panel', panelId: b.panelId, port: b.port },
                        medium: target.medium || 'utp'
                    });
                }
                if (target?.devicePanelId) {
                    panelDevice.push({
                        a: { type: 'panel', panelId: Number(panelId), port: Number(port) },
                        b: { type: 'device', panelId: Number(target.devicePanelId), port: Number(target.devicePort) },
                        medium: target.medium || 'utp'
                    });
                }
            });
        });

        const devicePairSeen = new Set();
        Object.entries(graphDevicePanelPortTargets).forEach(([panelId, map]) => {
            Object.entries(map || {}).forEach(([port, target]) => {
                if (!target?.panelId) return;
                const a = { panelId: Number(panelId), port: Number(port) };
                const b = { panelId: Number(target.panelId), port: Number(target.port) };
                const key = [
                    `${Math.min(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.min(a.port, b.port) : a.panelId < b.panelId ? a.port : b.port}`,
                    `${Math.max(a.panelId, b.panelId)}:${a.panelId === b.panelId ? Math.max(a.port, b.port) : a.panelId < b.panelId ? b.port : a.port}`
                ].join('|');
                if (devicePairSeen.has(key)) return;
                devicePairSeen.add(key);
                deviceDevice.push({
                    a: { type: 'device', panelId: a.panelId, port: a.port },
                    b: { type: 'device', panelId: b.panelId, port: b.port },
                    medium: target.medium || 'utp'
                });
            });
        });

        return { panelPanel, panelDevice, deviceDevice };
    }, [graphPanelConnections, graphDevicePanelPortTargets]);

    const computedConnectionsGraph = useMemo(() => {
        if (!globalGraphData) {
            return {
                panelList: [],
                deviceList: [],
                edges: [],
                positions: new Map(),
                width: 800,
                height: 600,
                groups: [],
                nodeGroupMap: new Map()
            };
        }
        const panelNodes = [];
        const deviceNodes = [];
        const edges = [];

        const endpointKey = (endpoint) => `${endpoint.type}:${endpoint.panelId}:${endpoint.port}`;
        const endpointByKey = new Map();

        const registerEndpoint = (endpoint) => {
            const key = endpointKey(endpoint);
            if (!endpointByKey.has(key)) {
                endpointByKey.set(key, endpoint);
            }
            return key;
        };

        const portEdges = [];
        const addPortEdge = (a, b, type, medium = null) => {
            const aKey = registerEndpoint(a);
            const bKey = registerEndpoint(b);
            portEdges.push({ aKey, bKey, type, medium });
        };

        const showPanelTargetsOnly = edgeMode === 'panel-targets' || edgeMode === 'selected-panels';
        if (!showPanelTargetsOnly) {
            connectionsOverview.panelPanel.forEach((conn) => {
                addPortEdge(conn.a, conn.b, 'panel-panel', conn.medium || 'utp');
            });

            connectionsOverview.panelDevice.forEach((conn) => {
                const panelEndpoint = conn.a.type === 'panel' ? conn.a : conn.b;
                const deviceEndpoint = conn.a.type === 'device' ? conn.a : conn.b;
                addPortEdge(panelEndpoint, deviceEndpoint, 'panel-device', conn.medium || 'utp');
            });

            connectionsOverview.deviceDevice.forEach((conn) => {
                addPortEdge(conn.a, conn.b, 'device-device', conn.medium || 'utp');
            });
        }

        if (showPanelTargetsOnly) {
            const groupedTargets = new Map();
            Object.entries(graphPanelPortTargets).forEach(([panelId, map]) => {
                Object.entries(map || {}).forEach(([port, target]) => {
                    if (!target?.panelId) return;
                    const sourcePort = Number(port);
                    const targetPort = Number(target.port);
                    if (!Number.isInteger(sourcePort) || !Number.isInteger(targetPort)) return;
                    const offset = targetPort - sourcePort;
                    const medium = target.medium || 'utp';
                    const key = `${panelId}|${target.panelId}|${medium}|${offset}`;
                    if (!groupedTargets.has(key)) {
                        groupedTargets.set(key, {
                            panelId: Number(panelId),
                            targetPanelId: Number(target.panelId),
                            medium,
                            sourcePorts: [],
                            targetPorts: []
                        });
                    }
                    const entry = groupedTargets.get(key);
                    entry.sourcePorts.push(sourcePort);
                    entry.targetPorts.push(targetPort);
                });
            });
            groupedTargets.forEach((entry) => {
                const sourceMin = Math.min(...entry.sourcePorts);
                const sourceMax = Math.max(...entry.sourcePorts);
                const targetMin = Math.min(...entry.targetPorts);
                const targetMax = Math.max(...entry.targetPorts);
                addPortEdge(
                    {
                        type: 'panel',
                        panelId: entry.panelId,
                        port: `${sourceMin}-${sourceMax}`,
                        rangeStart: sourceMin,
                        rangeEnd: sourceMax
                    },
                    {
                        type: 'panel',
                        panelId: entry.targetPanelId,
                        port: `${targetMin}-${targetMax}`,
                        rangeStart: targetMin,
                        rangeEnd: targetMax
                    },
                    'panel-target',
                    entry.medium
                );
            });
        } else {
            Object.entries(graphPanelPortTargets).forEach(([panelId, map]) => {
                Object.entries(map || {}).forEach(([port, target]) => {
                    if (!target?.panelId) return;
                    if (!graphPanelConnections[panelId]?.[port]) return;
                    addPortEdge(
                        { type: 'panel', panelId: Number(panelId), port: Number(port) },
                        { type: 'panel', panelId: Number(target.panelId), port: Number(target.port) },
                        'panel-target',
                        target.medium || 'utp'
                    );
                });
            });
        }

        const selectionActive = selectedItemIds !== null;
        const getDeviceParentItemId = (endpoint) => {
            if (!endpoint || endpoint.type !== 'device') return null;
            const devicePanel = graphDevicePanelById.get(endpoint.panelId);
            return String(devicePanel?.parent_item_id || endpoint.panelId);
        };
        const isSelectedEndpoint = (endpoint) => {
            if (!selectionActive || !endpoint) return false;
            if (selectionType === 'panel') {
                return endpoint.type === 'panel' && selectedItemIdSet.has(String(endpoint.panelId));
            }
            return endpoint.type === 'device' && selectedItemIdSet.has(getDeviceParentItemId(endpoint));
        };


        const buildAdjacency = (edges) => {
            const map = new Map();
            edges.forEach((edge, index) => {
                if (!map.has(edge.aKey)) map.set(edge.aKey, []);
                if (!map.has(edge.bKey)) map.set(edge.bKey, []);
                map.get(edge.aKey).push({ index, other: edge.bKey });
                map.get(edge.bKey).push({ index, other: edge.aKey });
            });
            return map;
        };

        let filteredPortEdges = portEdges;
        let endpointLookup = endpointByKey;

        if (selectionActive) {
            const selectedNodeKeys = Array.from(endpointByKey.entries())
                .filter(([, endpoint]) => isSelectedEndpoint(endpoint))
                .map(([key]) => key);
            if (selectedNodeKeys.length === 0) {
                filteredPortEdges = [];
                endpointLookup = new Map();
            } else {
                const fullAdjacency = buildAdjacency(portEdges);
                const includeEdgeIndices = new Set();
                const includeEndpointKeys = new Set(selectedNodeKeys);
                const selectedNodeKeySet = new Set(selectedNodeKeys);
                const queue = [...selectedNodeKeys];

                while (queue.length) {
                    const currentKey = queue.shift();
                    const neighbors = fullAdjacency.get(currentKey) || [];
                    neighbors.forEach(({ index, other }) => {
                        const otherEndpoint = endpointByKey.get(other);
                        if (!otherEndpoint) return;
                        includeEdgeIndices.add(index);
                        if (!includeEndpointKeys.has(other)) {
                            includeEndpointKeys.add(other);
                            if (selectionType === 'device') {
                                if (otherEndpoint.type === 'panel' || selectedNodeKeySet.has(other)) {
                                    queue.push(other);
                                }
                            } else {
                                if (otherEndpoint.type === 'device' || selectedNodeKeySet.has(other)) {
                                    queue.push(other);
                                }
                            }
                        }
                    });
                }

                filteredPortEdges = portEdges.filter((_, index) => includeEdgeIndices.has(index));
                endpointLookup = new Map();
                includeEndpointKeys.forEach((key) => {
                    const endpoint = endpointByKey.get(key);
                    if (endpoint) endpointLookup.set(key, endpoint);
                });
            }
        }

        const adjacency = buildAdjacency(filteredPortEdges);


        if (selectionActive) {
            if (selectionType === 'device') {
                const hasSelectedEndpoint = (itemId) => {
                    const targetId = String(itemId);
                    for (const endpoint of endpointLookup.values()) {
                        if (endpoint.type !== 'device') continue;
                        if (String(getDeviceParentItemId(endpoint)) === targetId) return true;
                    }
                    return false;
                };
                selectedItemIdSet.forEach((itemId) => {
                    const selectedItem = selectedItemsById?.[String(itemId)] || null;
                    const item =
                        graphItemById.get(Number(itemId)) ||
                        graphItemById.get(String(itemId)) ||
                        selectedItem;
                    if (!item || (item.type !== 'device' && item.type !== 'server')) return;
                    if (hasSelectedEndpoint(itemId)) return;
                    const key = `device:${itemId}:0`;
                    endpointLookup.set(key, {
                        type: 'device',
                        panelId: Number(itemId),
                        port: 0,
                        placeholder: true,
                        placeholderName: item.name || selectedItem?.name || String(itemId),
                        placeholderType: item.type || selectedItem?.type || 'device',
                        ipv4: item.ipv4 || selectedItem?.ipv4 || null,
                        hostname: item.hostname || selectedItem?.hostname || null,
                        owner: item.owner || selectedItem?.owner || null,
                        locationName: selectedItem?.locationName || null,
                        buildingName: selectedItem?.buildingName || null,
                        roomName: selectedItem?.roomName || null,
                        rackName: selectedItem?.rackName || null
                    });
                });
            } else {
                const hasSelectedPanel = (itemId) => {
                    const targetId = String(itemId);
                    for (const endpoint of endpointLookup.values()) {
                        if (endpoint.type !== 'panel') continue;
                        if (String(endpoint.panelId) === targetId) return true;
                    }
                    return false;
                };
                selectedItemIdSet.forEach((itemId) => {
                    const selectedItem = selectedItemsById?.[String(itemId)] || null;
                    const item = graphItemById.get(Number(itemId)) || graphItemById.get(String(itemId)) || selectedItem;
                    if (!item || item.type !== 'panel') return;
                    if (hasSelectedPanel(itemId)) return;
                    const key = `panel:${itemId}:0`;
                    endpointLookup.set(key, {
                        type: 'panel',
                        panelId: Number(itemId),
                        port: 0,
                        placeholder: true,
                        placeholderName: item.name || selectedItem?.name || String(itemId),
                        locationName: selectedItem?.locationName || null,
                        buildingName: selectedItem?.buildingName || null,
                        roomName: selectedItem?.roomName || null,
                        rackName: selectedItem?.rackName || null
                    });
                });
            }
        }

        const isTerminal = (key) => {
            const endpoint = endpointLookup.get(key);
            const degree = adjacency.get(key)?.length || 0;
            return endpoint?.type === 'device' || degree !== 2;
        };

        const visitedEdges = new Set();
        const paths = [];

        const walkPath = (startKey, edgeRef) => {
            const pathNodes = [startKey];
            const pathEdges = [];
            let currentKey = startKey;
            let currentEdge = edgeRef;

            while (currentEdge) {
                const edgeIndex = currentEdge.index;
                if (visitedEdges.has(edgeIndex)) break;
                visitedEdges.add(edgeIndex);
                const edge = filteredPortEdges[edgeIndex];
                const nextKey = edge.aKey === currentKey ? edge.bKey : edge.aKey;
                pathEdges.push(edge);
                pathNodes.push(nextKey);
                if (isTerminal(nextKey)) break;
                const nextEdges = (adjacency.get(nextKey) || []).filter((entry) => entry.index !== edgeIndex);
                currentKey = nextKey;
                currentEdge = nextEdges[0];
            }

            return { pathNodes, pathEdges };
        };

        adjacency.forEach((edgesForNode, nodeKey) => {
            if (!isTerminal(nodeKey)) return;
            edgesForNode.forEach((edgeRef) => {
                if (visitedEdges.has(edgeRef.index)) return;
                paths.push(walkPath(nodeKey, edgeRef));
            });
        });

        filteredPortEdges.forEach((edge, index) => {
            if (visitedEdges.has(index)) return;
            const seed = edge.aKey;
            const edgeRef = (adjacency.get(seed) || []).find((entry) => entry.index === index);
            if (!edgeRef) return;
            paths.push(walkPath(seed, edgeRef));
        });

        const panelNodeMap = new Map();
        const deviceNodeMap = new Map();

        const getPanelNodeLabel = (endpoint) => {
            if (showPanelTargetsOnly) {
                const panelItem = graphItemById.get(endpoint.panelId);
                const meta = graphPanelMeta[String(endpoint.panelId)];
                const name = panelItem?.name || meta?.name || `Panel ${endpoint.panelId}`;
                const rangeLabel = endpoint.rangeStart && endpoint.rangeEnd
                    ? `Porty: ${endpoint.rangeStart}-${endpoint.rangeEnd}`
                    : 'Porty: -';
                return `Panel: ${name}\n${rangeLabel}`;
            }
            if (endpoint?.placeholder) {
                const panelItem = graphItemById.get(endpoint.panelId);
                const meta = graphPanelMeta[String(endpoint.panelId)];
                const name = endpoint.placeholderName || panelItem?.name || meta?.name || `Panel ${endpoint.panelId}`;
                return `Panel: ${name}\nBrak połączeń`;
            }
            const lines = [];
            lines.push(`Port: ${endpoint.port}`);
            return lines.join('\n');
        };

        const getDeviceNodeLabel = (endpoint) => {
            if (endpoint?.placeholder) {
                const parentItem =
                    graphItemById.get(endpoint.panelId) ||
                    graphItemById.get(String(endpoint.panelId));
                const typeLabel =
                    (endpoint.placeholderType || parentItem?.type) === 'server'
                        ? 'Serwer'
                        : 'Urządzenie';
                const name = endpoint.placeholderName || parentItem?.name || endpoint.panelId;
                return `${typeLabel}: ${name}\nBrak połączeń`;
            }
            const devicePanel = graphDevicePanelById.get(endpoint.panelId);
            const panelPath = graphDevicePanelPathMap.get(endpoint.panelId) || devicePanel?.name || `Panel ${endpoint.panelId}`;
            const lines = [];
            lines.push(`${panelPath} / ${endpoint.port}`);
            return lines.join('\n');
        };

        const getGraphEndpointLabel = (endpoint) => {
            if (!endpoint) return '';
            if (endpoint.type === 'panel') {
                return getPanelNodeLabel(endpoint).split('\n').join(' / ');
            }
            if (endpoint.type === 'device') {
                return getDeviceNodeLabel(endpoint).split('\n').join(' / ');
            }
            return '';
        };

        const getShortEndpointLabel = (endpoint) => {
            if (!endpoint) return '';
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)];
                const panelItem = graphItemById.get(endpoint.panelId);
                const name = endpoint.placeholderName || panelItem?.name || meta?.name || endpoint.panelId;
                if (showPanelTargetsOnly) {
                    const rangeLabel = endpoint.rangeStart && endpoint.rangeEnd
                        ? `Porty: ${endpoint.rangeStart}-${endpoint.rangeEnd}`
                        : 'Porty: -';
                    return `Panel: ${name} / ${rangeLabel}`;
                }
                return endpoint.placeholder ? `Panel: ${name} / Brak połączeń` : `Panel: ${name} / Port: ${endpoint.port}`;
            }
            if (endpoint.type === 'device') {
                const devicePanel = graphDevicePanelById.get(endpoint.panelId);
                const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
                const parentItem = graphItemById.get(parentItemId) || graphItemById.get(String(parentItemId));
                const placeholderType = endpoint.placeholderType || parentItem?.type;
                const typeLabel = placeholderType === 'server' ? 'Serwer' : 'Urządzenie';
                const name = endpoint.placeholderName || parentItem?.name || parentItemId;
                const panelPath = endpoint.placeholder
                    ? 'Brak połączeń'
                    : graphDevicePanelPathMap.get(endpoint.panelId) || devicePanel?.name || `Panel ${endpoint.panelId}`;
                return `${typeLabel}: ${name} / ${panelPath}${endpoint.placeholder ? '' : ` / ${endpoint.port}`}`;
            }
            return '';
        };

        const getEndpointRackKey = (endpoint) => {
            if (!endpoint) return null;
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)];
                return meta?.rack_id || meta?.rack_name || null;
            }
            if (endpoint.type === 'device') {
                if (endpoint.placeholder && endpoint.rackName) {
                    return endpoint.rackName;
                }
                const devicePanel = graphDevicePanelById.get(endpoint.panelId);
                const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
                const parentItem = graphItemById.get(parentItemId);
                const rackMeta = parentItem?.rack_id ? graphRackMetaById?.[parentItem.rack_id] : null;
                return rackMeta?.id || rackMeta?.name || parentItem?.rack_id || null;
            }
            return null;
        };

        const getEndpointLocationParts = (endpoint) => {
            if (!endpoint) return {};
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)] || {};
                return {
                    location: meta.location_name || null,
                    building: meta.building_name || null,
                    room: meta.room_name || null,
                    rack: meta.rack_name || null
                };
            }
            if (endpoint.type === 'device') {
                if (endpoint.placeholder) {
                    return {
                        location: endpoint.locationName || null,
                        building: endpoint.buildingName || null,
                        room: endpoint.roomName || null,
                        rack: endpoint.rackName || null
                    };
                }
                const devicePanel = graphDevicePanelById.get(endpoint.panelId);
                const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
                const parentItem = graphItemById.get(parentItemId);
                const rackMeta = parentItem?.rack_id ? graphRackMetaById?.[parentItem.rack_id] : null;
                return {
                    location: rackMeta?.location_name || null,
                    building: rackMeta?.building_name || null,
                    room: rackMeta?.room_name || null,
                    rack: rackMeta?.name || null
                };
            }
            return {};
        };

        const getDiffEndpointLabel = (endpoint, otherEndpoint) => {
            if (!endpoint) return '';
            const parts = getEndpointLocationParts(endpoint);
            const otherParts = getEndpointLocationParts(otherEndpoint);
            const diffLines = [];
            if (parts.location && parts.location !== otherParts.location) {
                diffLines.push(`Lokalizacja: ${parts.location}`);
            }
            if (parts.building && parts.building !== otherParts.building) {
                diffLines.push(`Budynek: ${parts.building}`);
            }
            if (parts.room && parts.room !== otherParts.room) {
                diffLines.push(`Pomieszczenie: ${parts.room}`);
            }
            if (parts.rack && parts.rack !== otherParts.rack) {
                diffLines.push(`Szafa: ${parts.rack}`);
            }
            const core = endpoint.type === 'panel'
                ? getShortEndpointLabel(endpoint)
                : getShortEndpointLabel(endpoint);
            return diffLines.length ? `${diffLines.join(' / ')} / ${core}` : core;
        };

        const getNodeIdForEndpoint = (endpoint) => {
            if (endpoint.type === 'panel') {
                if (!showPanelNodes) return null;
                const key = `panel:${endpoint.panelId}:${endpoint.port}`;
                if (!panelNodeMap.has(key)) {
                    panelNodeMap.set(key, {
                        id: key,
                        label: getPanelNodeLabel(endpoint)
                    });
                }
                return key;
            }

            const key = `device:${endpoint.panelId}:${endpoint.port}`;
            if (!deviceNodeMap.has(key)) {
                deviceNodeMap.set(key, {
                    id: key,
                    label: getDeviceNodeLabel(endpoint)
                });
            }
            return key;
        };

        const addEdgeByEndpoints = (aEndpoint, bEndpoint, type, medium = null) => {
            const aKey = getNodeIdForEndpoint(aEndpoint);
            const bKey = getNodeIdForEndpoint(bEndpoint);
            if (!aKey || !bKey) return;
            const rackA = getEndpointRackKey(aEndpoint);
            const rackB = getEndpointRackKey(bEndpoint);
            const useShort = rackA && rackB && rackA === rackB;
            const label = useShort
                ? `${getShortEndpointLabel(aEndpoint)} ↔ ${getShortEndpointLabel(bEndpoint)}`
                : `${getDiffEndpointLabel(aEndpoint, bEndpoint)} ↔ ${getDiffEndpointLabel(bEndpoint, aEndpoint)}`;
            edges.push({ type, aKey, bKey, label, medium });
        };

        const displayPaths = [];
        if (showPanelNodes) {
            paths.forEach((path) => {
                const endpoints = path.pathNodes
                    .map((key) => endpointLookup.get(key))
                    .filter(Boolean);
                if (endpoints.length) displayPaths.push(endpoints);
                path.pathEdges.forEach((edge, edgeIndex) => {
                    const aEndpoint = endpointLookup.get(path.pathNodes[edgeIndex]);
                    const bEndpoint = endpointLookup.get(path.pathNodes[edgeIndex + 1]);
                    if (!aEndpoint || !bEndpoint) return;
                    addEdgeByEndpoints(aEndpoint, bEndpoint, edge.type, edge.medium || null);
                });
            });
            if (selectionActive) {
                endpointLookup.forEach((endpoint, key) => {
                    if (endpoint?.type !== 'device') return;
                    const degree = adjacency.get(key)?.length || 0;
                    if (degree === 0) {
                        displayPaths.push([endpoint]);
                    }
                });
            }
        } else {
            const deviceKeys = Array.from(endpointLookup.keys()).filter((key) => {
                const endpoint = endpointLookup.get(key);
                return endpoint?.type === 'device';
            });

            const deviceEdgesMap = new Map();
            const addDeviceEdge = (aKey, bKey) => {
                if (aKey === bKey) return;
                const key = [aKey, bKey].sort().join('|');
                if (deviceEdgesMap.has(key)) return;
                const aEndpoint = endpointLookup.get(aKey);
                const bEndpoint = endpointLookup.get(bKey);
                if (!aEndpoint || !bEndpoint) return;
                deviceEdgesMap.set(key, {
                    aEndpoint,
                    bEndpoint
                });
            };

            deviceKeys.forEach((startKey) => {
                const visited = new Set([startKey]);
                const queue = [startKey];
                while (queue.length) {
                    const currentKey = queue.shift();
                    const neighbors = adjacency.get(currentKey) || [];
                    neighbors.forEach(({ other }) => {
                        if (visited.has(other)) return;
                        const endpoint = endpointLookup.get(other);
                        if (!endpoint) return;
                        if (endpoint.type === 'panel') {
                            visited.add(other);
                            queue.push(other);
                            return;
                        }
                        if (endpoint.type === 'device') {
                            addDeviceEdge(startKey, other);
                            visited.add(other);
                        }
                    });
                }
            });

            const deviceEdges = Array.from(deviceEdgesMap.values());
            deviceEdges.forEach(({ aEndpoint, bEndpoint }) => {
                addEdgeByEndpoints(aEndpoint, bEndpoint, 'device-device');
            });

            const deviceAdj = new Map();
            deviceEdges.forEach(({ aEndpoint, bEndpoint }) => {
                const aKey = endpointKey(aEndpoint);
                const bKey = endpointKey(bEndpoint);
                if (!deviceAdj.has(aKey)) deviceAdj.set(aKey, new Set());
                if (!deviceAdj.has(bKey)) deviceAdj.set(bKey, new Set());
                deviceAdj.get(aKey).add(bKey);
                deviceAdj.get(bKey).add(aKey);
            });

            const visitedDevices = new Set();
            deviceKeys.forEach((deviceKey) => {
                if (visitedDevices.has(deviceKey)) return;
                const stack = [deviceKey];
                const component = [];
                visitedDevices.add(deviceKey);
                while (stack.length) {
                    const key = stack.pop();
                    const endpoint = endpointLookup.get(key);
                    if (endpoint) component.push(endpoint);
                    const neighbors = deviceAdj.get(key) || new Set();
                    neighbors.forEach((neighbor) => {
                        if (!visitedDevices.has(neighbor)) {
                            visitedDevices.add(neighbor);
                            stack.push(neighbor);
                        }
                    });
                }
                if (component.length) {
                    component.sort((a, b) => getGraphEndpointLabel(a).localeCompare(getGraphEndpointLabel(b)));
                    displayPaths.push(component);
                }
            });
            if (selectionActive) {
                deviceKeys.forEach((deviceKey) => {
                    const degree = deviceAdj.get(deviceKey)?.size || 0;
                    if (degree === 0) {
                        const endpoint = endpointLookup.get(deviceKey);
                        if (endpoint) displayPaths.push([endpoint]);
                    }
                });
            }
        }


        const uniqueEdgesMap = new Map();
        edges.forEach((edge) => {
            const key = [edge.aKey, edge.bKey].sort().join('|');
            if (!uniqueEdgesMap.has(key)) {
                uniqueEdgesMap.set(key, edge);
            }
        });
        const uniqueEdges = Array.from(uniqueEdgesMap.values());

        const panelList = Array.from(panelNodeMap.values());
        const deviceList = Array.from(deviceNodeMap.values());

        const rowHeight = 60;
        const nodeHeight = 21;
        const nodeWidth = 180;
        const columnGap = 60;
        const startX = 40;

        const getGroupKey = (endpoint) => {
            if (!endpoint) return 'unknown';
            if (endpoint.type === 'panel') {
                return `panel:${endpoint.panelId}`;
            }
            const devicePanel = graphDevicePanelById.get(endpoint.panelId);
            const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
            return `device:${parentItemId}`;
        };

        const getGroupLabel = (endpoint) => {
            if (!endpoint) return '';
            if (endpoint.type === 'panel') {
                const meta = graphPanelMeta[String(endpoint.panelId)];
                const panelItem = graphItemById.get(endpoint.panelId);
                const name = panelItem?.name || meta?.name || `Panel ${endpoint.panelId}`;
                const locationName = meta?.location_name;
                const buildingName = meta?.building_name;
                const roomName = meta?.room_name;
                const rackName = meta?.rack_name;
                const lines = [`Panel: ${name}`];
                if (locationName) lines.push(`Lokalizacja: ${locationName}`);
                if (buildingName) lines.push(`Budynek: ${buildingName}`);
                if (roomName) lines.push(`Pomieszczenie: ${roomName}`);
                if (rackName) lines.push(`Szafa: ${rackName}`);
                return lines.join('\n');
            }
            const devicePanel = graphDevicePanelById.get(endpoint.panelId);
            const parentItemId = devicePanel?.parent_item_id || endpoint.panelId;
            const parentItem = graphItemById.get(parentItemId) || graphItemById.get(String(parentItemId));
            const placeholderType = endpoint.placeholderType || parentItem?.type;
            const typeLabel = placeholderType === 'server' ? 'Serwer' : 'Urządzenie';
            const name = endpoint.placeholderName || parentItem?.name || `Urządzenie ${parentItemId}`;
            const rackMeta = parentItem?.rack_id ? graphRackMetaById?.[parentItem.rack_id] : null;
            const locationName = endpoint.locationName || rackMeta?.location_name;
            const buildingName = endpoint.buildingName || rackMeta?.building_name;
            const roomName = endpoint.roomName || rackMeta?.room_name;
            const rackName = endpoint.rackName || rackMeta?.name;
            const lines = [`${typeLabel}: ${name}`];
            const ipv4Value = endpoint.ipv4 || parentItem?.ipv4;
            if (ipv4Value) lines.push(`IPv4: ${ipv4Value}`);
            const hostnameValue = endpoint.hostname || parentItem?.hostname;
            if (hostnameValue) lines.push(`Hostname: ${hostnameValue}`);
            const ownerValue = endpoint.owner || parentItem?.owner;
            if (ownerValue) lines.push(`Opiekun: ${ownerValue}`);
            if (locationName) lines.push(`Lokalizacja: ${locationName}`);
            if (buildingName) lines.push(`Budynek: ${buildingName}`);
            if (roomName) lines.push(`Pomieszczenie: ${roomName}`);
            if (rackName) lines.push(`Szafa: ${rackName}`);
            return lines.join('\n');
        };

        const groupOrder = new Map();
        const groupLabels = new Map();
        const nodeGroupMap = new Map();
        displayPaths.forEach((pathEndpoints) => {
            pathEndpoints.forEach((endpoint) => {
                const groupKey = getGroupKey(endpoint);
                if (!groupOrder.has(groupKey)) {
                    groupOrder.set(groupKey, groupOrder.size);
                }
                if (!groupLabels.has(groupKey)) {
                    groupLabels.set(groupKey, getGroupLabel(endpoint));
                }
            });
        });

        const positions = new Map();
        const orderedNodeIds = [];
        const seenNodes = new Set();
        displayPaths.forEach((pathEndpoints) => {
            pathEndpoints.forEach((endpoint) => {
                const instanceKey = getNodeIdForEndpoint(endpoint);
                if (!instanceKey || seenNodes.has(instanceKey)) return;
                seenNodes.add(instanceKey);
                orderedNodeIds.push(instanceKey);
                nodeGroupMap.set(instanceKey, getGroupKey(endpoint));
            });
        });

        orderedNodeIds.forEach((instanceKey, index) => {
            positions.set(instanceKey, {
                x: startX,
                y: 40 + index * rowHeight,
                width: nodeWidth,
                height: nodeHeight
            });
        });

        const height = Math.max(1, orderedNodeIds.length) * rowHeight + 240;
        const width = startX * 2 + nodeWidth + 400;

        const groups = Array.from(groupOrder.keys()).map((groupKey) => ({
            id: groupKey,
            label: groupLabels.get(groupKey) || groupKey,
            memberIds: Array.from(nodeGroupMap.entries())
                .filter(([, key]) => key === groupKey)
                .map(([nodeId]) => nodeId),
            labelPos: groupLabelPositions[groupKey] || null
        }));

        return {
            panelList,
            deviceList,
            edges: uniqueEdges,
            positions,
            width,
            height,
            groups,
            nodeGroupMap
        };
    }, [
        connectionsOverview,
        graphDevicePanelById,
        graphDevicePanelPathMap,
        graphItemById,
        graphPanelMeta,
        graphPanelPortTargets,
        graphPanelConnections,
        graphRackMetaById,
        showPanelNodes,
        groupLabelPositions,
        globalGraphData,
        selectedItemIdSet,
        selectedItemIds
    ]);

    const graph = computedConnectionsGraph;

    const mergedGraphPositions = useMemo(() => {
        const merged = new Map(graph.positions);
        Object.entries(graphPositions).forEach(([key, pos]) => {
            if (!pos) return;
            merged.set(key, { ...merged.get(key), ...pos });
        });
        return merged;
    }, [graph.positions, graphPositions]);

    const graphBounds = useMemo(() => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const pos of mergedGraphPositions.values()) {
            if (!pos) continue;
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + pos.width);
            maxY = Math.max(maxY, pos.y + pos.height);
        }

        diagramRects.forEach((rect) => {
            if (!rect) return;
            minX = Math.min(minX, rect.x);
            minY = Math.min(minY, rect.y);
            maxX = Math.max(maxX, rect.x + rect.width);
            maxY = Math.max(maxY, rect.y + rect.height);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
            return { x: 0, y: 0, width: graph.width, height: graph.height };
        }

        const padding = 120;
        return {
            x: Math.floor(minX - padding),
            y: Math.floor(minY - padding),
            width: Math.ceil(maxX - minX + padding * 2),
            height: Math.ceil(maxY - minY + padding * 2)
        };
    }, [mergedGraphPositions, diagramRects, graph.width, graph.height]);

    const getSvgPoint = (event) => {
        const svg = connectionsSvgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX + viewBox.x,
            y: (event.clientY - rect.top) * scaleY + viewBox.y
        };
    };

    const getSvgScale = () => {
        const svg = connectionsSvgRef.current;
        if (!svg) return { scaleX: 1, scaleY: 1 };
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        return {
            scaleX: viewBox.width / rect.width,
            scaleY: viewBox.height / rect.height
        };
    };

    const getGraphPoint = (event) => {
        const point = getSvgPoint(event);
        return {
            x: (point.x - graphPan.x) / graphZoom,
            y: (point.y - graphPan.y) / graphZoom
        };
    };

    const handleNodeMouseDown = (nodeId, event) => {
        if (!isEditUnlocked) return;
        hasUserInteractionRef.current = true;
        const pos = mergedGraphPositions.get(nodeId);
        if (!pos) return;
        const point = getGraphPoint(event);
        setDraggingNode({
            id: nodeId,
            startPointX: point.x,
            startPointY: point.y,
            startNodeX: pos.x,
            startNodeY: pos.y,
            width: pos.width,
            height: pos.height
        });
        event.preventDefault();
    };

    const handleGroupMouseDown = (groupId, event) => {
        if (!isEditUnlocked) return;
        hasUserInteractionRef.current = true;
        const group = graph.groups?.find((g) => g.id === groupId);
        if (!group || !group.memberIds?.length) return;
        const point = getGraphPoint(event);
        const members = group.memberIds
            .map((id) => {
                const pos = mergedGraphPositions.get(id);
                if (!pos) return null;
                return { id, x: pos.x, y: pos.y, width: pos.width, height: pos.height };
            })
            .filter(Boolean);
        if (members.length === 0) return;
        setDraggingGroup({
            id: groupId,
            startX: point.x,
            startY: point.y,
            members,
            labelPos: group.labelPos ? { ...group.labelPos } : null
        });
        event.preventDefault();
    };

    const handleRectMouseDown = (rectId, event) => {
        if (!isEditUnlocked) return;
        hasUserInteractionRef.current = true;
        const rect = diagramRects.find((item) => item.id === rectId);
        if (!rect) return;
        const point = getGraphPoint(event);
        setDraggingRect({
            id: rectId,
            startPointX: point.x,
            startPointY: point.y,
            startRectX: rect.x,
            startRectY: rect.y
        });
        event.preventDefault();
    };

    const handleRectResizeMouseDown = (rectId, event) => {
        if (!isEditUnlocked) return;
        hasUserInteractionRef.current = true;
        const rect = diagramRects.find((item) => item.id === rectId);
        if (!rect) return;
        const point = getGraphPoint(event);
        setResizingRect({
            id: rectId,
            startX: point.x,
            startY: point.y,
            startW: rect.width,
            startH: rect.height
        });
        event.preventDefault();
    };

    const handleSvgMouseDown = (event) => {
        hasUserInteractionRef.current = true;
        if (isEditUnlocked && event.target !== event.currentTarget) return;
        const point = getSvgPoint(event);
        const { scaleX, scaleY } = getSvgScale();
        const panScaleX = scaleX > 0 ? scaleY / scaleX : 1;
        setPanning({
            startX: point.x,
            startY: point.y,
            startPanX: graphPan.x,
            startPanY: graphPan.y,
            panScaleX
        });
    };

    const dragSpeedXPanels = 4;
    const dragSpeedXNoPanels = 2.5;

    const handleSvgMouseMove = (event) => {
        const dragSpeedX = showPanels ? dragSpeedXPanels : dragSpeedXNoPanels;
        const rect = connectionsSvgRef.current?.getBoundingClientRect();
        const panSpeedX = rect?.width
            ? Math.min(2, Math.max(0.5, 1000 / rect.width))
            : 1;
        const scheduleMove = (fn) => {
            movePendingRef.current = fn;
            if (moveRafRef.current) return;
            moveRafRef.current = requestAnimationFrame(() => {
                moveRafRef.current = null;
                const pending = movePendingRef.current;
                movePendingRef.current = null;
                if (pending) pending();
            });
        };
        if (resizingRect) {
            if (!isEditUnlocked) return;
            const point = getGraphPoint(event);
            const dx = point.x - resizingRect.startX;
            const dy = point.y - resizingRect.startY;
            const nextW = Math.max(40, resizingRect.startW + dx);
            const nextH = Math.max(30, resizingRect.startH + dy);
            scheduleMove(() => {
                setDiagramRects((prev) =>
                    prev.map((rect) =>
                        rect.id === resizingRect.id
                            ? {
                                ...rect,
                                width: nextW,
                                height: nextH
                            }
                            : rect
                    )
                );
            });
            return;
        }
        if (draggingRect) {
            if (!isEditUnlocked) return;
            const point = getGraphPoint(event);
            const dx = (point.x - draggingRect.startPointX) * dragSpeedX;
            const nextX = draggingRect.startRectX + dx;
            const nextY = draggingRect.startRectY + (point.y - draggingRect.startPointY);
            scheduleMove(() => {
                setDiagramRects((prev) =>
                    prev.map((rect) =>
                        rect.id === draggingRect.id
                            ? { ...rect, x: nextX, y: nextY }
                            : rect
                    )
                );
            });
            return;
        }
        if (draggingGroup) {
            if (!isEditUnlocked) return;
            const point = getGraphPoint(event);
            const dx = (point.x - draggingGroup.startX) * dragSpeedX;
            const dy = point.y - draggingGroup.startY;
            scheduleMove(() => {
                setGraphPositions((prev) => {
                    const next = { ...prev };
                    draggingGroup.members.forEach((member) => {
                        next[member.id] = {
                            x: member.x + dx,
                            y: member.y + dy,
                            width: member.width,
                            height: member.height
                        };
                    });
                    return next;
                });
                if (draggingGroup.labelPos) {
                    setGroupLabelPositions((prev) => ({
                        ...prev,
                        [draggingGroup.id]: {
                            x: draggingGroup.labelPos.x + dx,
                            y: draggingGroup.labelPos.y + dy
                        }
                    }));
                }
            });
            return;
        }
        if (draggingNode) {
            if (!isEditUnlocked) return;
            const point = getGraphPoint(event);
            let nextX = draggingNode.startNodeX + (point.x - draggingNode.startPointX) * dragSpeedX;
            let nextY = draggingNode.startNodeY + (point.y - draggingNode.startPointY);
            if (draggingNode.isGroupLabel && draggingNode.groupId) {
                const group = graph.groups?.find((g) => g.id === draggingNode.groupId);
                if (group) {
                    const members = group.memberIds || [];
                    let minX = Infinity;
                    let minY = Infinity;
                    let maxX = -Infinity;
                    let maxY = -Infinity;
                    members.forEach((id) => {
                        const pos = mergedGraphPositions.get(id);
                        if (!pos) return;
                        minX = Math.min(minX, pos.x);
                        minY = Math.min(minY, pos.y);
                        maxX = Math.max(maxX, pos.x + pos.width);
                        maxY = Math.max(maxY, pos.y + pos.height);
                    });
                    if (Number.isFinite(minX)) {
                        const padding = 18;
                        let labelX = group.labelPos?.x ?? minX + (maxX - minX) / 2 - draggingNode.width / 2;
                        let labelY = group.labelPos?.y ?? minY - padding + 8;
                        minX = Math.min(minX, labelX);
                        minY = Math.min(minY, labelY);
                        maxX = Math.max(maxX, labelX + draggingNode.width);
                        maxY = Math.max(maxY, labelY + draggingNode.height);
                        const baseX = minX - padding;
                        const baseY = minY - padding;
                        const baseW = maxX - minX + padding * 2;
                        const baseH = maxY - minY + padding * 2;
                        const maxLabelX = baseX + baseW - draggingNode.width;
                        const maxLabelY = baseY + baseH - draggingNode.height;
                        nextX = Math.min(Math.max(nextX, baseX), maxLabelX);
                        nextY = Math.min(Math.max(nextY, baseY), maxLabelY);
                    }
                }
                const labelX = nextX;
                const labelY = nextY;
                scheduleMove(() => {
                    setGroupLabelPositions((prev) => ({
                        ...prev,
                        [draggingNode.groupId]: { x: labelX, y: labelY }
                    }));
                });
            } else {
                const nodeX = nextX;
                const nodeY = nextY;
                scheduleMove(() => {
                    setGraphPositions((prev) => ({
                        ...prev,
                        [draggingNode.id]: {
                            x: nodeX,
                            y: nodeY,
                            width: draggingNode.width,
                            height: draggingNode.height
                        }
                    }));
                });
            }
            return;
        }
        if (!panning) return;
        const point = getSvgPoint(event);
        const panX = panning.startPanX + (point.x - panning.startX) * (panning.panScaleX || 1) * panSpeedX;
        const panY = panning.startPanY + (point.y - panning.startY);
        scheduleMove(() => {
            setGraphPan({
                x: panX,
                y: panY
            });
        });
    };

    const handleSvgMouseUp = () => {
        if (draggingNode) {
            setDraggingNode(null);
        }
        if (draggingGroup) {
            setDraggingGroup(null);
        }
        if (draggingRect) {
            setDraggingRect(null);
        }
        if (resizingRect) {
            setResizingRect(null);
        }
        if (panning) {
            setPanning(null);
        }
    };

    const handleSvgWheel = (event) => {
        hasUserInteractionRef.current = true;
        event.preventDefault();
        const svg = connectionsSvgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const cursorX = (event.clientX - rect.left) * scaleX + viewBox.x;
        const cursorY = (event.clientY - rect.top) * scaleY + viewBox.y;

        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = Math.min(8, Math.max(0.15, graphZoom * zoomFactor));
        const zoomRatio = nextZoom / graphZoom;

        setGraphPan((prev) => ({
            x: cursorX - (cursorX - prev.x) * zoomRatio,
            y: cursorY - (cursorY - prev.y) * zoomRatio
        }));
        setGraphZoom(nextZoom);
    };

    useEffect(() => {
        const svg = connectionsSvgRef.current;
        if (!svg) return undefined;
        const handleWheel = (event) => handleSvgWheel(event);
        svg.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            svg.removeEventListener('wheel', handleWheel);
        };
    }, [handleSvgWheel]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            const isTypingTarget =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);
            if (isTypingTarget) return;
            const step = event.shiftKey ? 80 : 40;
            let dx = 0;
            let dy = 0;
            if (event.key === 'ArrowLeft') dx = step;
            if (event.key === 'ArrowRight') dx = -step;
            if (event.key === 'ArrowUp') dy = step;
            if (event.key === 'ArrowDown') dy = -step;
            if (dx === 0 && dy === 0) return;
            event.preventDefault();
            setGraphPan((prev) => ({
                x: prev.x + dx,
                y: prev.y + dy
            }));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isEditUnlocked) return;
        setDraggingNode(null);
        setDraggingGroup(null);
        setDraggingRect(null);
        setResizingRect(null);
        setPanning(null);
    }, [isEditUnlocked]);

    const resetConnectionsLayout = () => {
        setGraphPositions({});
        setGraphPan({ x: 0, y: 0 });
        setGraphZoom(1);
        setDraggingNode(null);
        setDraggingGroup(null);
        setDraggingRect(null);
        setResizingRect(null);
        setPanning(null);
        if (token) {
            apiRequest(`/api/diagram-layouts-global/${resolvedLayoutKey}`, {
                method: 'DELETE',
                token
            }).catch(() => { });
        }
    };

    const openRectForm = (rect) => {
        setRectFormOpen(true);
        setRectEditingId(rect?.id || null);
        setRectForm({
            name: rect?.name || '',
            layer: rect?.layer || 5,
            color: rect?.color || '#93c5fd'
        });
    };

    const addDiagramRect = () => {
        const id = `rect-${Date.now()}`;
        const newRect = {
            id,
            name: 'Nowy prostokąt',
            layer: 5,
            color: '#93c5fd',
            x: 40,
            y: 40,
            width: 220,
            height: 140
        };
        setDiagramRects((prev) => [...prev, newRect]);
        openRectForm(newRect);
    };

    const saveRectForm = () => {
        const layerValue = Math.min(10, Math.max(1, Number(rectForm.layer) || 1));
        if (rectEditingId) {
            setDiagramRects((prev) =>
                prev.map((rect) =>
                    rect.id === rectEditingId
                        ? { ...rect, name: rectForm.name.trim() || rect.name, layer: layerValue, color: rectForm.color }
                        : rect
                )
            );
        }
        setRectFormOpen(false);
        setRectEditingId(null);
    };

    const removeRect = () => {
        if (!rectEditingId) return;
        setDiagramRects((prev) => prev.filter((rect) => rect.id !== rectEditingId));
        setRectFormOpen(false);
        setRectEditingId(null);
    };

    const getGroupLabelPlacement = (group, members) => {
        if (!members.length) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        members.forEach((id) => {
            const pos = mergedGraphPositions.get(id);
            if (!pos) return;
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + pos.width);
            maxY = Math.max(maxY, pos.y + pos.height);
        });
        if (!Number.isFinite(minX)) return null;

        const labelLines = (group.label || '').split('\n');
        const lineHeight = 14;
        const labelHeight = Math.max(1, labelLines.length) * lineHeight + 8;
        const labelTextLength = Math.max(...labelLines.map((l) => l.length), 0);
        const labelWidth = Math.max(120, Math.min(480, labelTextLength * 9 + 32));
        const padding = 18;

        let labelNodeX = minX + (maxX - minX) / 2 - labelWidth / 2;
        let labelNodeY = minY - padding + 8;
        if (group.labelPos && typeof group.labelPos.x === 'number' && typeof group.labelPos.y === 'number') {
            const baseX = minX - padding;
            const baseY = minY - padding - labelHeight;
            const baseW = maxX - minX + padding * 2;
            const baseH = maxY - minY + padding * 2 + labelHeight;
            const maxLabelX = baseX + baseW - labelWidth;
            const maxLabelY = baseY + baseH - labelHeight;
            labelNodeX = Math.min(Math.max(group.labelPos.x, baseX), maxLabelX);
            labelNodeY = Math.min(Math.max(group.labelPos.y, baseY), maxLabelY);
        }

        const rectX = minX - padding;
        const rectY = minY - padding;
        const rectW = maxX - minX + padding * 2;
        const rectH = maxY - minY + padding * 2;

        return {
            labelLines,
            labelWidth,
            labelHeight,
            labelNodeX,
            labelNodeY,
            rectX,
            rectY,
            rectW,
            rectH
        };
    };
    const selectedCount = selectedItemIdSet.size;
    const selectionActive = selectedCount > 0;
    return (
        <div className="card connections-list-card">
            <div className="modal-header">
                <h3>Schemat połączeń</h3>
                <button
                    className={isEditUnlocked ? 'danger' : 'primary'}
                    type="button"
                    onClick={() => setIsEditUnlocked((prev) => !prev)}
                >
                    {isEditUnlocked ? 'Zablokuj edycję' : 'Odblokuj edycję'}
                </button>
                <button
                    className="secondary"
                    type="button"
                    onClick={addDiagramRect}
                    disabled={!isEditUnlocked}
                >
                    Dodaj prostokąt
                </button>
                <button
                    className="secondary"
                    type="button"
                    onClick={resetConnectionsLayout}
                >
                    Reset układu
                </button>
            </div>
            {rectFormOpen && (
                <div className="connections-rect-form">
                    <label>
                        Nazwa
                        <input
                            value={rectForm.name}
                            onChange={(e) => setRectForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                    </label>
                    <label>
                        Warstwa (1-10)
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={rectForm.layer}
                            onChange={(e) => setRectForm((prev) => ({ ...prev, layer: e.target.value }))}
                        />
                    </label>
                    <label>
                        Kolor
                        <input
                            type="color"
                            value={rectForm.color}
                            onChange={(e) => setRectForm((prev) => ({ ...prev, color: e.target.value }))}
                        />
                    </label>
                    <div className="actions">
                        <button className="secondary" type="button" onClick={() => setRectFormOpen(false)}>
                            Anuluj
                        </button>
                        {rectEditingId && (
                            <button className="danger" type="button" onClick={removeRect}>
                                Usuń
                            </button>
                        )}
                        <button className="primary" type="button" onClick={saveRectForm}>
                            Zapisz
                        </button>
                    </div>
                </div>
            )}
            <div className="connections-graph">
                {globalGraphLoading ? (
                    <p>Ładowanie schematu...</p>
                ) : globalGraphError ? (
                    <p className="error">{globalGraphError}</p>
                ) : selectionActive && selectedCount === 0 ? (
                    <p>Brak wybranych urządzeń.</p>
                ) : graph.edges.length === 0 && graph.panelList.length === 0 && graph.deviceList.length === 0 ? (
                    <p>{selectionActive ? 'Brak połączeń dla wybranych urządzeń.' : 'Brak połączeń.'}</p>
                ) : (
                    <svg
                        viewBox={`${-400} ${-400} ${graph.width + 800} ${graph.height + 800}`}
                        className={`connections-svg${draggingNode || panning ? ' is-dragging' : ''}${!isEditUnlocked ? ' is-locked' : ''}`}
                        ref={connectionsSvgRef}
                        onMouseDown={handleSvgMouseDown}
                        onMouseMove={handleSvgMouseMove}
                        onMouseUp={handleSvgMouseUp}
                        onMouseLeave={handleSvgMouseUp}
                        onWheel={undefined}
                    >
                        <g transform={`translate(${graphPan.x} ${graphPan.y}) scale(${graphZoom})`}>
                            {diagramRects
                                .slice()
                                .sort((a, b) => (a.layer || 1) - (b.layer || 1))
                                .map((rect) => (
                                    <g key={`overlay-${rect.id}`}>
                                        <rect
                                            x={rect.x}
                                            y={rect.y}
                                            width={rect.width}
                                            height={rect.height}
                                            rx="8"
                                            className="diagram-overlay-rect"
                                            style={{
                                                fill: rect.color,
                                                fillOpacity: 0.25,
                                                stroke: rect.color
                                            }}
                                            onMouseDown={(event) => handleRectMouseDown(rect.id, event)}
                                        />
                                        <text
                                            x={rect.x + 8}
                                            y={rect.y + 16}
                                            className="diagram-overlay-label"
                                            onMouseDown={(event) => {
                                                if (isEditUnlocked) {
                                                    event.stopPropagation();
                                                }
                                            }}
                                            onClick={(event) => {
                                                if (!isEditUnlocked) return;
                                                event.stopPropagation();
                                                openRectForm(rect);
                                            }}
                                        >
                                            {rect.name}
                                        </text>
                                        <rect
                                            x={rect.x + rect.width - 10}
                                            y={rect.y + rect.height - 10}
                                            width={10}
                                            height={10}
                                            className="diagram-overlay-handle"
                                            style={{ fill: rect.color }}
                                            onMouseDown={(event) => handleRectResizeMouseDown(rect.id, event)}
                                        />
                                    </g>
                                ))}
                            {graph.groups?.map((group) => {
                                const members = group.memberIds || [];
                                if (members.length === 0) return null;
                                const placement = getGroupLabelPlacement(group, members);
                                if (!placement) return null;
                                return (
                                    <g key={`group-bg-${group.id}`} onMouseDown={(event) => handleGroupMouseDown(group.id, event)}>
                                        <rect
                                            x={placement.rectX}
                                            y={placement.rectY}
                                            width={placement.rectW}
                                            height={placement.rectH}
                                            rx="6"
                                            className="connections-group"
                                        />
                                    </g>
                                );
                            })}
                            {graph.edges.map((edge, idx) => {
                                const aPos = mergedGraphPositions.get(edge.aKey);
                                const bPos = mergedGraphPositions.get(edge.bKey);
                                if (!aPos || !bPos) return null;
                                const aCx = aPos.x + aPos.width / 2;
                                const aCy = aPos.y + aPos.height / 2;
                                const bCx = bPos.x + bPos.width / 2;
                                const bCy = bPos.y + bPos.height / 2;
                                const dx = bCx - aCx;
                                const dy = bCy - aCy;
                                const len = Math.hypot(dx, dy) || 1;
                                const ux = dx / len;
                                const uy = dy / len;
                                const aHalfW = aPos.width / 2;
                                const aHalfH = aPos.height / 2;
                                const bHalfW = bPos.width / 2;
                                const bHalfH = bPos.height / 2;
                                const aOffset = Math.min(aHalfW, aHalfH) + 2;
                                const bOffset = Math.min(bHalfW, bHalfH) + 2;
                                const ax = aCx + ux * aOffset;
                                const ay = aCy + uy * aOffset;
                                const bx = bCx - ux * bOffset;
                                const by = bCy - uy * bOffset;
                                const curveOffset = Math.min(120, len / 2);
                                const c1x = ax + ux * curveOffset;
                                const c1y = ay + uy * curveOffset;
                                const c2x = bx - ux * curveOffset;
                                const c2y = by - uy * curveOffset;
                                const curve = `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`;
                                const labelOffset = ((idx % 6) - 2.5) * 10;
                                return (
                                    <g key={`edge-${idx}`}>
                                        <path
                                            d={curve}
                                            className={`connections-line${edge.type === 'panel-target' ? ' connections-line-target' : ''}${edge.medium ? ` connections-line-${edge.medium}` : ''}`}
                                        />
                                        <text x={(ax + bx) / 2} y={(ay + by) / 2 - 6 + labelOffset} className="connections-line-label">
                                            {edge.label}
                                        </text>
                                    </g>
                                );
                            })}
                            {graph.groups?.map((group) => {
                                const members = group.memberIds || [];
                                if (members.length === 0) return null;
                                const placement = getGroupLabelPlacement(group, members);
                                if (!placement) return null;
                                const handleLabelMouseDown = (event) => {
                                    if (!isEditUnlocked) return;
                                    event.stopPropagation();
                                    const point = getGraphPoint(event);
                                    setDraggingNode({
                                        id: `group-label-${group.id}`,
                                        startPointX: point.x,
                                        startPointY: point.y,
                                        startNodeX: placement.labelNodeX,
                                        startNodeY: placement.labelNodeY,
                                        width: placement.labelWidth,
                                        height: placement.labelHeight,
                                        groupId: group.id,
                                        isGroupLabel: true
                                    });
                                };
                                return (
                                    <g key={`group-label-${group.id}`}>
                                        <rect
                                            x={placement.labelNodeX}
                                            y={placement.labelNodeY}
                                            width={placement.labelWidth}
                                            height={placement.labelHeight}
                                            rx="6"
                                            className="connections-node group-label-node"
                                            onMouseDown={handleLabelMouseDown}
                                        />
                                        <text x={placement.labelNodeX + placement.labelWidth / 2} y={placement.labelNodeY + placement.labelHeight / 2 - (placement.labelLines.length - 1) * 6}
                                            className="connections-node-label" textAnchor="middle"
                                            onMouseDown={handleLabelMouseDown}
                                        >
                                            {placement.labelLines.map((line, idx) => (
                                                <tspan key={`${group.id}-label-${idx}`} x={placement.labelNodeX + placement.labelWidth / 2} dy={idx === 0 ? 0 : 12}>
                                                    {line}
                                                </tspan>
                                            ))}
                                        </text>
                                    </g>
                                );
                            })}
                            {graph.panelList.map((node) => {
                                const pos = mergedGraphPositions.get(node.id);
                                if (!pos) return null;
                                const lines = node.label.split('\n');
                                const centerX = pos.x + pos.width / 2;
                                const centerY = pos.y + pos.height / 2;
                                const startY = centerY - (lines.length - 1) * 6;
                                return (
                                    <g key={node.id} onMouseDown={(event) => handleNodeMouseDown(node.id, event)}>
                                        <rect
                                            x={pos.x}
                                            y={pos.y}
                                            width={pos.width}
                                            height={pos.height}
                                            rx="6"
                                            className="connections-node panel-node"
                                        />
                                        <text x={centerX} y={startY} className="connections-node-label" textAnchor="middle">
                                            {lines.map((line, idx) => (
                                                <tspan key={`${node.id}-line-${idx}`} x={centerX} dy={idx === 0 ? 0 : 12}>
                                                    {line}
                                                </tspan>
                                            ))}
                                        </text>
                                    </g>
                                );
                            })}
                            {graph.deviceList.map((node) => {
                                const pos = mergedGraphPositions.get(node.id);
                                if (!pos) return null;
                                const lines = node.label.split('\n');
                                const centerX = pos.x + pos.width / 2;
                                const centerY = pos.y + pos.height / 2;
                                const startY = centerY - (lines.length - 1) * 6;
                                return (
                                    <g key={node.id} onMouseDown={(event) => handleNodeMouseDown(node.id, event)}>
                                        <rect
                                            x={pos.x}
                                            y={pos.y}
                                            width={pos.width}
                                            height={pos.height}
                                            rx="6"
                                            className="connections-node device-node"
                                        />
                                        <text x={centerX} y={startY} className="connections-node-label" textAnchor="middle">
                                            {lines.map((line, idx) => (
                                                <tspan key={`${node.id}-line-${idx}`} x={centerX} dy={idx === 0 ? 0 : 12}>
                                                    {line}
                                                </tspan>
                                            ))}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                )}
            </div>
        </div>
    );
}

function App() {
    const [session, setSession] = useState(() => getSession());
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [view, setView] = useState('login');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedRack, setSelectedRack] = useState(null);
    const [selectedInfrastructureItems, setSelectedInfrastructureItems] = useState({});
    const [selectedPanelItems, setSelectedPanelItems] = useState({});
    const [pendingDeviceCable, setPendingDeviceCable] = useState(null);
    const [pendingPanelCable, setPendingPanelCable] = useState(null);
    const [allLocations, setAllLocations] = useState([]);
    const [buildingsQuery, setBuildingsQuery] = useState('');
    const [roomsQuery, setRoomsQuery] = useState('');
    const [racksQuery, setRacksQuery] = useState('');
    const [sfpInventoryQuery, setSfpInventoryQuery] = useState('');
    const [diskInventoryQuery, setDiskInventoryQuery] = useState('');
    const [showBuildingForm, setShowBuildingForm] = useState(false);
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [showRackForm, setShowRackForm] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const lastActivityRef = React.useRef(0);

    const selectionStorageKey = useMemo(() => {
        if (!user) return null;
        const userKey = user.id ? String(user.id) : user.username || 'unknown';
        return `selected-infrastructure:${userKey}`;
    }, [user]);

    const panelSelectionStorageKey = useMemo(() => {
        if (!user) return null;
        const userKey = user.id ? String(user.id) : user.username || 'unknown';
        return `selected-panels:${userKey}`;
    }, [user]);

    useEffect(() => {
        if (!selectionStorageKey) return;
        try {
            const raw = localStorage.getItem(selectionStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setSelectedInfrastructureItems(parsed);
            }
        } catch {
            // ignore
        }
    }, [selectionStorageKey]);

    useEffect(() => {
        if (!panelSelectionStorageKey) return;
        try {
            const raw = localStorage.getItem(panelSelectionStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setSelectedPanelItems(parsed);
            }
        } catch {
            // ignore
        }
    }, [panelSelectionStorageKey]);

    useEffect(() => {
        if (!selectionStorageKey) return;
        try {
            localStorage.setItem(
                selectionStorageKey,
                JSON.stringify(selectedInfrastructureItems || {})
            );
        } catch {
            // ignore
        }
    }, [selectionStorageKey, selectedInfrastructureItems]);

    useEffect(() => {
        if (!panelSelectionStorageKey) return;
        try {
            localStorage.setItem(
                panelSelectionStorageKey,
                JSON.stringify(selectedPanelItems || {})
            );
        } catch {
            // ignore
        }
    }, [panelSelectionStorageKey, selectedPanelItems]);

    const token = session?.token;
    const expiresAt = session?.expiresAt;

    const autoLogoutMs = useMemo(() => (expiresAt ? getRemainingMs(expiresAt) : 0), [expiresAt]);

    useEffect(() => {
        if (!token) return;
        let timeoutId;
        if (autoLogoutMs > 0) {
            timeoutId = setTimeout(() => handleLogout(), autoLogoutMs);
        } else {
            handleLogout();
        }
        return () => clearTimeout(timeoutId);
    }, [autoLogoutMs, token]);

    useEffect(() => {
        if (!token) return;
        apiRequest('/api/me', { token })
            .then((data) => {
                setUser(data);
                if (data.mustChangePassword) {
                    setView('change');
                } else {
                    setView((prev) => (prev === 'login' ? 'session' : prev));
                }
            })
            .catch(() => {
                handleLogout();
            });
    }, [token]);

    useEffect(() => {
        if (!token) return;
        apiRequest('/api/locations', { token })
            .then((data) => setAllLocations(data))
            .catch(() => { });
    }, [token]);

    useEffect(() => {
        if (!token) return;
        const handleActivity = async () => {
            const now = Date.now();
            if (now - lastActivityRef.current < 5000) return;
            lastActivityRef.current = now;
            if (refreshing) return;
            setRefreshing(true);
            try {
                const data = await apiRequest('/api/refresh', {
                    method: 'POST',
                    token
                });
                const newSession = { token: data.token, expiresAt: data.expiresAt };
                saveSession(newSession);
                setSession(newSession);
            } catch {
                handleLogout();
            } finally {
                setRefreshing(false);
            }
        };

        window.addEventListener('click', handleActivity);
        window.addEventListener('keydown', handleActivity);
        return () => {
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, [token, refreshing]);

    function handleLogout() {
        clearSession();
        setSession(null);
        setUser(null);
        setView('login');
        setError('');
        setSelectedLocation(null);
        setSelectedBuilding(null);
        setSelectedRoom(null);
        setSelectedRack(null);
        setPendingDeviceCable(null);
        setPendingPanelCable(null);
        setSelectedInfrastructureItems({});
        setSelectedPanelItems({});
        setShowBuildingForm(false);
        setShowRoomForm(false);
        setShowRackForm(false);
    }

    async function handleLogin(form) {
        setLoading(true);
        setError('');
        try {
            const data = await apiRequest('/api/login', {
                method: 'POST',
                body: form
            });
            const newSession = { token: data.token, expiresAt: data.expiresAt };
            saveSession(newSession);
            setSession(newSession);
            setUser({
                username: data.username,
                mustChangePassword: data.mustChangePassword,
                role: data.role,
                firstName: data.firstName || '',
                lastName: data.lastName || ''
            });
            setView(data.mustChangePassword ? 'change' : 'session');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleChangePassword(form) {
        setLoading(true);
        setError('');
        try {
            await apiRequest('/api/change-password', {
                method: 'POST',
                body: form,
                token
            });
            setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
            setView('session');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveProfile(profile) {
        setProfileSaving(true);
        try {
            const data = await apiRequest('/api/me', {
                method: 'PUT',
                body: {
                    firstName: profile.firstName,
                    lastName: profile.lastName
                },
                token
            });
            setUser((prev) =>
                prev
                    ? {
                        ...prev,
                        firstName: data.firstName || '',
                        lastName: data.lastName || ''
                    }
                    : prev
            );
        } catch (err) {
            throw err;
        } finally {
            setProfileSaving(false);
        }
    }

    const forceChange = user?.mustChangePassword;
    const showSessionCard = !!user && !!expiresAt && view !== 'login';
    const isAdmin = user?.role === 'admin';
    const inAdminView = (view === 'users' || view === 'audit-logs') && isAdmin;
    const locationPath = buildLocationPath(allLocations, selectedLocation?.id).join(' > ');
    const buildingsBreadcrumb = locationPath ? `Lokalizacje: ${locationPath}` : '';
    const roomsBreadcrumb = locationPath
        ? `Lokalizacje: ${locationPath} > Budynek: ${selectedBuilding?.name || ''}`
        : '';
    const racksBreadcrumb = locationPath
        ? `Lokalizacje: ${locationPath} > Budynek: ${selectedBuilding?.name || ''} > Pomieszczenie: ${selectedRoom?.name || ''}`
        : '';
    const networksBreadcrumb = 'Sieci';
    const infrastructureBreadcrumb = 'Sieci > Infrastruktura';
    const selectedInfrastructureIds = useMemo(
        () => Object.keys(selectedInfrastructureItems || {}),
        [selectedInfrastructureItems]
    );
    const selectedPanelIds = useMemo(
        () => Object.keys(selectedPanelItems || {}),
        [selectedPanelItems]
    );
    const selectedInfrastructureList = useMemo(
        () =>
            Object.values(selectedInfrastructureItems || {}).sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', 'pl')
            ),
        [selectedInfrastructureItems]
    );
    const selectedPanelList = useMemo(
        () =>
            Object.values(selectedPanelItems || {}).sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', 'pl')
            ),
        [selectedPanelItems]
    );
    const pageHeader =
        view === 'networks'
            ? { title: 'Sieci', breadcrumb: '' }
            : view === 'audit-logs'
                ? { title: 'Logi', breadcrumb: 'Administracja' }
                : view === 'sfp-inventory'
                    ? { title: 'Wkładki SFP', breadcrumb: networksBreadcrumb }
                    : view === 'disk-inventory'
                        ? { title: 'Dyski', breadcrumb: networksBreadcrumb }
                        : view === 'connections-panels'
                            ? { title: 'Schemat połączeń (z panelami)', breadcrumb: networksBreadcrumb }
                            : view === 'connections-no-panels'
                                ? { title: 'Schemat połączeń (bez paneli)', breadcrumb: networksBreadcrumb }
                                : view === 'connections-selected-panels'
                                    ? { title: 'Schemat wybranych urządzeń (z panelami)', breadcrumb: networksBreadcrumb }
                                    : view === 'connections-selected-no-panels'
                                        ? { title: 'Schemat wybranych urządzeń (bez paneli)', breadcrumb: networksBreadcrumb }
                                        : view === 'connections-selected-panels-only'
                                            ? { title: 'Schemat wybranych paneli', breadcrumb: networksBreadcrumb }
                                            : view === 'connections-panel-targets'
                                                ? { title: 'Schemat celów paneli', breadcrumb: networksBreadcrumb }
                                                : view === 'infrastructure'
                                                    ? { title: 'Infrastruktura', breadcrumb: networksBreadcrumb }
                                                    : view === 'buildings'
                                                        ? { title: 'Budynki', breadcrumb: buildingsBreadcrumb }
                                                        : view === 'rooms'
                                                            ? { title: 'Pomieszczenia', breadcrumb: roomsBreadcrumb }
                                                            : view === 'racks'
                                                                ? { title: 'Szafy serwerowe', breadcrumb: racksBreadcrumb }
                                                                : view === 'rack-view'
                                                                    ? { title: `Szafa: ${selectedRack?.name || ''}`, breadcrumb: racksBreadcrumb }
                                                                    : null;

    const headerControls =
        view === 'buildings'
            ? {
                backText: 'Wróć do lokalizacji',
                onBack: () => setView('infrastructure'),
                searchPlaceholder: 'Szukaj budynku... ',
                query: buildingsQuery,
                onQueryChange: setBuildingsQuery,
                onAdd: () => setShowBuildingForm(true),
                addText: 'Dodaj budynek'
            }
            : view === 'rooms'
                ? {
                    backText: 'Wróć do budynków',
                    onBack: () => setView('buildings'),
                    searchPlaceholder: 'Szukaj pomieszczenia... ',
                    query: roomsQuery,
                    onQueryChange: setRoomsQuery,
                    onAdd: () => setShowRoomForm(true),
                    addText: 'Dodaj pomieszczenie'
                }
                : view === 'racks'
                    ? {
                        backText: 'Wróć do pomieszczeń',
                        onBack: () => setView('rooms'),
                        searchPlaceholder: 'Szukaj szafy... ',
                        query: racksQuery,
                        onQueryChange: setRacksQuery,
                        onAdd: () => setShowRackForm(true),
                        addText: 'Dodaj szafę'
                    }
                    : view === 'rack-view'
                        ? {
                            backText: 'Wróć do szaf',
                            onBack: () => setView('racks')
                        }
                        : view === 'audit-logs'
                            ? {
                                backText: 'Wróć',
                                onBack: () => setView('session')
                            }
                            : view === 'networks'
                                ? {
                                    backText: 'Wróć',
                                    onBack: () => setView('session')
                                }
                                : view === 'sfp-inventory'
                                    ? {
                                        backText: 'Wróć do sieci',
                                        onBack: () => setView('networks'),
                                        searchPlaceholder: 'Szukaj typu, właściciela lub SN... ',
                                        query: sfpInventoryQuery,
                                        onQueryChange: setSfpInventoryQuery
                                    }
                                    : view === 'disk-inventory'
                                        ? {
                                            backText: 'Wróć do sieci',
                                            onBack: () => setView('networks'),
                                            searchPlaceholder: 'Szukaj nazwy, właściciela, rozmiaru, klauzuli, SN lub EN... ',
                                            query: diskInventoryQuery,
                                            onQueryChange: setDiskInventoryQuery
                                        }
                                        : view === 'connections-panels' || view === 'connections-no-panels' || view === 'connections-selected-panels' || view === 'connections-selected-no-panels' || view === 'connections-panel-targets' || view === 'connections-selected-panels-only'
                                            ? {
                                                backText: 'Wróć do sieci',
                                                onBack: () => setView('networks')
                                            }
                                            : view === 'infrastructure'
                                                ? {
                                                    backText: 'Wróć do sieci',
                                                    onBack: () => setView('networks')
                                                }
                                                : null;

    return (
        <div className={`page ${showSessionCard ? 'has-session' : ''}`}>
            {showSessionCard && (
                <SessionCard
                    username={user.username}
                    expiresAt={expiresAt}
                    onLogout={handleLogout}
                    onBack={inAdminView ? () => setView('session') : undefined}
                    isAdmin={isAdmin && !inAdminView}
                    pageTitle={pageHeader?.title}
                    breadcrumb={pageHeader?.breadcrumb}
                    headerControls={headerControls}
                />
            )}
            <div className={`content${view === 'connections-panels' || view === 'connections-no-panels' || view === 'connections-selected-panels' || view === 'connections-selected-no-panels' || view === 'connections-panel-targets' || view === 'connections-selected-panels-only' ? ' fullscreen-connections' : ''}`}>
                {view === 'login' && (
                    <LoginForm onLogin={handleLogin} error={error} loading={loading} />
                )}
                {view === 'change' && (
                    <ChangePasswordForm
                        onSubmit={handleChangePassword}
                        onCancel={() => setView('session')}
                        error={error}
                        loading={loading}
                        force={!!forceChange}
                        profile={{
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || ''
                        }}
                        onSaveProfile={handleSaveProfile}
                        profileSaving={profileSaving}
                    />
                )}
                {view === 'session' && user && expiresAt && (
                    <div className="dashboard">
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('networks')}
                        >
                            <h2>Sieci</h2>
                            <p>Zarządzanie infrastrukturą sieciową.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('change')}
                        >
                            <h2>Zarządzanie kontem</h2>
                            <p>Zmiana hasła i ustawienia konta.</p>
                        </button>
                        {isAdmin && (
                            <button
                                className="dashboard-tile"
                                type="button"
                                onClick={() => setView('users')}
                            >
                                <h2>Użytkownicy</h2>
                                <p>Zarządzanie kontami użytkowników.</p>
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                className="dashboard-tile"
                                type="button"
                                onClick={() => setView('audit-logs')}
                            >
                                <h2>Logi</h2>
                                <p>Podgląd odczytów i edycji w systemie.</p>
                            </button>
                        )}
                    </div>
                )}
                {view === 'audit-logs' && user && expiresAt && isAdmin && (
                    <div className="dashboard">
                        <AuditLogsManager token={token} />
                    </div>
                )}
                {view === 'networks' && user && expiresAt && (
                    <div className="dashboard">
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('infrastructure')}
                        >
                            <h2>Infrastruktura</h2>
                            <p>Lokalizacje, budynki, pomieszczenia i szafy.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('connections-panels')}
                        >
                            <h2>Schemat połączeń (z panelami)</h2>
                            <p>Pełny schemat z panelami pośrednimi.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('connections-no-panels')}
                        >
                            <h2>Schemat połączeń (bez paneli)</h2>
                            <p>Uproszczony schemat tylko urządzeń.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('connections-panel-targets')}
                        >
                            <h2>Schemat paneli</h2>
                            <p>Pokazuje tylko skonfigurowane panele.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('connections-selected-panels')}
                        >
                            <h2>Schemat wybranych urządzeń (z panelami)</h2>
                            <p>Pełny schemat tylko dla wybranych urządzeń.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('connections-selected-no-panels')}
                        >
                            <h2>Schemat wybranych urządzeń (bez paneli)</h2>
                            <p>Uproszczony schemat tylko dla wybranych urządzeń.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('connections-selected-panels-only')}
                        >
                            <h2>Schemat wybranych paneli</h2>
                            <p>Pokazuje tylko wybrane panele i ich połączenia.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('sfp-inventory')}
                        >
                            <h2>Wkładki SFP</h2>
                            <p>Lista modułów z wyszukiwaniem po typie, właścicielu i SN.</p>
                        </button>
                        <button
                            className="dashboard-tile"
                            type="button"
                            onClick={() => setView('disk-inventory')}
                        >
                            <h2>Dyski</h2>
                            <p>Lista dysków z wyszukiwaniem po danych technicznych.</p>
                        </button>
                        {selectedInfrastructureList.length > 0 && (
                            <div className="card">
                                <div className="modal-header">
                                    <h3>Wybrane urządzenia/serwery</h3>
                                    <button
                                        className="secondary"
                                        type="button"
                                        onClick={() => setSelectedInfrastructureItems({})}
                                    >
                                        Wyczyść listę
                                    </button>
                                </div>
                                <div className="selection-list">
                                    {selectedInfrastructureList.map((item) => (
                                        <div key={item.id} className="selection-row">
                                            <span>
                                                {item.name} ({item.type === 'server' ? 'Serwer' : 'Urządzenie'})
                                            </span>
                                            <span>
                                                {[
                                                    item.locationName ? `Lokalizacja: ${item.locationName}` : null,
                                                    item.buildingName ? `Budynek: ${item.buildingName}` : null,
                                                    item.roomName ? `Pomieszczenie: ${item.roomName}` : null,
                                                    item.rackName ? `Szafa: ${item.rackName}` : null
                                                ]
                                                    .filter(Boolean)
                                                    .join(' / ')}
                                            </span>
                                            <button
                                                className="secondary"
                                                type="button"
                                                onClick={() =>
                                                    setSelectedInfrastructureItems((prev) => {
                                                        const next = { ...(prev || {}) };
                                                        delete next[item.id];
                                                        return next;
                                                    })
                                                }
                                            >
                                                Usuń
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {selectedPanelList.length > 0 && (
                            <div className="card">
                                <div className="modal-header">
                                    <h3>Wybrane panele</h3>
                                    <button
                                        className="secondary"
                                        type="button"
                                        onClick={() => setSelectedPanelItems({})}
                                    >
                                        Wyczyść listę
                                    </button>
                                </div>
                                <div className="selection-list">
                                    {selectedPanelList.map((item) => (
                                        <div key={item.id} className="selection-row">
                                            <span>
                                                {item.name} (Panel)
                                            </span>
                                            <span>
                                                {[
                                                    item.locationName ? `Lokalizacja: ${item.locationName}` : null,
                                                    item.buildingName ? `Budynek: ${item.buildingName}` : null,
                                                    item.roomName ? `Pomieszczenie: ${item.roomName}` : null,
                                                    item.rackName ? `Szafa: ${item.rackName}` : null
                                                ]
                                                    .filter(Boolean)
                                                    .join(' / ')}
                                            </span>
                                            <button
                                                className="secondary"
                                                type="button"
                                                onClick={() =>
                                                    setSelectedPanelItems((prev) => {
                                                        const next = { ...(prev || {}) };
                                                        delete next[item.id];
                                                        return next;
                                                    })
                                                }
                                            >
                                                Usuń
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {view === 'sfp-inventory' && user && expiresAt && (
                    <div className="dashboard">
                        <SfpInventoryManager token={token} query={sfpInventoryQuery} />
                    </div>
                )}
                {view === 'disk-inventory' && user && expiresAt && (
                    <div className="dashboard">
                        <DiskInventoryManager token={token} query={diskInventoryQuery} />
                    </div>
                )}
                {view === 'connections-panels' && user && expiresAt && (
                    <div className="dashboard">
                        <ConnectionsGlobalManager token={token} showPanels layoutKey="connections-graph-panels" />
                    </div>
                )}
                {view === 'connections-no-panels' && user && expiresAt && (
                    <div className="dashboard">
                        <ConnectionsGlobalManager token={token} showPanels={false} layoutKey="connections-graph-no-panels" />
                    </div>
                )}
                {view === 'connections-selected-panels' && user && expiresAt && (
                    <div className="dashboard">
                        <ConnectionsGlobalManager
                            token={token}
                            showPanels
                            layoutKey="connections-selected-panels"
                            selectedItemIds={selectedInfrastructureIds}
                            selectedItemsMap={selectedInfrastructureItems}
                        />
                    </div>
                )}
                {view === 'connections-selected-no-panels' && user && expiresAt && (
                    <div className="dashboard">
                        <ConnectionsGlobalManager
                            token={token}
                            showPanels={false}
                            layoutKey="connections-selected-no-panels"
                            selectedItemIds={selectedInfrastructureIds}
                            selectedItemsMap={selectedInfrastructureItems}
                        />
                    </div>
                )}
                {view === 'connections-selected-panels-only' && user && expiresAt && (
                    <div className="dashboard">
                        <ConnectionsGlobalManager
                            token={token}
                            showPanels
                            layoutKey="connections-selected-panels-only"
                            edgeMode="selected-panels"
                            selectedItemIds={selectedPanelIds}
                            selectedItemsMap={selectedPanelItems}
                        />
                    </div>
                )}
                {view === 'connections-panel-targets' && user && expiresAt && (
                    <div className="dashboard">
                        <ConnectionsGlobalManager
                            token={token}
                            showPanels
                            layoutKey="connections-panel-targets"
                            edgeMode="panel-targets"
                        />
                    </div>
                )}
                {view === 'infrastructure' && user && expiresAt && (
                    <div className="dashboard">
                        <LocationsManager
                            token={token}
                            onOpenBuildings={(location) => {
                                setSelectedLocation(location);
                                setView('buildings');
                            }}
                        />
                    </div>
                )}
                {view === 'buildings' && user && expiresAt && selectedLocation && (
                    <div className="dashboard">
                        <BuildingsManager
                            token={token}
                            location={selectedLocation}
                            onBack={() => setView('session')}
                            breadcrumb={buildingsBreadcrumb}
                            onOpenRooms={(building) => {
                                setSelectedBuilding(building);
                                setView('rooms');
                            }}
                            query={buildingsQuery}
                            onQueryChange={setBuildingsQuery}
                            showForm={showBuildingForm}
                            setShowForm={setShowBuildingForm}
                        />
                    </div>
                )}
                {view === 'rooms' && user && expiresAt && selectedBuilding && (
                    <div className="dashboard">
                        <RoomsManager
                            token={token}
                            building={selectedBuilding}
                            onBack={() => setView('buildings')}
                            breadcrumb={roomsBreadcrumb}
                            onOpenRacks={(room) => {
                                setSelectedRoom(room);
                                setView('racks');
                            }}
                            query={roomsQuery}
                            onQueryChange={setRoomsQuery}
                            showForm={showRoomForm}
                            setShowForm={setShowRoomForm}
                        />
                    </div>
                )}
                {view === 'racks' && user && expiresAt && selectedRoom && (
                    <div className="dashboard">
                        <RacksManager
                            token={token}
                            room={selectedRoom}
                            onBack={() => setView('rooms')}
                            breadcrumb={racksBreadcrumb}
                            query={racksQuery}
                            onQueryChange={setRacksQuery}
                            showForm={showRackForm}
                            setShowForm={setShowRackForm}
                            onOpenRack={(rack) => {
                                setSelectedRack(rack);
                                setView('rack-view');
                            }}
                        />
                    </div>
                )}
                {view === 'rack-view' && user && expiresAt && selectedRack && (
                    <div className="dashboard">
                        <RackPreview
                            token={token}
                            rack={selectedRack}
                            location={selectedLocation}
                            building={selectedBuilding}
                            room={selectedRoom}
                            onBack={() => setView('racks')}
                            pendingDeviceCable={pendingDeviceCable}
                            setPendingDeviceCable={setPendingDeviceCable}
                            pendingPanelCable={pendingPanelCable}
                            setPendingPanelCable={setPendingPanelCable}
                            selectedInfrastructureItems={selectedInfrastructureItems}
                            setSelectedInfrastructureItems={setSelectedInfrastructureItems}
                            selectedPanelItems={selectedPanelItems}
                            setSelectedPanelItems={setSelectedPanelItems}
                        />
                    </div>
                )}
                {view === 'users' && isAdmin && (
                    <div className="dashboard">
                        <UsersManager token={token} currentUserId={user?.id} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
