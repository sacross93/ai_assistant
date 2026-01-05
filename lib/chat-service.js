
import db from './db.js';

/**
 * Get all conversations for a specific user
 * @param {number} userId 
 * @returns {Array} List of conversations
 */
export function getConversations(userId) {
    const stmt = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
}

/**
 * Create a new conversation
 * @param {number} userId 
 * @param {string} title 
 * @returns {object} The created conversation object
 */
export function createConversation(userId, title) {
    const stmt = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)');
    const info = stmt.run(userId, title || '새로운 대화');
    return {
        id: info.lastInsertRowid,
        user_id: userId,
        title: title || '새로운 대화',
        created_at: new Date().toISOString() // Approximate
    };
}

/**
 * Get a single conversation by ID
 * @param {number} conversationId 
 * @returns {object|undefined} Conversation object
 */
export function getConversation(conversationId) {
    const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
    return stmt.get(conversationId);
}

/**
 * Get messages for a specific conversation
 * @param {number} conversationId 
 * @returns {Array} List of messages
 */
export function getMessages(conversationId) {
    const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC');
    const messages = stmt.all(conversationId);

    // Parse JSON content if needed, though we store as text. 
    // If the content was JSON stringified, the frontend might need to parse it, 
    // or we can try to parse it here if we want to return objects for STT results.
    // For now, return as is (string), let frontend handle parsing.
    return messages;
}

/**
 * Save a message to the database
 * @param {number} conversationId 
 * @param {string} role 'user' | 'assistant' | 'system'
 * @param {string|object} content 
 * @param {string} agentId Optional agent identifier
 * @returns {object} The saved message object
 */
export function saveMessage(conversationId, role, content, agentId = null) {
    // If content is an object, stringify it
    const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;

    const stmt = db.prepare('INSERT INTO messages (conversation_id, role, content, agent_id) VALUES (?, ?, ?, ?)');
    const info = stmt.run(conversationId, role, contentStr, agentId);

    return {
        id: info.lastInsertRowid,
        conversation_id: conversationId,
        role,
        content: contentStr,
        agent_id: agentId,
        created_at: new Date().toISOString()
    };
}

/**
 * Delete a conversation
 * @param {number} conversationId 
 */
export function deleteConversation(conversationId) {
    const deleteMessages = db.prepare('DELETE FROM messages WHERE conversation_id = ?');
    const deleteConv = db.prepare('DELETE FROM conversations WHERE id = ?');

    const transaction = db.transaction(() => {
        deleteMessages.run(conversationId);
        deleteConv.run(conversationId);
    });

    transaction();
}
