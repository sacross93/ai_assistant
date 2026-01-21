
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
 * Get an existing conversation or create a new one
 * @param {number} userId 
 * @param {string} agentId 
 * @param {string} initialMessage 
 * @returns {number} conversationId
 */
export function getOrCreateConversation(userId, agentId, initialMessage) {
    // 1. Try to find the most recent conversation for this agent
    // This is a simple heuristic. You might want to be more specific.
    // For now, let's just create a new one every time for simplicity if no ID is provided, 
    // OR if we want to reuse "empty" conversations.

    // BUT, the requirement is usually to create a new chat for a new topic.
    // However, if we want to "continue" the last chat:
    /*
    const stmt = db.prepare('SELECT id FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    const lastConv = stmt.get(userId);
    if (lastConv) return lastConv.id;
    */

    // For better UX, let's create a new conversation with a title based on the message
    const title = initialMessage.substring(0, 30) + (initialMessage.length > 30 ? '...' : '');
    const newConv = createConversation(userId, title);
    return newConv.id;
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
