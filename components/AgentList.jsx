import React from 'react';

/**
 * AgentList Component
 * Renders the list of available AI agents.
 * 
 * Props:
 * - agents: Array - List of agent objects
 * - selectedAgentId: string - ID of currently selected agent
 * - onSelectAgent: function(id) - Handler for selecting an agent
 * - onOpenModal: function(id) - Handler for opening agent details
 */
const AgentList = ({ agents, selectedAgentId, onSelectAgent, onOpenModal }) => {
    const [hoveredAgent, setHoveredAgent] = React.useState(null);
    const [popoverConfig, setPopoverConfig] = React.useState(null); // { top, right, align }

    const handleMouseEnter = (e, agent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const viewHeight = window.innerHeight;

        let align = 'center'; // 기본: 중앙 정렬
        let top = rect.top + (rect.height / 2); // 기본: 아이콘 중앙

        // 화면 상단 30% 영역에 있으면 -> Top 정렬 (위쪽 잘림 방지)
        if (rect.top < viewHeight * 0.3) {
            align = 'start';
            top = rect.top; // 아이콘 상단 라인에 맞춤
        }
        // 화면 하단 30% 영역에 있으면 -> Bottom 정렬 (아래쪽 잘림 방지)
        else if (rect.bottom > viewHeight * 0.7) {
            align = 'end';
            top = rect.bottom; // 아이콘 하단 라인에 맞춤
        }

        setPopoverConfig({
            top,
            right: window.innerWidth - rect.left + 15,
            align
        });
        setHoveredAgent(agent);
    };

    const handleMouseLeave = () => {
        setHoveredAgent(null);
        setPopoverConfig(null);
    };

    return (
        <div className="agent-list" id="agentList">
            {agents.map(agent => (
                <div
                    key={agent.id}
                    className={`agent-card ${selectedAgentId === agent.id ? 'selected' : ''}`}
                    onClick={() => onSelectAgent(agent.id)}
                >
                    <div className="agent-content">
                        <div className="agent-radio"></div>
                        <div className="agent-info">
                            <div className="agent-name">{agent.name}</div>
                        </div>
                    </div>

                    {/* Info Icon Button */}
                    <button
                        className="info-icon-btn"
                        onMouseEnter={(e) => handleMouseEnter(e, agent)}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => {
                            e.stopPropagation();
                            // 모바일 대응: 클릭 시에도 잠깐 보이거나 토글할 수 있음
                            // 현재는 호버 위주
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </button>
                </div>
            ))}

            {/* Fixed Popover Card */}
            {hoveredAgent && popoverConfig && (
                <div
                    className="agent-popover"
                    style={{
                        top: popoverConfig.top,
                        right: popoverConfig.right,
                        '--popover-translate-y': popoverConfig.align === 'center' ? '-50%' :
                            popoverConfig.align === 'end' ? '-100%' : '0%'
                    }}
                >
                    <div className="popover-content">
                        <h3 className="popover-title">
                            {hoveredAgent.name}
                            <span className="popover-badge">AI Agent</span>
                        </h3>
                        <p className="popover-desc">{hoveredAgent.description}</p>

                        {hoveredAgent.features && hoveredAgent.features.length > 0 && (
                            <div className="popover-features">
                                <div className="features-label">✨ 주요 기능</div>
                                <ul>
                                    {hoveredAgent.features.map((feature, idx) => (
                                        <li key={idx}>{feature}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .agent-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .agent-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .agent-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border-color: #d0d0d0;
                }
                .agent-card.selected {
                    border-color: #007AFF;
                    background: #f0f7ff;
                    box-shadow: 0 0 0 1px #007AFF inset;
                }
                .agent-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }
                .agent-radio {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    border: 2px solid #ccc;
                    position: relative;
                    transition: all 0.2s;
                }
                .agent-card.selected .agent-radio {
                    border-color: #007AFF;
                    background: #007AFF;
                }
                .agent-card.selected .agent-radio::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 8px;
                    height: 8px;
                    background: white;
                    border-radius: 50%;
                }
                .agent-name {
                    font-weight: 600;
                    color: #333;
                    font-size: 14px;
                }
                .info-icon-btn {
                    background: transparent;
                    border: none;
                    color: #adb5bd;
                    cursor: help;
                    padding: 4px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .info-icon-btn:hover {
                    color: #007AFF;
                    background: rgba(0, 122, 255, 0.1);
                }

                /* Popover Styles */
                .agent-popover {
                    /* Variable for dynamic vertical alignment */
                    --popover-translate-y: -50%; 

                    position: fixed;
                    width: 280px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 16px;
                    box-shadow: 
                        0 10px 40px -10px rgba(0,0,0,0.15),
                        0 0 0 1px rgba(0,0,0,0.05);
                    z-index: 9999;
                    pointer-events: none; /* Allow clicking through if needed, but mainly for display */
                    opacity: 0;
                    
                    /* Dynamic Transform Application */
                    transform: translateY(var(--popover-translate-y)) translateX(10px);
                    animation: slideIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    padding: 4px; /* Inner padding for border effect if needed */
                }
                
                @keyframes slideIn {
                    to {
                        opacity: 1;
                        transform: translateY(var(--popover-translate-y)) translateX(0);
                    }
                }

                .popover-content {
                    padding: 20px;
                }
                
                .popover-title {
                    margin: 0 0 8px 0;
                    font-size: 16px;
                    font-weight: 700;
                    color: #111;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .popover-badge {
                    font-size: 10px;
                    background: #f0f0f0;
                    color: #666;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .popover-desc {
                    margin: 0 0 16px 0;
                    font-size: 13px;
                    line-height: 1.5;
                    color: #555;
                }
                .popover-features {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 12px;
                }
                .features-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #888;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .popover-features ul {
                    margin: 0;
                    padding-left: 14px;
                }
                .popover-features li {
                    font-size: 12px;
                    color: #444;
                    margin-bottom: 4px;
                    line-height: 1.4;
                }
                .popover-features li:last-child {
                    margin-bottom: 0;
                }

                /* Dark Mode for Popover */
                @media (prefers-color-scheme: dark) {
                    .agent-card {
                        background: #1c1c1e;
                        border-color: #333;
                    }
                    .agent-card:hover {
                        border-color: #555;
                    }
                    .agent-name { color: #eee; }
                    .agent-card.selected {
                        background: #1a2a3a;
                        border-color: #0a84ff;
                        box-shadow: 0 0 0 1px #0a84ff inset;
                    }
                    
                    .agent-popover {
                        background: rgba(30, 30, 32, 0.95);
                        border-color: rgba(255, 255, 255, 0.1);
                        box-shadow: 
                            0 10px 40px -10px rgba(0,0,0,0.5),
                            0 0 0 1px rgba(255,255,255,0.1);
                    }
                    .popover-title { color: #fff; }
                    .popover-badge { background: #333; color: #aaa; }
                    .popover-desc { color: #ccc; }
                    .popover-features { background: #2c2c2e; }
                    .features-label { color: #888; }
                    .popover-features li { color: #ddd; }
                }
            `}</style>
        </div>
    );
};


export default AgentList;
