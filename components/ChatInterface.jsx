import React, { useState, useEffect, useRef } from 'react';
import STTResultCard from './STTResultCard';

/**
 * ChatInterface Component
 * Main chat area.
 * 
 * Props:
 * - selectedAgentName: string
 * - selectedAgentId: string
 * - uploadedUrls: array
 */
const ChatInterface = ({ selectedAgentName, selectedAgentId, uploadedUrls }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

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

        const userMessage = { role: 'user', content: displayContent };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (selectedAgentId === 'translate_language') {
                // ... (이전 번역 로직 유지)
                const previousContext = messages.map(msg => {
                    let contentToSend = msg.content;
                    if (typeof msg.content === 'object' && msg.content !== null) {
                        // STT 결과 객체인 경우, 번역에 도움이 되는 텍스트 부분만 추출하거나 문자열로 변환
                        if (msg.content.merged_md) {
                            contentToSend = msg.content.merged_md;
                        } else if (msg.content.summary_md) {
                            contentToSend = msg.content.summary_md; // fallback
                        } else {
                            contentToSend = JSON.stringify(msg.content);
                        }
                    }
                    return {
                        role: msg.role,
                        content: contentToSend
                    };
                });

                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_input: currentInput,
                        previous_context: previousContext,
                        agentId: selectedAgentId
                    })
                });

                if (!response.ok) throw new Error('API connection failed');
                const data = await response.json();

                let displayContent = '';
                if (data.translated) displayContent = data.translated;
                else if (data.error) displayContent = `오류 발생: ${data.error}`;
                else displayContent = "번역된 텍스트를 찾을 수 없습니다.";

                setMessages(prev => [...prev, { role: 'assistant', content: displayContent }]);

            } else if (selectedAgentId === 'stt-summary') {
                // STT 로직
                if (!uploadedUrls || uploadedUrls.length === 0) {
                    setMessages(prev => [...prev, { role: 'system', content: '분석할 URL을 오른쪽 사이드바에서 추가해주세요.' }]);
                    setIsLoading(false);
                    return;
                }

                // 여러 URL 처리? 일단 첫 번째 URL만 예시로 처리하거나 백엔드에서 루프 돌림
                // 여기서는 리스트 전체를 백엔드로 보냄
                const response = await fetch('/api/stt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        urls: uploadedUrls,
                        config: {
                            whisper_model: 'large-v3',
                            whisper_lang: 'ko', // 기본 한국어, 필요시 입력 분석하여 변경 가능
                            diarize: sttConfig.diarize,
                            make_summary: sttConfig.make_summary,
                            out_formats: 'txt'
                        },
                        agentId: selectedAgentId
                    })
                });

                if (!response.ok) throw new Error('STT API failed');
                const data = await response.json(); // 응답은 텍스트 형태일 수도 있고 JSON일 수도 있음.

                // 결과 처리 시작
                if (data.results && data.results.length > 0) {
                    for (const r of data.results) {
                        const output = r.output;
                        if (output && output.success && output.request_id) {
                            // 작업 시작 메시지 추가
                            const loadingMsgId = Date.now() + Math.random();
                            setMessages(prev => [...prev, {
                                id: loadingMsgId,
                                role: 'assistant',
                                content: `분석을 시작합니다.\n최대 30초 정도 소요될 수 있습니다.`,
                                isPolling: true,
                                url: r.url
                            }]);

                            // 비동기 폴링 시작
                            pollSttResult(output.request_id, r.url, loadingMsgId);

                        } else if (r.error) {
                            setMessages(prev => [...prev, { role: 'assistant', content: `[오류 발생]\nURL: ${r.url}\n내용: ${r.error}` }]);
                        } else {
                            setMessages(prev => [...prev, { role: 'assistant', content: `[알 수 없는 응답]\n${JSON.stringify(r)}` }]);
                        }
                    }
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: "처리된 결과가 없습니다." }]);
                }

            } else {
                await new Promise(resolve => setTimeout(resolve, 800));
                setMessages(prev => [...prev, { role: 'assistant', content: `[${selectedAgentName}] 기능은 아직 연동되지 않았습니다.` }]);
            }

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: '서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // 폴링 로직
    const pollSttResult = async (requestId, url, messageId) => {
        const checkInterval = 3000; // 3초마다 확인
        const maxAttempts = 100; // 최대 5분 대기 (3s * 100)
        let attempts = 0;

        const intervalId = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`/api/stt/result?request_id=${requestId}`);
                if (!res.ok) {
                    console.log('Polling waiting...');
                    return;
                }

                const data = await res.json();

                if (data.status === 'completed') {
                    clearInterval(intervalId);

                    const resultData = data.data;
                    let formattedContent = '';

                    console.log("Polling Result Data:", resultData);

                    if (resultData.success) {
                        // 결과가 성공적이면 객체 그대로 저장 -> 렌더링 시 STTResultCard가 감지
                        formattedContent = resultData.content;
                    } else {
                        formattedContent = `[분석 실패] 작업은 완료되었으나 성공하지 못했습니다.\n${JSON.stringify(resultData, null, 2)}`;
                    }

                    setMessages(prev => prev.map(msg => {
                        if (msg.id === messageId) {
                            return { ...msg, content: formattedContent, isPolling: false };
                        }
                        return msg;
                    }));

                } else if (data.status === 'processing') {
                    // 아직 처리 중
                }

                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    setMessages(prev => prev.map(msg => {
                        if (msg.id === messageId) {
                            return { ...msg, content: `[시간 초과] 분석 시간이 너무 오래 걸립니다.\n나중에 request_id: ${requestId} 로 다시 조회해보세요.`, isPolling: false };
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
                                <div className="message-bubble">
                                    {msg.isPolling ? (
                                        <div className="polling-indicator">
                                            <div className="spinner"></div>
                                            <div className="polling-text">
                                                <p>{msg.content}</p>
                                                <span className="sub-text">잠시만 기다려주세요...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        (msg.role === 'assistant' || msg.role === 'system') ? (
                                            /* STT 데이터 감지: content가 객체이고 info 필드를 가지고 있는 경우 */
                                            (typeof msg.content === 'object' && msg.content !== null && msg.content.info) ? (
                                                <STTResultCard data={msg.content} />
                                            ) : (
                                                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                                    {typeof msg.content === 'object' ? JSON.stringify(msg.content, null, 2) : msg.content}
                                                </pre>
                                            )
                                        ) : (
                                            msg.content
                                        )
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
                    {/* STT Options (Only visible when STT agent is selected) */}
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

                    {/* Selected Agent Indicator */}
                    <div className="selected-agent-indicator" id="selectedAgentIndicator" style={{ display: selectedAgentName ? 'inline-block' : 'none' }}>
                        선택된 Agent: <span id="currentAgentName">{selectedAgentName || '없음'}</span>
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
                    max-height: calc(100vh - 240px); /* Adjust for options */
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
                
                /* Reuse previous styles */
                /* .message style is moved below for layout fix */
                .message.user {
                    justify-content: flex-end;
                }
                .message.assistant, .message.system {
                    justify-content: flex-start;
                }
                .message-bubble {
                    max-width: 70%;
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
                 .message.system .message-bubble {
                    background-color: #ffcc00;
                    color: #1c1c1e;
                }

                /* Polling / Loading Styles */
                .polling-indicator {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                /* Layout Fix: Scrollbar at edge, content centered */
                .welcome-message {
                    max-width: 850px;
                    margin: 0 auto;
                    width: 100%;
                }
                .input-area {
                    max-width: 850px;
                    margin: 0 auto;
                    width: 100%;
                }
                .message {
                    display: flex;
                    width: 100%;
                    max-width: 850px;
                    margin-left: auto;
                    margin-right: auto;
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
                .polling-text p {
                    margin: 0;
                    font-weight: 500;
                }
                .polling-text .sub-text {
                    font-size: 12px;
                    color: #666;
                    margin-top: 2px;
                    display: block;
                }

                /* Custom Scrollbar for Messages Area */
                .messages-area::-webkit-scrollbar {
                    width: 6px;
                }
                .messages-area::-webkit-scrollbar-track {
                    background: transparent;
                }
                .messages-area::-webkit-scrollbar-thumb {
                    background-color: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                }
                .messages-area::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(0, 0, 0, 0.2);
                }

                @media (prefers-color-scheme: dark) {
                    .message.assistant .message-bubble {
                        background-color: #2c2c2e;
                        color: white;
                        border-color: #3a3a3c;
                    }
                    .polling-text .sub-text {
                        color: #a0a0a0;
                    }
                    .spinner {
                         border: 3px solid rgba(255, 255, 255, 0.3);
                         border-top-color: #fff;
                    }
                    /* Dark mode scrollbar */
                    .messages-area::-webkit-scrollbar-thumb {
                        background-color: rgba(255, 255, 255, 0.2);
                    }
                    .messages-area::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(255, 255, 255, 0.3);
                    }
                }
            `}</style>
        </main>
    );
};

export default ChatInterface;
