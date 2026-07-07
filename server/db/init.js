import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'fdeplanning.db');

let db = null;
let SQL = null;

// Persist database to disk
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 5 seconds if there are changes
let saveTimeout = null;
export function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabase();
  }, 1000);
}

export async function getDatabase() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

export async function initDatabase() {
  if (db) return db;
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Initialize SQL.js
  SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✓ Database loaded from disk');
  } else {
    db = new SQL.Database();
    console.log('✓ New database created');
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id TEXT NOT NULL,
      text TEXT NOT NULL,
      author TEXT DEFAULT 'Anonymous',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_comments_section 
    ON comments(section_id)
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      row_key TEXT UNIQUE NOT NULL,
      output_name TEXT NOT NULL,
      description TEXT,
      owner_deadline TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // Seed default commitment rows if empty
  const result = db.exec('SELECT COUNT(*) as cnt FROM commitments');
  const count = result.length > 0 ? result[0].values[0][0] : 0;
  
  if (count === 0) {
    seedCommitments();
  }
  
  // Save initial state
  saveDatabase();
  
  console.log('✓ Database initialized');
  return db;
}

function seedCommitments() {
  const defaultRows = [
    { key: 'row-0', output: 'Pre-work enforcement', desc: 'Mechanism agreed. 2-week runway confirmed. Role-based pre-work drafted.', owner: '_____ · Jul 6' },
    { key: 'row-1', output: 'Immersion structure', desc: 'Day 1 & Day 2 (or 3-day) redesign. Timing, gates, ownership moments.', owner: '_____ · Jul 10' },
    { key: 'row-2', output: 'Material owners', desc: 'Kick-off · Day 1 · Day 2 · pre-work — each has a name', owner: '_____ · Jul 13' },
    { key: 'row-3', output: 'Role briefs', desc: 'One-page brief per discipline (XD, SO, CS, IE/SE) for the immersion context', owner: '_____ · Jul 10' },
    { key: 'row-4', output: 'Agentic definition', desc: 'One sentence, group-ratified, into every deck', owner: '_____ · Jul 13' },
    { key: 'row-5', output: 'Success criteria', desc: 'Five criteria in kick-off deck. Scoring mechanism agreed.', owner: '_____ · Jul 13' },
    { key: 'row-6', output: 'Reference architectures', desc: 'Decision: build them, defer, or explicitly not doing. Owner if yes.', owner: '_____ · Jul 13' },
    { key: 'row-7', output: 'Wave 4 candidate list', desc: 'Team reviews, flags removals/deferrals. Invites go out.', owner: 'Digisha + team · Jul 6' },
    { key: 'row-8', output: 'July 15 kick-off coverage', desc: 'Named facilitator, briefed, ready to run the room (Nicole out)', owner: '_____ · Jul 10' },
    { key: 'row-9', output: 'Post-immersion path', desc: '"What happens next" block for Day 2 with named path to placement', owner: '_____ · Jul 10' },
  ];
  
  const stmt = db.prepare(`
    INSERT INTO commitments (row_key, output_name, description, owner_deadline)
    VALUES (?, ?, ?, ?)
  `);
  
  for (const row of defaultRows) {
    stmt.run([row.key, row.output, row.desc, row.owner]);
  }
  stmt.free();
  
  console.log('✓ Seeded default commitment rows');
}

// Save on process exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });
