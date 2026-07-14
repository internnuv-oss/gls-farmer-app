// src/core/database.ts
import * as SQLite from 'expo-sqlite';

// Initialize the local database file synchronously
const db = SQLite.openDatabaseSync('fieldcommander.db');

// 🚀 FIX: Runs instantly upon file import. No React lifecycle required!
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
`);

export const insertLocation = (shiftId: string, lat: number, lon: number, timestamp: number, accuracy: number, speed: number) => {
  const statement = db.prepareSync(
    'INSERT INTO pending_locations (shift_id, latitude, longitude, timestamp, accuracy, speed) VALUES (?, ?, ?, ?, ?, ?)'
  );
  statement.executeSync([shiftId, lat, lon, timestamp, accuracy, speed]);
};

export const getPendingLocations = () => {
  // Pull in batches of 100 to prevent overloading the network request
  return db.getAllSync('SELECT * FROM pending_locations ORDER BY timestamp ASC LIMIT 100');
};

export const deleteLocations = (ids: number[]) => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const statement = db.prepareSync(`DELETE FROM pending_locations WHERE id IN (${placeholders})`);
  statement.executeSync(ids);
};