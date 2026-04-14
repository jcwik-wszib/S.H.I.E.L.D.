const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, 'app.db');
let dbInstance = null;

async function getDb() {
    if (dbInstance) {
        return dbInstance;
    }

    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        dbInstance = new SQL.Database(fileBuffer);
    } else {
        dbInstance = new SQL.Database();
    }

    initSchema(dbInstance);
    return dbInstance;
}

function initSchema(db) {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
                        must_change_password INTEGER NOT NULL DEFAULT 1,
                        role TEXT NOT NULL DEFAULT 'user',
                        first_name TEXT,
                        last_name TEXT
    );
  `);

    db.run(`
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            FOREIGN KEY(parent_id) REFERENCES locations(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS buildings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location_id INTEGER NOT NULL,
            FOREIGN KEY(location_id) REFERENCES locations(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            building_id INTEGER NOT NULL,
            FOREIGN KEY(building_id) REFERENCES buildings(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS racks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            room_id INTEGER NOT NULL,
            height_u INTEGER NOT NULL DEFAULT 42,
            FOREIGN KEY(room_id) REFERENCES rooms(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS rack_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rack_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            start_u INTEGER NOT NULL,
            height_u INTEGER NOT NULL,
            port_count INTEGER,
            port_rows INTEGER NOT NULL DEFAULT 1,
            port_flow TEXT NOT NULL DEFAULT 'row',
               ipv4 TEXT,
               serial TEXT,
            hostname TEXT,
            owner TEXT,
            FOREIGN KEY(rack_id) REFERENCES racks(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS panel_ports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            panel_item_id INTEGER NOT NULL,
            port_number INTEGER NOT NULL,
            linked_panel_id INTEGER,
            linked_port_number INTEGER,
            medium TEXT,
            FOREIGN KEY(panel_item_id) REFERENCES rack_items(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS panel_port_connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            panel_item_id INTEGER NOT NULL,
            port_number INTEGER NOT NULL,
            linked_panel_id INTEGER NOT NULL,
            linked_port_number INTEGER NOT NULL,
            medium TEXT,
            FOREIGN KEY(panel_item_id) REFERENCES rack_items(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS device_panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_item_id INTEGER NOT NULL,
            parent_panel_id INTEGER,
            name TEXT NOT NULL,
            port_count INTEGER,
            port_rows INTEGER NOT NULL DEFAULT 1,
            port_flow TEXT NOT NULL DEFAULT 'row',
            FOREIGN KEY(parent_item_id) REFERENCES rack_items(id),
            FOREIGN KEY(parent_panel_id) REFERENCES device_panels(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS device_panel_ports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            panel_id INTEGER NOT NULL,
            port_number INTEGER NOT NULL,
            linked_panel_id INTEGER,
            linked_port_number INTEGER,
            medium TEXT,
            FOREIGN KEY(panel_id) REFERENCES device_panels(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sfp_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS device_panel_port_sfp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            panel_id INTEGER NOT NULL,
            port_number INTEGER NOT NULL,
            sfp_type_id INTEGER,
            owner TEXT,
            serial TEXT,
            UNIQUE(panel_id, port_number),
            FOREIGN KEY(panel_id) REFERENCES device_panels(id),
            FOREIGN KEY(sfp_type_id) REFERENCES sfp_types(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS panel_device_ports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            panel_item_id INTEGER NOT NULL,
            panel_port_number INTEGER NOT NULL,
            device_panel_id INTEGER NOT NULL,
            device_port_number INTEGER NOT NULL,
            medium TEXT,
            FOREIGN KEY(panel_item_id) REFERENCES rack_items(id),
            FOREIGN KEY(device_panel_id) REFERENCES device_panels(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS server_disks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_item_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            owner TEXT,
            size_value REAL,
            size_unit TEXT,
            clause TEXT,
            serial TEXT,
            asset_no TEXT,
            FOREIGN KEY(server_item_id) REFERENCES rack_items(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            payload TEXT NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS diagram_layouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            layout_key TEXT NOT NULL,
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, layout_key),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS diagram_layouts_global (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            layout_key TEXT NOT NULL UNIQUE,
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            action TEXT NOT NULL,
            description TEXT NOT NULL,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_buildings_location ON buildings(location_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_racks_room ON racks(room_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_rack_items_rack ON rack_items(rack_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_panel_ports_panel ON panel_ports(panel_item_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_panel_port_connections_panel ON panel_port_connections(panel_item_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_device_panels_item ON device_panels(parent_item_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_device_panels_parent ON device_panels(parent_panel_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_device_panel_ports_panel ON device_panel_ports(panel_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_panel_device_ports_panel ON panel_device_ports(panel_item_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_panel_device_ports_device ON panel_device_ports(device_panel_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_server_disks_server ON server_disks(server_item_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_sfp_types_name ON sfp_types(name);');
    db.run('CREATE INDEX IF NOT EXISTS idx_device_panel_port_sfp_panel ON device_panel_port_sfp(panel_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_device_panel_port_sfp_type ON device_panel_port_sfp(sfp_type_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);');
    db.run('CREATE INDEX IF NOT EXISTS idx_diagram_layouts_user_key ON diagram_layouts(user_id, layout_key);');
    db.run('CREATE INDEX IF NOT EXISTS idx_diagram_layouts_global_key ON diagram_layouts_global(layout_key);');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);');

    ensureUserColumns(db);
    ensureRackColumns(db);
    ensureRackItemColumns(db);
    ensureDevicePanelColumns(db);
    ensurePanelPortColumns(db);
    ensurePanelPortConnectionColumns(db);
    ensurePanelDevicePortColumns(db);
    ensureDevicePanelPortColumns(db);
    ensureServerDiskColumns(db);
    ensureDevicePanelPortSfpColumns(db);
    ensureAuditLogColumns(db);

    const count = getScalar(db, 'SELECT COUNT(1) AS count FROM users');
    if (count === 0) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        db.run(
            'INSERT INTO users (username, password_hash, must_change_password, role) VALUES (?, ?, ?, ?)',
            ['admin', passwordHash, 1, 'admin']
        );
        persistDb(db);
    }

    db.run("UPDATE users SET role = 'admin' WHERE username = 'admin'");
    persistDb(db);
}

function ensureUserColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(users)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('role')) {
        db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    }
    if (!columnNames.has('must_change_password')) {
        db.run('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1');
    }
    if (!columnNames.has('first_name')) {
        db.run('ALTER TABLE users ADD COLUMN first_name TEXT');
    }
    if (!columnNames.has('last_name')) {
        db.run('ALTER TABLE users ADD COLUMN last_name TEXT');
    }
}

function ensureRackColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(racks)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('height_u')) {
        db.run('ALTER TABLE racks ADD COLUMN height_u INTEGER NOT NULL DEFAULT 42');
    }
}

function ensureRackItemColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(rack_items)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('port_count')) {
        db.run('ALTER TABLE rack_items ADD COLUMN port_count INTEGER');
    }
    if (!columnNames.has('port_rows')) {
        db.run('ALTER TABLE rack_items ADD COLUMN port_rows INTEGER NOT NULL DEFAULT 1');
    }
    if (!columnNames.has('port_flow')) {
        db.run("ALTER TABLE rack_items ADD COLUMN port_flow TEXT NOT NULL DEFAULT 'row'");
    }
    if (!columnNames.has('ipv4')) {
        db.run('ALTER TABLE rack_items ADD COLUMN ipv4 TEXT');
    }
    if (!columnNames.has('serial')) {
        db.run('ALTER TABLE rack_items ADD COLUMN serial TEXT');
    }
    if (!columnNames.has('hostname')) {
        db.run('ALTER TABLE rack_items ADD COLUMN hostname TEXT');
    }
    if (!columnNames.has('owner')) {
        db.run('ALTER TABLE rack_items ADD COLUMN owner TEXT');
    }
}

function ensureDevicePanelColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(device_panels)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('port_rows')) {
        db.run('ALTER TABLE device_panels ADD COLUMN port_rows INTEGER NOT NULL DEFAULT 1');
    }
    if (!columnNames.has('port_flow')) {
        db.run("ALTER TABLE device_panels ADD COLUMN port_flow TEXT NOT NULL DEFAULT 'row'");
    }
}

function ensurePanelPortColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(panel_ports)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('medium')) {
        db.run('ALTER TABLE panel_ports ADD COLUMN medium TEXT');
    }
}

function ensurePanelPortConnectionColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(panel_port_connections)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('medium')) {
        db.run('ALTER TABLE panel_port_connections ADD COLUMN medium TEXT');
    }
}

function ensurePanelDevicePortColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(panel_device_ports)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('medium')) {
        db.run('ALTER TABLE panel_device_ports ADD COLUMN medium TEXT');
    }
}

function ensureDevicePanelPortColumns(db) {
    const columns = getAllRows(db, 'PRAGMA table_info(device_panel_ports)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('medium')) {
        db.run('ALTER TABLE device_panel_ports ADD COLUMN medium TEXT');
    }
}

function ensureServerDiskColumns(db) {
    const tables = getAllRows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'server_disks'");
    if (tables.length === 0) return;
    const columns = getAllRows(db, 'PRAGMA table_info(server_disks)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('owner')) {
        db.run('ALTER TABLE server_disks ADD COLUMN owner TEXT');
    }
    if (!columnNames.has('size_value')) {
        db.run('ALTER TABLE server_disks ADD COLUMN size_value REAL');
    }
    if (!columnNames.has('size_unit')) {
        db.run('ALTER TABLE server_disks ADD COLUMN size_unit TEXT');
    }
    if (!columnNames.has('clause')) {
        db.run('ALTER TABLE server_disks ADD COLUMN clause TEXT');
    }
    if (!columnNames.has('serial')) {
        db.run('ALTER TABLE server_disks ADD COLUMN serial TEXT');
    }
    if (!columnNames.has('asset_no')) {
        db.run('ALTER TABLE server_disks ADD COLUMN asset_no TEXT');
    }
}

function ensureDevicePanelPortSfpColumns(db) {
    const tables = getAllRows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'device_panel_port_sfp'");
    if (tables.length === 0) return;
    const columns = getAllRows(db, 'PRAGMA table_info(device_panel_port_sfp)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('sfp_type_id')) {
        db.run('ALTER TABLE device_panel_port_sfp ADD COLUMN sfp_type_id INTEGER');
    }
    if (!columnNames.has('owner')) {
        db.run('ALTER TABLE device_panel_port_sfp ADD COLUMN owner TEXT');
    }
    if (!columnNames.has('serial')) {
        db.run('ALTER TABLE device_panel_port_sfp ADD COLUMN serial TEXT');
    }
}

function ensureAuditLogColumns(db) {
    const tables = getAllRows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_logs'");
    if (tables.length === 0) return;
    const columns = getAllRows(db, 'PRAGMA table_info(audit_logs)');
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('username')) {
        db.run('ALTER TABLE audit_logs ADD COLUMN username TEXT');
    }
    if (!columnNames.has('action')) {
        db.run('ALTER TABLE audit_logs ADD COLUMN action TEXT');
    }
    if (!columnNames.has('description')) {
        db.run('ALTER TABLE audit_logs ADD COLUMN description TEXT');
    }
    if (!columnNames.has('method')) {
        db.run('ALTER TABLE audit_logs ADD COLUMN method TEXT');
    }
    if (!columnNames.has('path')) {
        db.run('ALTER TABLE audit_logs ADD COLUMN path TEXT');
    }
    if (!columnNames.has('created_at')) {
        db.run('ALTER TABLE audit_logs ADD COLUMN created_at TEXT');
    }
}

function getAllRows(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

function getScalar(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let value = null;
    if (stmt.step()) {
        const row = stmt.getAsObject();
        value = row.count ?? Object.values(row)[0];
    }
    stmt.free();
    return value ?? 0;
}

function persistDb(db) {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
}

module.exports = {
    getDb,
    persistDb
};
