import React from 'react';

/**
 * SidebarHistory Component
 * Displays the chat history list on the left side.
 * 
 * Props:
 * - isOpen: boolean - Controls visibility of sidebar
 * - onClose: function - Handler to close the sidebar
 */
const SidebarHistory = ({ isOpen, onClose }) => {
    return (
        <aside className={`sidebar-left ${isOpen ? 'open' : ''}`} id="sidebarLeft">
            <div className="sidebar-header">
                <h2>채팅 히스토리</h2>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="history-list">
                <div className="history-group">
                    <h3>오늘</h3>
                    <div className="history-item">
                        <span className="title">보고서 요약 요청</span>
                        <span className="preview">2024년 3분기 실적 보고서를 요약해줘...</span>
                    </div>
                    <div className="history-item">
                        <span className="title">영어 번역</span>
                        <span className="preview">이 문장을 자연스러운 비즈니스 영어로...</span>
                    </div>
                </div>
                <div className="history-group">
                    <h3>어제</h3>
                    <div className="history-item">
                        <span className="title">코드 리뷰</span>
                        <span className="preview">Python 코드 최적화 방안 검토...</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default SidebarHistory;
