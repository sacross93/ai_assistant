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
    onLogout,
    // RAG Document Props
    ragDocuments = [],
    selectedDocIds = [],
    useAllDocs = true,
    onToggleDocSelection,
    onToggleAllDocs,
    onDeleteDocument,
    isMobile = false
}) => {

    return (
        <aside className={`sidebar-right ${isMobile ? 'mobile-fullscreen' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

                {/* RAG Document Section - Only show when doc-chat is selected */}
                {selectedAgentId === 'doc-chat' && (
                    <div className="rag-documents-section">
                        <h3>📄 내 문서</h3>

                        {/* All Docs Toggle */}
                        <div
                            className={`doc-item all-docs ${useAllDocs ? 'selected' : ''}`}
                            onClick={onToggleAllDocs}
                        >
                            <div className="doc-checkbox">
                                {useAllDocs && <span className="check">✓</span>}
                            </div>
                            <div className="doc-info">
                                <span className="doc-name">🌐 전체 문서 검색</span>
                                <span className="doc-meta">업로드된 모든 문서에서 검색</span>
                            </div>
                        </div>

                        {/* Document List */}
                        {ragDocuments.length > 0 ? (
                            <div className="doc-list">
                                {ragDocuments.map((doc) => (
                                    <div
                                        key={doc.doc_id}
                                        className={`doc-item ${selectedDocIds.includes(doc.doc_id) ? 'selected' : ''}`}
                                    >
                                        <div
                                            className="doc-checkbox"
                                            onClick={() => onToggleDocSelection(doc.doc_id)}
                                        >
                                            {selectedDocIds.includes(doc.doc_id) && <span className="check">✓</span>}
                                        </div>
                                        <div
                                            className="doc-info"
                                            onClick={() => onToggleDocSelection(doc.doc_id)}
                                        >
                                            <span className="doc-name">{doc.filename}</span>
                                            <span className="doc-meta">
                                                {doc.pages > 0 && `${doc.pages}페이지`}
                                                {doc.pages > 0 && doc.chunks > 0 && ' · '}
                                                {doc.chunks > 0 && `${doc.chunks}청크`}
                                            </span>
                                        </div>
                                        <button
                                            className="doc-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('이 문서를 삭제하시겠습니까?')) {
                                                    onDeleteDocument(doc.doc_id);
                                                }
                                            }}
                                            title="문서 삭제"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-documents">
                                <p>업로드된 문서가 없습니다.</p>
                                <p className="hint">채팅창에서 파일을 업로드해주세요.</p>
                            </div>
                        )}

                        {/* Selection Summary */}
                        {!useAllDocs && selectedDocIds.length > 0 && (
                            <div className="selection-summary">
                                {selectedDocIds.length}개 문서 선택됨
                            </div>
                        )}
                    </div>
                )}
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

            <style jsx>{`
                .rag-documents-section {
                    padding: 0;
                }
                .rag-documents-section h3 {
                    margin-bottom: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary, #1c1c1e);
                }
                .doc-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .doc-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .doc-item:hover {
                    background: #f1f3f4;
                    border-color: #dee2e6;
                }
                .doc-item.selected {
                    background: #e7f3ff;
                    border-color: #007AFF;
                }
                .doc-item.all-docs {
                    margin-bottom: 8px;
                    background: #f0f7ff;
                    border-color: #cce4ff;
                }
                .doc-item.all-docs.selected {
                    background: #007AFF;
                    border-color: #007AFF;
                }
                .doc-item.all-docs.selected .doc-name,
                .doc-item.all-docs.selected .doc-meta {
                    color: white;
                }
                .doc-item.all-docs.selected .doc-checkbox {
                    background: white;
                    border-color: white;
                }
                .doc-item.all-docs.selected .check {
                    color: #007AFF;
                }
                .doc-checkbox {
                    width: 20px;
                    height: 20px;
                    min-width: 20px;
                    border: 2px solid #ced4da;
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    transition: all 0.2s;
                }
                .doc-item.selected .doc-checkbox {
                    border-color: #007AFF;
                    background: #007AFF;
                }
                .check {
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }
                .doc-info {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .doc-name {
                    font-size: 13px;
                    font-weight: 500;
                    color: #1c1c1e;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .doc-meta {
                    font-size: 11px;
                    color: #8e8e93;
                }
                .doc-delete-btn {
                    width: 24px;
                    height: 24px;
                    min-width: 24px;
                    border: none;
                    background: transparent;
                    color: #adb5bd;
                    font-size: 18px;
                    cursor: pointer;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .doc-delete-btn:hover {
                    background: #fee2e2;
                    color: #ef4444;
                }
                .no-documents {
                    padding: 20px;
                    text-align: center;
                    color: #8e8e93;
                    background: #f8f9fa;
                    border-radius: 10px;
                }
                .no-documents p {
                    margin: 0;
                    font-size: 13px;
                }
                .no-documents .hint {
                    margin-top: 4px;
                    font-size: 12px;
                    color: #adb5bd;
                }
                .selection-summary {
                    margin-top: 8px;
                    padding: 8px 12px;
                    background: #007AFF;
                    color: white;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    text-align: center;
                }
                
                @media (prefers-color-scheme: dark) {
                    .doc-item {
                        background: #2c2c2e;
                        border-color: #3a3a3c;
                    }
                    .doc-item:hover {
                        background: #3a3a3c;
                    }
                    .doc-item.selected {
                        background: #1a3a5c;
                        border-color: #007AFF;
                    }
                    .doc-item.all-docs {
                        background: #1a2a3a;
                        border-color: #2a4a6a;
                    }
                    .doc-name {
                        color: #f5f5f7;
                    }
                    .doc-checkbox {
                        background: #3a3a3c;
                        border-color: #5a5a5c;
                    }
                    .no-documents {
                        background: #2c2c2e;
                    }
                }
            `}</style>
        </aside>
    );
};

export default SidebarTools;
