import React from 'react';

/**
 * ChatInterface Component
 * Main chat area.
 * 
 * Props:
 * - selectedAgentName: string - Name of the currently selected agent
 */
const ChatInterface = ({ selectedAgentName }) => {
    return (
        <main className="main-content">
            <div className="chat-container">
                <div className="welcome-message">
                    <h1>무엇을 도와드릴까요?</h1>
                    <p>원하는 작업을 선택하거나 자연어로 질문해주세요.</p>
                </div>

                <div className="input-area">
                    <div className="input-wrapper">
                        <textarea placeholder="메시지를 입력하세요..." rows="1"></textarea>
                        <button className="send-btn">전송</button>
                    </div>

                    {/* Selected Agent Indicator */}
                    <div className="selected-agent-indicator" id="selectedAgentIndicator" style={{ display: selectedAgentName ? 'inline-block' : 'none' }}>
                        선택된 Agent: <span id="currentAgentName">{selectedAgentName || '없음'}</span>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ChatInterface;
