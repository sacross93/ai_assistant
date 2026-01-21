'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SidebarHistory from '@/components/SidebarHistory';
import ChatInterface from '@/components/ChatInterface';
import SidebarTools from '@/components/SidebarTools';
import AgentModal from '@/components/AgentModal';
import { agents } from '@/data/agents';

function HomeContent() {
    // State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [modalAgentId, setModalAgentId] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedUrls, setUploadedUrls] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);

    // RAG Document States
    const [ragDocuments, setRagDocuments] = useState([]);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [useAllDocs, setUseAllDocs] = useState(true);

    const router = useRouter();
    const searchParams = useSearchParams();

    // Fetch RAG documents when doc-chat agent is selected
    useEffect(() => {
        if (selectedAgentId === 'doc-chat') {
            fetchRagDocuments();
        }
    }, [selectedAgentId]);

    const fetchRagDocuments = async () => {
        try {
            const res = await fetch('/api/doc-chat/docs');
            if (res.ok) {
                const data = await res.json();
                setRagDocuments(data.documents || []);
            }
        } catch (error) {
            console.error('Failed to fetch RAG documents:', error);
        }
    };

    const handleToggleDocSelection = (docId) => {
        setSelectedDocIds(prev => {
            if (prev.includes(docId)) {
                return prev.filter(id => id !== docId);
            } else {
                return [...prev, docId];
            }
        });
        // 문서를 선택하면 전체 문서 모드 해제
        setUseAllDocs(false);
    };

    const handleToggleAllDocs = () => {
        setUseAllDocs(prev => !prev);
        if (!useAllDocs) {
            setSelectedDocIds([]); // 전체 문서 모드 시 개별 선택 해제
        }
    };

    const handleDeleteRagDocument = async (docId) => {
        try {
            const res = await fetch(`/api/doc-chat/docs?doc_id=${docId}`, { method: 'DELETE' });
            if (res.ok) {
                setRagDocuments(prev => prev.filter(d => d.doc_id !== docId));
                setSelectedDocIds(prev => prev.filter(id => id !== docId));
            }
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    // Effect to toggle body class for history sidebar styling
    useEffect(() => {
        if (isHistoryOpen) {
            document.body.classList.add('history-open');
        } else {
            document.body.classList.remove('history-open');
        }
    }, [isHistoryOpen]);

    // Effect: Sync URL query param -> State
    // 브라우저 새로고침이나 뒤로가기 시 URL에 있는 conversationId를 복구합니다.
    useEffect(() => {
        const paramId = searchParams.get('conversationId');
        if (paramId !== currentConversationId) {
            setCurrentConversationId(paramId || null);
        }
    }, [searchParams, currentConversationId]);

    // Handlers
    const toggleHistory = () => {
        setIsHistoryOpen(prev => !prev);
    };

    const handleSelectConversation = (convId) => {
        // 상태를 직접 변경하기보다 URL을 변경하여 위 useEffect가 처리하도록 함 (Single Source of Truth)
        router.push(`/?conversationId=${convId}`);
    };

    const handleConversationChange = (newConvId) => {
        // 새 대화가 생성되었을 때 URL을 업데이트 (replace로 히스토리 꼬임 방지)
        router.replace(`/?conversationId=${newConvId}`);
    };

    const handleNewChat = () => {
        // URL 파라미터 제거 -> useEffect가 감지하여 setCurrentConversationId(null) 수행
        router.push('/');
        // 모바일 등에서 자동으로 사이드바 닫히는 동작은 SidebarHistory 내부에서 처리됨
    };

    const handleSelectAgent = (agentId) => {
        setSelectedAgentId(prev => prev === agentId ? null : agentId);
    };

    const handleOpenModal = (agentId) => {
        setModalAgentId(agentId);
    };

    const handleCloseModal = () => {
        setModalAgentId(null);
    };

    const handleUseAgentFromModal = (agentId) => {
        setSelectedAgentId(agentId);
    };

    const handleAddFiles = (newFiles) => {
        setUploadedFiles(prev => [...prev, ...newFiles]);
    };

    const handleDeleteFile = (indexToRemove) => {
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleAddUrl = (newUrl) => {
        setUploadedUrls(prev => [...prev, newUrl]);
    };

    const handleDeleteUrl = (indexToRemove) => {
        setUploadedUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleClearAttachments = () => {
        setUploadedFiles([]);
        setUploadedUrls([]);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    }

    // Derived State
    const selectedAgent = agents.find(a => a.id === selectedAgentId);
    const modalAgent = agents.find(a => a.id === modalAgentId);

    return (
        <>
            <div className="app-container">
                {/* Left Sidebar */}
                <SidebarHistory
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    onSelectConversation={handleSelectConversation}
                    onNewChat={handleNewChat}
                />

                {/* History Toggle Button */}
                <button
                    className="history-toggle-btn"
                    id="historyToggleBtn"
                    onClick={toggleHistory}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>기록</span>
                </button>

                {/* Main Content */}
                <ChatInterface
                    selectedAgentName={selectedAgent ? selectedAgent.name : null}
                    selectedAgentId={selectedAgentId}
                    uploadedUrls={uploadedUrls}
                    uploadedFiles={uploadedFiles}
                    onAddFiles={handleAddFiles}
                    onDeleteFile={handleDeleteFile}
                    onAddUrl={handleAddUrl}
                    onDeleteUrl={handleDeleteUrl}
                    onClearAttachments={handleClearAttachments}
                    currentConversationId={currentConversationId}
                    onConversationChange={handleConversationChange}
                    selectedDocIds={selectedDocIds}
                    useAllDocs={useAllDocs}
                    onDocumentUploaded={fetchRagDocuments}
                />

                {/* Right Sidebar */}
                <SidebarTools
                    agents={agents}
                    selectedAgentId={selectedAgentId}
                    onSelectAgent={handleSelectAgent}
                    onOpenModal={handleOpenModal}
                    onLogout={handleLogout}
                    ragDocuments={ragDocuments}
                    selectedDocIds={selectedDocIds}
                    useAllDocs={useAllDocs}
                    onToggleDocSelection={handleToggleDocSelection}
                    onToggleAllDocs={handleToggleAllDocs}
                    onDeleteDocument={handleDeleteRagDocument}
                />
            </div>

            {/* Modal */}
            <AgentModal
                agent={modalAgent || null}
                onClose={handleCloseModal}
                onUseAgent={handleUseAgentFromModal}
            />
        </>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <HomeContent />
        </Suspense>
    );
}
