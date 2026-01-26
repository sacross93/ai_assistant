import React from 'react';

const MobileTabBar = ({ activeTab, onTabChange }) => {
    return (
        <>
            <div className="mobile-tab-bar">
                <button
                    className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => onTabChange('history')}
                    aria-label="History"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    <span>History</span>
                </button>

                <button
                    className={`tab-item ${activeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => onTabChange('chat')}
                    aria-label="Chat"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Chat</span>
                </button>

                <button
                    className={`tab-item ${activeTab === 'tools' ? 'active' : ''}`}
                    onClick={() => onTabChange('tools')}
                    aria-label="Agents"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    <span>Agents</span>
                </button>
            </div>

            <style jsx>{`
                .mobile-tab-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background: var(--sidebar-bg, #ffffff);
                    border-top: 1px solid var(--border-color, #e5e8eb);
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    z-index: 1001;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
                }

                .tab-item {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    background: none;
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--text-secondary, #8b95a1);
                    min-height: 44px;
                }

                .tab-item.active {
                    color: var(--primary-blue, #3182f6);
                }

                .tab-item:hover {
                    opacity: 0.8;
                }

                .tab-item span {
                    font-size: 12px;
                    font-weight: 500;
                }

                .tab-item svg {
                    width: 24px;
                    height: 24px;
                }
            `}</style>
        </>
    );
};

export default MobileTabBar;
