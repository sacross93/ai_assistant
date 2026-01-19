
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import STTResultCard from './STTResultCard';

const AGENT_LABELS = {
    'translate_language': '번역 에이전트',
    'stt-summary': '영상 분석 에이전트',
    'report-gen': '보고서 에이전트',
    'spellcheck': '맞춤법 에이전트',
};

/**
 * ChatInterface Component
 * Main chat area.
 * 
 * Props:
 * - selectedAgentName: string
 * - selectedAgentId: string
 * - uploadedUrls: array
 * - uploadedFiles: array
 * - onAddFiles: function
 * - onDeleteFile: function
 * - onAddUrl: function
 * - onDeleteUrl: function
 * - currentConversationId: number | null (Optional, from parent)
 * - onConversationChange: function (Optional, to notify parent of new conversation)
 */
const ChatInterface = ({
    selectedAgentName,
    selectedAgentId,
    uploadedUrls,
    uploadedFiles,
    onAddFiles,
    onDeleteFile,
    onAddUrl,
    onDeleteUrl,
    onClearAttachments,
    currentConversationId = null,
    onConversationChange
}) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(currentConversationId);

    // New State for Attachment Menu
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInputValue, setUrlInputValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Drag and Drop Handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onAddFiles(Array.from(e.dataTransfer.files));
            e.dataTransfer.clearData();
        }
    };

    // Sync prop to state if it changes
    useEffect(() => {
        if (currentConversationId) {
            setConversationId(currentConversationId);
            // Load messages for this conversation (If parent logic doesn't handle it)
            fetchMessages(currentConversationId);
        } else {
            setConversationId(null);
            setMessages([]);
        }
    }, [currentConversationId]);

    const fetchMessages = async (convId) => {
        try {
            const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
            if (res.ok) {
                const data = await res.json();
                // Parse potential JSON content for STT
                const parsedMessages = data.messages.map(m => {
                    let content = m.content;
                    try {
                        // If it looks like JSON structure for STT
                        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                            const parsed = JSON.parse(content);
                            if (parsed.info || parsed.summary || parsed.translated) {
                                content = parsed;
                            }
                        }
                    } catch (e) { /* ignore */ }
                    return { ...m, content };
                });
                setMessages(prev => {
                    const pollingMessages = prev.filter(m => m.isPolling);
                    return [...parsedMessages, ...pollingMessages];
                });
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    };

    // STT Options
    const [sttConfig, setSttConfig] = useState({
        diarize: true,
        make_summary: true
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() && uploadedUrls?.length === 0 && uploadedFiles?.length === 0) return;

        if (!selectedAgentId) {
            const errorMessage = { role: 'system', content: '먼저 사용할 기능을 오른쪽 사이드바에서 선택해주세요.' };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        const currentInput = input;

        let displayContent = currentInput;
        // 사용자 메시지 표시 (URL이 있으면 함께 표시)
        if (selectedAgentId === 'stt-summary' && uploadedUrls?.length > 0) {
            displayContent = `[URL 분석 요청] ${uploadedUrls.join(', ')}\n${currentInput}`;
        }

        // Add file info to display content if files are uploaded
        if (uploadedFiles?.length > 0) {
            const fileNames = uploadedFiles.map(f => f.name).join(', ');
            displayContent = `[파일 첨부: ${fileNames}]\n${displayContent}`;
        }

        // Optimistic Update
        const tempMsgId = Date.now();
        const userMessage = { role: 'user', content: displayContent, id: tempMsgId };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        if (onClearAttachments) onClearAttachments(); // Clear files and URLs via parent
        setShowUrlInput(false); // Hide inline input if open
        setIsLoading(true);

        try {
            if (selectedAgentId === 'translate_language') {
                const previousContext = messages.map(msg => {
                    let contentToSend = msg.content;
                    if (typeof msg.content === 'object' && msg.content !== null) {
                        if (msg.content.merged_md) contentToSend = msg.content.merged_md;
                        else if (msg.content.summary_md) contentToSend = msg.content.summary_md;
                        else contentToSend = JSON.stringify(msg.content);
                    }
                    return { role: msg.role, content: contentToSend };
                });

                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_input: currentInput,
                        previous_context: previousContext,
                        agentId: selectedAgentId,
                        conversationId: conversationId // Send current conversation ID
                    })
                });

                if (!response.ok) throw new Error('API connection failed');
                const data = await response.json();

                // Update Conversation ID if newly created
                if (data.conversationId && data.conversationId !== conversationId) {
                    setConversationId(data.conversationId);
                    if (onConversationChange) onConversationChange(data.conversationId);
                }

                let displayContent = '';
                if (data.translated) displayContent = data.translated;
                else if (data.error) displayContent = `오류 발생: ${data.error}`;
                else displayContent = "번역된 텍스트를 찾을 수 없습니다.";

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: displayContent,
                    agent_id: selectedAgentId,
                    conversation_id: data.conversationId
                }]);

            } else if (selectedAgentId === 'stt-summary') {
                if ((!uploadedUrls || uploadedUrls.length === 0) && (!uploadedFiles || uploadedFiles.length === 0)) {
                    setMessages(prev => [...prev, { role: 'system', content: '분석할 URL을 추가하거나 파일을 업로드해주세요.' }]);
                    setIsLoading(false);
                    return;
                }

                let response;
                const baseConfig = {
                    whisper_model: 'large-v3',
                    whisper_lang: 'ko',
                    diarize: sttConfig.diarize,
                    make_summary: sttConfig.make_summary,
                    out_formats: 'txt'
                };

                // Case 1: File Upload (Priority)
                if (uploadedFiles.length > 0) {
                    const formData = new FormData();
                    uploadedFiles.forEach(file => {
                        formData.append('files', file);
                    });
                    formData.append('config', JSON.stringify(baseConfig));
                    formData.append('agentId', selectedAgentId);
                    if (conversationId) formData.append('conversationId', conversationId);

                    response = await fetch('/api/stt', {
                        method: 'POST',
                        body: formData, // No Content-Type header needed for FormData
                    });
                }
                // Case 2: URL Only
                else {
                    response = await fetch('/api/stt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            urls: uploadedUrls,
                            config: baseConfig,
                            agentId: selectedAgentId,
                            conversationId: conversationId
                        })
                    });
                }

                if (!response.ok) throw new Error('STT API failed');
                const data = await response.json();

                // Update conversation ID
                let currentConvId = conversationId;
                if (data.conversationId && data.conversationId !== conversationId) {
                    currentConvId = data.conversationId;
                    setConversationId(currentConvId);
                    if (onConversationChange) onConversationChange(currentConvId);
                }

                if (data.results && data.results.length > 0) {
                    for (const r of data.results) {
                        const output = r.output;
                        if (output && output.success && output.request_id) {
                            const loadingMsgId = Date.now() + Math.random();
                            setMessages(prev => [...prev, {
                                id: loadingMsgId,
                                role: 'assistant',
                                content: `분석을 시작합니다.\n최대 30초 정도 소요될 수 있습니다.`,
                                isPolling: true,
                                url: r.url,
                                agent_id: selectedAgentId,
                                conversation_id: currentConvId
                            }]);

                            pollSttResult(output.request_id, r.url, loadingMsgId, currentConvId);

                        } else if (r.error) {
                            setMessages(prev => [...prev, { role: 'assistant', content: `[오류 발생]\nURL: ${r.url}\n내용: ${r.error}`, agent_id: selectedAgentId }]);
                        }
                    }
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: "처리된 결과가 없습니다.", agent_id: selectedAgentId }]);
                }

            } else if (selectedAgentId === 'report-gen') {
                const previousContext = messages.map(msg => {
                    let contentToSend = msg.content;
                    if (typeof msg.content === 'object' && msg.content !== null) {
                        if (msg.content.merged_md) contentToSend = msg.content.merged_md;
                        else if (msg.content.summary_md) contentToSend = msg.content.summary_md;
                        else contentToSend = JSON.stringify(msg.content);
                    }
                    return { role: msg.role, content: contentToSend };
                });

                const response = await fetch('/api/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_input: currentInput,
                        previous_context: previousContext,
                        agentId: selectedAgentId,
                        conversationId: conversationId
                    })
                });

                if (!response.ok) throw new Error('Report API failed');
                const data = await response.json();

                if (data.conversationId && data.conversationId !== conversationId) {
                    setConversationId(data.conversationId);
                    if (onConversationChange) onConversationChange(data.conversationId);
                }

                let displayContent = data.report || "보고서 생성 결과가 없습니다.";

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: displayContent,
                    agent_id: selectedAgentId,
                    conversation_id: data.conversationId
                }]);


            } else if (selectedAgentId === 'spellcheck') {
                const previousContext = messages.map(msg => {
                    let contentToSend = msg.content;
                    if (typeof msg.content === 'object' && msg.content !== null) {
                        if (msg.content.merged_md) contentToSend = msg.content.merged_md;
                        else if (msg.content.summary_md) contentToSend = msg.content.summary_md;
                        else contentToSend = JSON.stringify(msg.content);
                    }
                    return { role: msg.role, content: contentToSend };
                });

                const response = await fetch('/api/spellcheck', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_input: currentInput,
                        previous_context: previousContext,
                        agentId: selectedAgentId,
                        conversationId: conversationId
                    })
                });

                if (!response.ok) throw new Error('Spell Check API failed');
                const data = await response.json();

                if (data.conversationId && data.conversationId !== conversationId) {
                    setConversationId(data.conversationId);
                    if (onConversationChange) onConversationChange(data.conversationId);
                }

                let displayContent = data.result || "검사 결과가 없습니다.";

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: displayContent,
                    agent_id: selectedAgentId,
                    conversation_id: data.conversationId
                }]);

            } else {
                await new Promise(resolve => setTimeout(resolve, 800));
                setMessages(prev => [...prev, { role: 'assistant', content: `[${selectedAgentName}] 기능은 아직 연동되지 않았습니다.`, agent_id: selectedAgentId }]);
            }

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: `서비스 연결에 실패했습니다. (${error.message})` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const pollSttResult = async (requestId, url, messageId, convId) => {
        const checkInterval = 3000;
        const maxAttempts = 100;
        let attempts = 0;

        const intervalId = setInterval(async () => {
            attempts++;
            try {
                // Polling API does NOT save to DB
                const res = await fetch(`/api/stt/result?request_id=${requestId}`);
                if (!res.ok) return;

                const data = await res.json();

                if (data.status === 'completed') {
                    clearInterval(intervalId);
                    const resultData = data.data;
                    let formattedContent = {};

                    if (resultData.success) {
                        formattedContent = resultData.content;
                        // Save to DB manually
                        await fetch('/api/chat/messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                conversationId: convId,
                                role: 'assistant',
                                content: JSON.stringify(formattedContent),
                                agentId: 'stt-summary'
                            })
                        });
                    } else {
                        formattedContent = `[분석 실패]\n${JSON.stringify(resultData, null, 2)}`;
                        // Save failure message too? Optional.
                    }

                    setMessages(prev => prev.map(msg => {
                        if (msg.id === messageId) {
                            return { ...msg, content: formattedContent, isPolling: false };
                        }
                        return msg;
                    }));

                } else if (data.status === 'processing') {
                    // processing...
                }

                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    setMessages(prev => prev.map(msg => {
                        if (msg.id === messageId) {
                            return { ...msg, content: `[시간 초과] 분석 시간이 너무 오래 걸립니다.\nrequest_id: ${requestId}`, isPolling: false };
                        }
                        return msg;
                    }));
                }

            } catch (error) {
                console.error("Polling error:", error);
            }
        }, checkInterval);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <main
            className="main-content"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="drag-overlay">
                    <div className="drag-message">
                        <span className="icon">📂</span>
                        <p>파일을 여기에 놓으세요</p>
                    </div>
                </div>
            )}
            <div className="chat-container" style={{ maxWidth: '100%' }}>
                {messages.length === 0 ? (
                    <div className="welcome-message">
                        <h1>무엇을 도와드릴까요?</h1>
                        <p>원하는 작업을 선택하거나 자연어로 질문해주세요.</p>
                    </div>
                ) : (
                    <div className="messages-area">
                        {messages.map((msg, idx) => {
                            const isReport = msg.role === 'assistant' && (msg.agent_id === 'report-gen' || (typeof msg.content === 'string' && (msg.content.startsWith('#') || msg.content.includes('**'))));

                            return (
                                <div key={idx} className={`message ${msg.role}`}>
                                    <div className={`message-content-wrapper ${isReport ? 'report-wrapper' : ''}`}>
                                        <div className={`message-bubble ${isReport ? 'report-bubble' : ''}`}>
                                            {msg.isPolling ? (
                                                <div className="polling-indicator">
                                                    <div className="spinner"></div>
                                                    <div className="polling-text">
                                                        <p>{typeof msg.content === 'string' ? msg.content : "처리 중..."}</p>
                                                        <span className="sub-text">잠시만 기다려주세요...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                (msg.role === 'assistant' || msg.role === 'system') ? (
                                                    (typeof msg.content === 'object' && msg.content !== null && msg.content.info) ? (
                                                        <STTResultCard data={msg.content} />
                                                    ) : (
                                                        // Handle Markdown for report agent or other markdown content
                                                        (isReport) ? (
                                                            <div className="markdown-content">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                                                                </ReactMarkdown>
                                                            </div>
                                                        ) : (
                                                            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                                                                {typeof msg.content === 'object' ? JSON.stringify(msg.content, null, 2) : msg.content}
                                                            </pre>
                                                        )
                                                    )
                                                ) : (
                                                    msg.content
                                                )
                                            )}
                                        </div>

                                        {/* Agent Label UI */}
                                        {msg.role === 'assistant' && msg.agent_id && AGENT_LABELS[msg.agent_id] && (
                                            <div className="agent-label">
                                                {AGENT_LABELS[msg.agent_id]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {isLoading && (
                            <div className="message assistant">
                                <div className="message-bubble typing-indicator">
                                    <span>.</span><span>.</span><span>.</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                <div className="input-area">
                    {selectedAgentId === 'stt-summary' && (
                        <div className="stt-options">
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={sttConfig.diarize}
                                    onChange={(e) => setSttConfig({ ...sttConfig, diarize: e.target.checked })}
                                />
                                <span className="checkmark"></span>
                                화자 분리 (Diarize)
                            </label>
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={sttConfig.make_summary}
                                    onChange={(e) => setSttConfig({ ...sttConfig, make_summary: e.target.checked })}
                                />
                                <span className="checkmark"></span>
                                요약 생성 (Summary)
                            </label>
                        </div>
                    )}

                    {/* URL Input Area (Inline) - Moved outside input-wrapper */}
                    {showUrlInput && (
                        <div className="url-input-inline">
                            <span className="icon">🔗</span>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={urlInputValue}
                                onChange={(e) => setUrlInputValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (urlInputValue.trim()) {
                                            onAddUrl(urlInputValue.trim());
                                            setUrlInputValue('');
                                            setShowUrlInput(false);
                                        }
                                    }
                                }}
                            />
                            <button className="add-btn" onClick={() => {
                                if (urlInputValue.trim()) {
                                    onAddUrl(urlInputValue.trim());
                                    setUrlInputValue('');
                                    setShowUrlInput(false);
                                }
                            }}>추가</button>
                            <button className="close-btn" onClick={() => setShowUrlInput(false)}>✕</button>
                        </div>
                    )}

                    <div className="input-wrapper">

                        {/* Attachment Preview Area */}
                        {(uploadedFiles?.length > 0 || uploadedUrls?.length > 0) && (
                            <div className="attachment-preview">
                                {uploadedFiles?.map((file, idx) => (
                                    <div key={`file-${idx}`} className="attachment-chip">
                                        <span className="icon">📄</span>
                                        <span className="name">{file.name}</span>
                                        <button onClick={() => onDeleteFile(idx)} className="delete-btn">×</button>
                                    </div>
                                ))}
                                {uploadedUrls?.map((url, idx) => (
                                    <div key={`url-${idx}`} className="attachment-chip">
                                        <span className="icon">🔗</span>
                                        <span className="name">{url}</span>
                                        <button onClick={() => onDeleteUrl(idx)} className="delete-btn">×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="input-row">
                            {/* Plus Button & Menu */}
                            <div className="attach-button-wrapper">
                                <button className="attach-btn" onClick={() => setShowAttachMenu(!showAttachMenu)}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>

                                {showAttachMenu && (
                                    <div className="attach-menu">
                                        <button onClick={() => { fileInputRef.current.click(); setShowAttachMenu(false); }}>
                                            <span className="icon">📁</span> 파일 업로드
                                        </button>
                                        <button onClick={() => { setShowUrlInput(true); setShowAttachMenu(false); }}>
                                            <span className="icon">🔗</span> URL 추가
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files?.length > 0) {
                                            onAddFiles(Array.from(e.target.files));
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>

                            <textarea
                                placeholder={selectedAgentId === 'stt-summary' ? "URL을 추가하거나 메시지를 입력하세요..." : "메시지를 입력하세요..."}
                                rows="1"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            ></textarea>
                            <button className="send-btn" onClick={handleSendMessage} disabled={isLoading || (!input.trim() && (!uploadedUrls || uploadedUrls.length === 0) && (!uploadedFiles || uploadedFiles.length === 0))}>
                                전송
                            </button>
                        </div>
                    </div>

                    <div className="selected-agent-indicator" style={{ display: selectedAgentName ? 'inline-block' : 'none' }}>
                        선택된 Agent: <span>{selectedAgentName || '없음'}</span>
                    </div>
                </div>


            </div>

            <style jsx>{`
                .messages-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    max-height: calc(100vh - 240px);
                }
                .message {
                    display: flex;
                    width: 100%;
                    max-width: 850px;
                    margin: 0 auto;
                }
                .message-content-wrapper {
                    display: flex;
                    flex-direction: column;
                    max-width: 70%;
                }
                .message.user {
                    justify-content: flex-end;
                }
                .message.user .message-content-wrapper {
                    align-items: flex-end;
                }
                .message.assistant {
                    justify-content: flex-start;
                }
                .message.assistant .message-content-wrapper {
                    align-items: flex-start;
                }
                
                .message-bubble {
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 15px;
                    line-height: 1.5;
                }
                .message.user .message-bubble {
                    background-color: #007AFF;
                    color: white;
                    border-bottom-right-radius: 4px;
                    white-space: pre-wrap;
                }
                .message.assistant .message-bubble {
                    background-color: #f2f2f7;
                    color: #1c1c1e;
                    border-bottom-left-radius: 4px;
                    border: 1px solid #e5e5ea;
                }

                /* Report / Markdown Specific Styles */
                .message-content-wrapper.report-wrapper {
                    max-width: 90%; /* Wider for reports */
                }
                .message.assistant .message-bubble.report-bubble {
                    background-color: #ffffff;
                    border: 1px solid #e1e1e6;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
                    padding: 30px; /* More padding like a document */
                    border-radius: 16px;
                }

                .agent-label {
                    font-size: 11px;
                    color: #8e8e93;
                    margin-top: 4px;
                    margin-left: 2px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .stt-options {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 8px;
                    padding: 0 4px;
                }
                .checkbox-container {
                    display: flex;
                    align-items: center;
                    font-size: 14px;
                    cursor: pointer;
                    user-select: none;
                }
                .checkbox-container input {
                    margin-right: 8px;
                    cursor: pointer;
                }
                
                 /* Polling / Loading Styles */
                .polling-indicator {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(0, 122, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #007AFF;
                    animation: spin 1s ease-in-out infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .polling-text p { margin: 0; font-weight: 500; }
                .polling-text .sub-text { font-size: 12px; color: #666; margin-top: 2px; display: block; }

                 @media (prefers-color-scheme: dark) {
                    .message.assistant .message-bubble {
                        background-color: #2c2c2e;
                        color: white;
                        border-color: #3a3a3c;
                    }
                    .message.assistant .message-bubble.report-bubble {
                        background-color: #1c1c1e;
                        border-color: #333;
                    }
                    .polling-text .sub-text { color: #a0a0a0; }
                    .spinner { border: 3px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; }
                }

                .input-area { max-width: 850px; margin: 0 auto; width: 100%; }
                .welcome-message { max-width: 850px; margin: 0 auto; width: 100%; }
                
                /* New Styles for Attachment */
                .input-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    border: 1px solid #e1e1e6;
                    border-radius: 20px;
                    padding: 8px 12px;
                    background: white;
                }
                
                .input-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                }

                .input-wrapper textarea {
                    border: none;
                    background: transparent;
                    resize: none;
                    max-height: 120px;
                    padding: 8px 0;
                    flex: 1;
                    outline: none;
                    font-size: 15px;
                    line-height: 1.5;
                }

                .attach-button-wrapper {
                    position: relative;
                }

                .attach-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #f2f2f7;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #666;
                    transition: all 0.2s;
                }
                .attach-btn:hover {
                    background: #e5e5ea;
                    color: #007AFF;
                }

                .attach-menu {
                    position: absolute;
                    bottom: 40px;
                    left: 0;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 140px;
                    z-index: 100;
                    border: 1px solid #eee;
                }
                .attach-menu button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border: none;
                    background: none;
                    text-align: left;
                    font-size: 14px;
                    cursor: pointer;
                    border-radius: 8px;
                    color: #333;
                    white-space: nowrap;
                }
                .attach-menu button:hover {
                    background: #f5f5f7;
                }
                .attach-menu .icon { font-size: 16px; }

                .attachment-preview {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding-bottom: 4px;
                }
                .attachment-chip {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: #f2f2f7;
                    padding: 4px 10px;
                    border-radius: 16px;
                    font-size: 13px;
                    color: #333;
                    border: 1px solid #e5e5ea;
                }
                .attachment-chip .name {
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .attachment-chip .delete-btn {
                    border: none;
                    background: #ccc;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    color: white;
                    cursor: pointer;
                    padding: 0;
                }
                .attachment-chip .delete-btn:hover { background: #999; }

                .url-input-inline {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: white;
                    border: 1px solid #e1e1e6;
                    border-radius: 16px;
                    padding: 12px 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    animation: slideUp 0.2s ease-out;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .url-input-inline .icon { font-size: 16px; }
                .url-input-inline input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    outline: none;
                }
                .url-input-inline .add-btn {
                    font-size: 13px;
                    color: #007AFF;
                    font-weight: 500;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px 8px;
                }
                 .url-input-inline .add-btn:hover { background: #e5f1ff; border-radius: 6px; }

                .url-input-inline .close-btn {
                    font-size: 14px;
                    color: #999;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .url-input-inline .close-btn:hover { color: #666; }

                .send-btn { margin-left: auto; height: 36px; padding: 0 20px; border-radius: 18px;}

                /* Drag Overlay */
                .drag-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 122, 255, 0.1);
                    border: 2px dashed #007AFF;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    pointer-events: none; /* Let events pass through locally if needed, but here acts as visual block */
                }
                .drag-message {
                    background: white;
                    padding: 20px 40px;
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                }
                .drag-message .icon { font-size: 32px; }
                .drag-message p { margin: 0; font-weight: 600; color: #007AFF; font-size: 18px; }

                /* Markdown Styles */
                .markdown-content {
                    line-height: 1.7;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: #2c3e50;
                }
                @media (prefers-color-scheme: dark) {
                    .markdown-content { color: #e1e1e6; }
                     .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: #fff; }
                }
                
                .markdown-content h1 {
                    font-size: 1.6em;
                    padding-bottom: 0.3em;
                    border-bottom: 1px solid #eaecef;
                    margin-top: 24px;
                    margin-bottom: 16px;
                }
                .markdown-content h1:first-child { margin-top: 0; }
                
                .markdown-content h2 {
                    font-size: 1.4em;
                    padding-bottom: 0.3em;
                    margin-top: 24px;
                    margin-bottom: 16px;
                }
                
                .markdown-content h3 {
                    font-size: 1.2em;
                    margin-top: 20px;
                    margin-bottom: 12px;
                }

                .markdown-content p {
                    margin-bottom: 16px;
                }
                
                .markdown-content ul, .markdown-content ol {
                    padding-left: 24px;
                    margin-bottom: 16px;
                }
                
                .markdown-content li {
                    margin-bottom: 6px;
                }
                .markdown-content li::marker {
                    color: #007AFF; /* Bullet color */
                }

                .markdown-content strong {
                    font-weight: 700;
                    color: #1a1a1a;
                }
                @media (prefers-color-scheme: dark) {
                    .markdown-content strong { color: #fff; }
                }

                .markdown-content blockquote {
                    padding: 0 1em;
                    color: #6a737d;
                    border-left: 0.25em solid #dfe2e5;
                    margin: 0 0 16px 0;
                }

            `}</style>
        </main >
    );
};

export default ChatInterface;
