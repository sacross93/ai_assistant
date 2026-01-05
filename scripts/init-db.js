import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

const SALT_ROUNDS = 10;

async function init() {
  console.log('Initializing database...');

  // Create table (Users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK( role IN ('user', 'admin') ) NOT NULL DEFAULT 'user'
    )
  `);

  // Create table (Conversations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    `);

  // Create table (Messages)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT CHECK( role IN ('user', 'assistant', 'system') ) NOT NULL,
        content TEXT NOT NULL,
        agent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    )
    `);

  // Check if admin exists
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');

  if (!admin) {
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('1234', SALT_ROUNDS);

    const insert = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
    insert.run('admin', hashedPassword, 'Administrator', 'admin');
    console.log('Admin user created: admin / 1234');
  } else {
    console.log('Admin user already exists.');
  }

  console.log('Database initialization complete.');
}

init();
