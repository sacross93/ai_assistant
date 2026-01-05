import React, { useState } from 'react';

/**
 * STTResultCard
 * STT 및 요약 결과를 탭 형태로 깔끔하게 보여주는 컴포넌트
 */
const STTResultCard = ({ data }) => {
    const { info, summary_md, transcript_md, merged_md } = data;
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'transcript'
    const [isCopied, setIsCopied] = useState(false);

    // 시간 포맷팅 (초 -> mm:ss)
    const formatDuration = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}분 ${sec}초`;
    };

    // 요약 내용 파싱
    const parseSummary = (text) => {
        if (!text) return { oneLine: '', points: [], body: '' };

        const lines = text.split('\n');
        let oneLine = '';
        let points = [];
        let bodyLines = [];
        let section = ''; // 'oneLine', 'points', 'body'

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('# # 한 줄 요약:')) {
                oneLine = trimmed.replace('# # 한 줄 요약:', '').trim();
                section = 'oneLine';
            } else if (trimmed.startsWith('# # 핵심 포인트')) {
                section = 'points';
            } else if (trimmed.startsWith('# # 요약문')) {
                section = 'body';
            } else if (trimmed.startsWith('- ') && section === 'points') {
                points.push(trimmed.slice(2)); // '- ' 제거
            } else if (section === 'body' && trimmed.length > 0) {
                // 헤더가 아닌 일반 텍스트만
                if (!trimmed.startsWith('#')) {
                    bodyLines.push(trimmed);
                }
            }
        });

        return { oneLine, points, body: bodyLines.join('\n') };
    };

    // 전사 내용 파싱
    const parseTranscript = (text) => {
        if (!text) return [];
        const lines = text.split('\n');
        const transcript = [];
        // 예: - **참여자 1** [00:00.00–00:02.72]: 내용
        const regex = /^\- \*\*(.*?)\*\* \[(.*?)\]: (.*)/;

        lines.forEach(line => {
            const match = line.match(regex);
            if (match) {
                transcript.push({
                    speaker: match[1],
                    time: match[2].split('–')[0], // 시작 시간만 표시
                    text: match[3]
                });
            }
        });
        return transcript;
    };

    const summaryData = parseSummary(summary_md);
    const transcriptData = parseTranscript(transcript_md);

    // 복사 기능
    const handleCopy = () => {
        if (!merged_md) return;
        navigator.clipboard.writeText(merged_md).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="stt-result-card">
            {/* Header */}
            <div className="card-header">
                <div className="video-title">
                    <a href={info?.webpage_url} target="_blank" rel="noopener noreferrer">
                        📺 {info?.title || '제목 없음'}
                    </a>
                </div>
                <div className="video-meta">
                    <span className="uploader">👤 {info?.uploader}</span>
                    <span className="separator">|</span>
                    <span className="duration">⏱ {formatDuration(info?.duration_sec || 0)}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="card-tabs">
                <button
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    📌 요약 보기
                </button>
                <button
                    className={`tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transcript')}
                >
                    📝 전체 스크립트 ({transcriptData.length})
                </button>
            </div>

            {/* Content Area */}
            <div className="card-content">
                {activeTab === 'summary' ? (
                    <div className="summary-view">
                        {summaryData.oneLine && (
                            <div className="summary-section highlight">
                                <div className="section-title">💡 한 줄 요약</div>
                                <div className="section-text fw-bold">{summaryData.oneLine}</div>
                            </div>
                        )}

                        {summaryData.points.length > 0 && (
                            <div className="summary-section">
                                <div className="section-title">✅ 핵심 포인트</div>
                                <ul className="points-list">
                                    {summaryData.points.map((point, idx) => (
                                        <li key={idx}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {summaryData.body && (
                            <div className="summary-section">
                                <div className="section-title">📄 상세 요약</div>
                                <div className="section-text whitespace-pre-line">{summaryData.body}</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="transcript-view">
                        {transcriptData.length > 0 ? (
                            transcriptData.map((item, idx) => (
                                <div key={idx} className="transcript-item">
                                    <div className="ts-meta">
                                        <span className="ts-time">{item.time}</span>
                                        <span className="ts-speaker">{item.speaker}</span>
                                    </div>
                                    <div className="ts-text">{item.text}</div>
                                </div>
                            ))
                        ) : (
                            <div className="no-data">전사 내용이 없습니다.</div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="card-footer">
                <button className="copy-btn" onClick={handleCopy}>
                    {isCopied ? '✅ 복사 완료!' : '📄 전체 내용 복사'}
                </button>
            </div>

            <style jsx>{`
                .stt-result-card {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    border: 1px solid #e0e0e0;
                    margin-top: 8px;
                    width: 100%;
                    max-width: 100%;
                }
                .card-header {
                    padding: 16px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #eee;
                }
                .video-title a {
                    font-size: 16px;
                    font-weight: 700;
                    color: #333;
                    text-decoration: none;
                    display: block;
                    margin-bottom: 6px;
                }
                .video-title a:hover {
                    text-decoration: underline;
                    color: #007AFF;
                }
                .video-meta {
                    font-size: 13px;
                    color: #666;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .separator { color: #ccc; }

                /* Tabs */
                .card-tabs {
                    display: flex;
                    border-bottom: 1px solid #eee;
                    background: #fff;
                }
                .tab-btn {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    background: none;
                    font-size: 14px;
                    font-weight: 600;
                    color: #888;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-bottom: 2px solid transparent;
                }
                .tab-btn:hover {
                    background: #f5f5f7;
                    color: #333;
                }
                .tab-btn.active {
                    color: #007AFF;
                    border-bottom: 2px solid #007AFF;
                    background: #f0f7ff;
                }

                /* Content */
                .card-content {
                    padding: 0;
                    max-height: 500px;
                    overflow-y: auto;
                    background: #fff;
                }
                .summary-view {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .summary-section {
                    font-size: 14px;
                    line-height: 1.6;
                    color: #333;
                }
                .summary-section.highlight {
                    background: #f0f7ff;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #d0e3ff;
                }
                .section-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #888;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .section-text {
                    color: #222;
                }
                .fw-bold { font-weight: 600; }
                .whitespace-pre-line { white-space: pre-line; }
                
                .points-list {
                    margin: 0;
                    padding-left: 20px;
                }
                .points-list li {
                    margin-bottom: 6px;
                }

                /* Transcript View */
                .transcript-view {
                    padding: 0;
                }
                .transcript-item {
                    display: flex;
                    gap: 12px;
                    padding: 12px 20px;
                    border-bottom: 1px solid #f5f5f5;
                    font-size: 14px;
                }
                .transcript-item:last-child {
                    border-bottom: none;
                }
                .transcript-item:hover {
                    background: #fafafa;
                }
                .ts-meta {
                    display: flex;
                    flex-direction: column;
                    min-width: 80px;
                    gap: 2px;
                }
                .ts-time {
                    font-family: monospace;
                    font-size: 12px;
                    color: #007AFF;
                    font-weight: 500;
                }
                .ts-speaker {
                    font-size: 11px;
                    color: #999;
                }
                .ts-text {
                    flex: 1;
                    color: #333;
                    line-height: 1.5;
                }
                .no-data {
                    padding: 40px;
                    text-align: center;
                    color: #999;
                }

                /* Footer */
                .card-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eee;
                    background: #fcfcfc;
                    display: flex;
                    justify-content: flex-end;
                }
                .copy-btn {
                    padding: 6px 12px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    color: #555;
                    transition: all 0.2s;
                }
                .copy-btn:hover {
                    background: #f0f0f0;
                    border-color: #ccc;
                    color: #333;
                }

                /* Scrollbar Customization within Card */
                .card-content::-webkit-scrollbar {
                    width: 6px;
                }
                .card-content::-webkit-scrollbar-track {
                    background: transparent;
                }
                .card-content::-webkit-scrollbar-thumb {
                    background-color: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }
                .card-content::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(0, 0, 0, 0.2);
                }

                /* Dark Mode Support */
                @media (prefers-color-scheme: dark) {
                    .stt-result-card {
                        background: #1c1c1e;
                        border-color: #333;
                    }
                    .card-header, .card-tabs, .card-footer {
                        background: #252527;
                        border-color: #333;
                    }
                    .video-title a { color: #fff; }
                    .video-title a:hover { color: #0a84ff; }
                    .video-meta { color: #aaa; }
                    
                    .tab-btn { color: #888; background: #252527; }
                    .tab-btn:hover { background: #333; color: #fff; }
                    .tab-btn.active { color: #0a84ff; border-color: #0a84ff; background: #3a3a3c; }

                    .card-content { background: #1c1c1e; }
                    .summary-section.highlight {
                        background: #2c2c2e;
                        border-color: #3a3a3c;
                    }
                    .section-text { color: #ddd; }
                    
                    .transcript-item {
                        border-bottom-color: #2c2c2e;
                    }
                    .transcript-item:hover {
                        background: #2c2c2e;
                    }
                    .ts-time { color: #0a84ff; }
                    .ts-text { color: #ddd; }

                    .copy-btn {
                        background: #333;
                        border-color: #444;
                        color: #ccc;
                    }
                    .copy-btn:hover {
                        background: #444;
                        color: #fff;
                    }
                }
            `}</style>
        </div>
    );
};

export default STTResultCard;
