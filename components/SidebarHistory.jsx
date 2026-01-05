
import React, { useState, useEffect } from 'react';

const SidebarHistory = ({ isOpen, onClose, onSelectConversation, onNewChat }) => {
    const [conversations, setConversations] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchConversations();
        }
    }, [isOpen]);

    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/chat/conversations');
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations);
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        }
    };

    const handleSelect = (convId) => {
        if (onSelectConversation) {
            onSelectConversation(convId);
        }
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    const handleNewChat = () => {
        if (onNewChat) {
            onNewChat();
        }
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    const handleDelete = async (e, convId) => {
        e.stopPropagation(); // Prevent selection
        if (confirm('정말 삭제하시겠습니까?')) {
            try {
                const res = await fetch(`/api/chat/conversations?id=${convId}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    // Update list
                    setConversations(prev => prev.filter(c => c.id !== convId));
                    // If current chat was deleted, clear it (Optional: requires parent coordination, skipping for now)
                }
            } catch (error) {
                console.error("Failed to delete conversation:", error);
            }
        }
    };

    // Group conversations by date
    const groupedConversations = conversations.reduce((acc, conv) => {
        const date = new Date(conv.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(conv);
        return acc;
    }, {});

    return (
        <aside className={`sidebar-left ${isOpen ? 'open' : ''}`} id="sidebarLeft">
            <div className="sidebar-header">
                <h2>채팅 히스토리</h2>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="sidebar-action">
                <button className="new-chat-btn" onClick={handleNewChat}>
                    + 새 채팅 시작
                </button>
            </div>

            <div className="history-list">
                {conversations.length === 0 ? (
                    <div className="empty-history">기록이 없습니다.</div>
                ) : (
                    Object.keys(groupedConversations).map((date) => (
                        <div key={date} className="history-group">
                            <h3>{date}</h3>
                            {groupedConversations[date].map((conv) => (
                                <div
                                    key={conv.id}
                                    className="history-item"
                                    onClick={() => handleSelect(conv.id)}
                                >
                                    <span className="title" title={conv.title}>{conv.title}</span>
                                    <div className="delete-btn-wrapper">
                                        <button
                                            className="item-delete-btn"
                                            onClick={(e) => handleDelete(e, conv.id)}
                                            title="삭제"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            <style jsx>{`
                .sidebar-action {
                    padding: 0 20px 10px 20px;
                }
                .new-chat-btn {
                    width: 100%;
                    padding: 10px;
                    background-color: #007AFF;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .new-chat-btn:hover {
                    background-color: #0066cc;
                }
                .empty-history {
                    padding: 20px;
                    color: #8e8e93;
                    text-align: center;
                    font-size: 14px;
                }
                .history-item {
                    cursor: pointer;
                    padding: 10px 14px;
                    border-radius: 8px;
                    transition: background 0.2s;
                    position: relative;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .history-item:hover {
                    background-color: rgba(0,0,0,0.05);
                }
                .history-item:hover .item-delete-btn {
                    opacity: 1;
                }
                .title {
                    display: block;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                    padding-right: 8px;
                }
                .delete-btn-wrapper {
                    display: flex;
                    align-items: center;
                }
                .item-delete-btn {
                    opacity: 0;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    color: #8e8e93;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .item-delete-btn:hover {
                    background-color: #e5e5ea;
                    color: #ff3b30;
                }
                
                @media (hover: none) {
                     .item-delete-btn {
                        opacity: 1;
                     }
                }
            `}</style>
        </aside>
    );
};

export default SidebarHistory;
