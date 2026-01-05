
import React, { useState, useEffect, useRef } from 'react';
import STTResultCard from './STTResultCard';

const AGENT_LABELS = {
    'translate_language': '번역 에이전트',
    'stt-summary': '영상 분석 에이전트',
};

/**
 * ChatInterface Component
 * Main chat area.
 * 
 * Props:
 * - selectedAgentName: string
 * - selectedAgentId: string
 * - uploadedUrls: array
 * - currentConversationId: number | null (Optional, from parent)
 * - onConversationChange: function (Optional, to notify parent of new conversation)
 */
const ChatInterface = ({ selectedAgentName, selectedAgentId, uploadedUrls, currentConversationId = null, onConversationChange }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(currentConversationId);

    const messagesEndRef = useRef(null);

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
                setMessages(parsedMessages);
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
        if (!input.trim() && uploadedUrls?.length === 0) return;

        if (!selectedAgentId) {
            const errorMessage = { role: 'system', content: '먼저 사용할 기능을 오른쪽 사이드바에서 선택해주세요.' };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        const currentInput = input;
        // 사용자 메시지 표시 (URL이 있으면 함께 표시)
        let displayContent = currentInput;
        if (selectedAgentId === 'stt-summary' && uploadedUrls?.length > 0) {
            displayContent = `[URL 분석 요청] ${uploadedUrls.join(', ')}\n${currentInput}`;
        }

        // Optimistic Update
        const tempMsgId = Date.now();
        const userMessage = { role: 'user', content: displayContent, id: tempMsgId };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
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
                if (!uploadedUrls || uploadedUrls.length === 0) {
                    setMessages(prev => [...prev, { role: 'system', content: '분석할 URL을 오른쪽 사이드바에서 추가해주세요.' }]);
                    setIsLoading(false);
                    return;
                }

                const response = await fetch('/api/stt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        urls: uploadedUrls,
                        config: {
                            whisper_model: 'large-v3',
                            whisper_lang: 'ko',
                            diarize: sttConfig.diarize,
                            make_summary: sttConfig.make_summary,
                            out_formats: 'txt'
                        },
                        agentId: selectedAgentId,
                        conversationId: conversationId
                    })
                });

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

            } else {
                await new Promise(resolve => setTimeout(resolve, 800));
                setMessages(prev => [...prev, { role: 'assistant', content: `[${selectedAgentName}] 기능은 아직 연동되지 않았습니다.`, agent_id: selectedAgentId }]);
            }

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: '서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' }]);
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
        <main className="main-content">
            <div className="chat-container" style={{ maxWidth: '100%' }}>
                {messages.length === 0 ? (
                    <div className="welcome-message">
                        <h1>무엇을 도와드릴까요?</h1>
                        <p>원하는 작업을 선택하거나 자연어로 질문해주세요.</p>
                    </div>
                ) : (
                    <div className="messages-area">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.role}`}>
                                <div className="message-content-wrapper">
                                    <div className="message-bubble">
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
                                                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                                                        {typeof msg.content === 'object' ? JSON.stringify(msg.content, null, 2) : msg.content}
                                                    </pre>
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
                        ))}
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

                    <div className="input-wrapper">
                        <textarea
                            placeholder={selectedAgentId === 'stt-summary' ? "URL을 추가하고 엔터를 누르세요..." : "메시지를 입력하세요..."}
                            rows="1"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        ></textarea>
                        <button className="send-btn" onClick={handleSendMessage} disabled={isLoading || (!input.trim() && (!uploadedUrls || uploadedUrls.length === 0))}>
                            전송
                        </button>
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
                }
                .message.assistant .message-bubble {
                    background-color: #f2f2f7;
                    color: #1c1c1e;
                    border-bottom-left-radius: 4px;
                    border: 1px solid #e5e5ea;
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
                    .polling-text .sub-text { color: #a0a0a0; }
                    .spinner { border: 3px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; }
                }

                .input-area { max-width: 850px; margin: 0 auto; width: 100%; }
                .welcome-message { max-width: 850px; margin: 0 auto; width: 100%; }
            `}</style>
        </main>
    );
};

export default ChatInterface;
