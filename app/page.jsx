'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SidebarHistory from '@/components/SidebarHistory';
import ChatInterface from '@/components/ChatInterface';
import SidebarTools from '@/components/SidebarTools';
import AgentModal from '@/components/AgentModal';
import { agents } from '@/data/agents';

export default function Home() {
    // State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [modalAgentId, setModalAgentId] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedUrls, setUploadedUrls] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const router = useRouter();

    // Effect to toggle body class for history sidebar styling
    useEffect(() => {
        if (isHistoryOpen) {
            document.body.classList.add('history-open');
        } else {
            document.body.classList.remove('history-open');
        }
    }, [isHistoryOpen]);

    // Handlers
    const toggleHistory = () => {
        setIsHistoryOpen(prev => !prev);
    };

    const handleSelectConversation = (convId) => {
        setCurrentConversationId(convId);
        // Ensure to clear inputs or reset states if needed
    };

    const handleConversationChange = (newConvId) => {
        setCurrentConversationId(newConvId);
    };

    const handleNewChat = () => {
        setCurrentConversationId(null);
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
                />

                {/* Right Sidebar */}
                <SidebarTools
                    agents={agents}
                    selectedAgentId={selectedAgentId}
                    onSelectAgent={handleSelectAgent}
                    onOpenModal={handleOpenModal}
                    onLogout={handleLogout}
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
