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
    uploadedFiles,
    onAddFiles,
    onDeleteFile,
    uploadedUrls,
    onAddUrl,
    onDeleteUrl,
    onLogout
}) => {
    const fileInputRef = useRef(null);
    const urlInputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        e.target.style.borderColor = 'var(--border-color)';
        e.target.style.backgroundColor = '#fafbfd';

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onAddFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.target.style.borderColor = 'var(--primary-blue)';
        e.target.style.backgroundColor = '#f0f7ff';
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.target.style.borderColor = 'var(--border-color)';
        e.target.style.backgroundColor = '#fafbfd';
    };

    const handleFileClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            onAddFiles(Array.from(e.target.files));
            e.target.value = '';
        }
    };

    const handleAddUrlClick = () => {
        const url = urlInputRef.current.value.trim();
        if (url) {
            onAddUrl(url);
            urlInputRef.current.value = '';
        } else {
            alert('URL을 입력해주세요.');
        }
    };

    const handleUrlKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleAddUrlClick();
        }
    };

    return (
        <aside className="sidebar-right" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Scrollable Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* File Upload Section */}
                <div className="upload-section">
                    <h3>파일 업로드</h3>
                    <div
                        className="drop-zone"
                        id="dropZone"
                        onClick={handleFileClick}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        <p>파일을 여기로 드래그하거나<br />클릭하여 선택하세요</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            multiple
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Uploaded File List */}
                    {uploadedFiles && uploadedFiles.length > 0 && (
                        <div className="uploaded-files-list" style={{ marginTop: '16px' }}>
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="file-item" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    backgroundColor: '#fff',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    fontSize: '14px'
                                }}>
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '200px'
                                    }}>{file.name}</span>
                                    <button
                                        onClick={() => onDeleteFile(index)}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#b0b8c1',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            marginLeft: '8px',
                                            fontSize: '16px'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* URL Input Section */}
                <div className="url-section">
                    <h3>URL 입력</h3>
                    <div className="url-input-container">
                        <input
                            type="url"
                            id="urlInput"
                            placeholder="유튜브 링크 등을 입력하세요"
                            ref={urlInputRef}
                            onKeyPress={handleUrlKeyPress}
                        />
                        <button onClick={handleAddUrlClick}>추가</button>
                    </div>

                    {/* Uploaded URL List */}
                    {uploadedUrls && uploadedUrls.length > 0 && (
                        <div className="uploaded-files-list" style={{ marginTop: '16px' }}>
                            {uploadedUrls.map((url, index) => (
                                <div key={index} className="file-item" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    backgroundColor: '#fff',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    fontSize: '14px'
                                }}>
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '200px'
                                    }}>{url}</span>
                                    <button
                                        onClick={() => onDeleteUrl(index)}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#b0b8c1',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            marginLeft: '8px',
                                            fontSize: '16px'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
