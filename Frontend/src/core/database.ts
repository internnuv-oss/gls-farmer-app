// src/core/database.ts
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('fieldcommander.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS pending_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    accuracy REAL,
    speed REAL
  );
  
  -- 🚀 NEW: A bulletproof table to store the active shift ID for the background task
  CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export const setActiveShiftId = (id: string | null) => {
  if (id) {
    db.runSync(`INSERT OR REPLACE INTO app_config (key, value) VALUES ('active_shift_id', ?)`, [id]);
  } else {
    db.runSync(`DELETE FROM app_config WHERE key = 'active_shift_id'`);
  }
};

export const getActiveShiftId = () => {
  try {
    const row = db.getFirstSync<{value: string}>(`SELECT value FROM app_config WHERE key = 'active_shift_id'`);
    return row?.value || null;
  } catch (e) {
    return null;
  }
};

export const insertLocation = (shiftId: string, lat: number, lon: number, timestamp: number, accuracy: number, speed: number) => {
  const statement = db.prepareSync(
    'INSERT INTO pending_locations (shift_id, latitude, longitude, timestamp, accuracy, speed) VALUES (?, ?, ?, ?, ?, ?)'
  );
  statement.executeSync([shiftId, lat, lon, timestamp, accuracy, speed]);
};

export const getPendingLocations = () => {
  return db.getAllSync('SELECT * FROM pending_locations ORDER BY timestamp ASC LIMIT 3000');
};

export const deleteLocations = (ids: number[]) => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const statement = db.prepareSync(`DELETE FROM pending_locations WHERE id IN (${placeholders})`);
  statement.executeSync(ids);
};

export const getPendingCount = () => {
  try {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM pending_locations');
    return result?.count || 0;
  } catch (e) {
    return 0;
  }
};

export const setLastSyncedLocation = (lat: number, lng: number) => {
  const payload = JSON.stringify({ lat, lng });
  db.runSync(`INSERT OR REPLACE INTO app_config (key, value) VALUES ('last_synced_loc', ?)`, [payload]);
};

export const getLastSyncedLocation = (): { lat: number, lng: number } | null => {
  try {
    const row = db.getFirstSync<{value: string}>(`SELECT value FROM app_config WHERE key = 'last_synced_loc'`);
    return row?.value ? JSON.parse(row.value) : null;
  } catch (e) {
    return null;
  }
};

export const clearLastSyncedLocation = () => {
  db.runSync(`DELETE FROM app_config WHERE key = 'last_synced_loc'`);
};