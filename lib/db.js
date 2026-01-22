import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Create table if not exists (Users)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK( role IN ('user', 'admin') ) NOT NULL DEFAULT 'user'
  )
`);

// Create table for RAG documents
db.exec(`
  CREATE TABLE IF NOT EXISTS rag_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    pages INTEGER,
    chunks INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create table if not exists (Conversations)
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

// Create table if not exists (Messages)
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT CHECK( role IN ('user', 'assistant', 'system') ) NOT NULL,
    content TEXT NOT NULL,
    agent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  )
`);

// Create table if not exists (Agents)
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    features TEXT, -- JSON string
    order_index INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1 -- 0: hidden, 1: active
  )
`);

// Seed Agents if empty
const agentsCount = db.prepare('SELECT count(*) as count FROM agents').get();
if (agentsCount.count === 0) {
  const { agents } = require('../data/agents');
  const insert = db.prepare('INSERT OR IGNORE INTO agents (id, name, description, features, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)');

  const runTransaction = db.transaction((agents) => {
    agents.forEach((agent, index) => {
      insert.run(agent.id, agent.name, agent.description, JSON.stringify(agent.features), index, 1);
    });
  });

  runTransaction(agents);
  console.log('Seeded agents table with default data.');
}

export default db;
