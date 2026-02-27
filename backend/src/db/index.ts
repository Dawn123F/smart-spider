import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'zhizhu.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS spider_flows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT NOT NULL DEFAULT '[]',
      edges TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT,
      logs TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      FOREIGN KEY (flow_id) REFERENCES spider_flows(id)
    );
  `);
  console.log('Database initialized at', DB_PATH);
}
