import React, { useRef } from 'react';
import AgentList from './AgentList';

/**
 * SidebarTools Component
 * Right sidebar containing File Upload, URL Input, and Agent Selection.
 */
const SidebarTools = ({
    agents,
    selectedAgentId,
    onSelectAgent,
    onOpenModal,
    onLogout
}) => {



    return (
        <aside className="sidebar-right" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Scrollable Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Agent Selection Section */}
                <div className="agent-section">
                    <h3>LLM Agent 선택</h3>
                    <AgentList
                        agents={agents}
                        selectedAgentId={selectedAgentId}
                        onSelectAgent={onSelectAgent}
                        onOpenModal={onOpenModal}
                    />
                </div>
            </div>

            {/* Logout Section */}
            <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border-color)', marginTop: '24px' }}>
                <button
                    onClick={onLogout}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#fff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: '#e93e2f',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    로그아웃
                </button>
            </div>
        </aside>
    );
};

export default SidebarTools;
