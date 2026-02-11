'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SlideOver from '@/components/SlideOver';
import AgentEditForm from '@/components/AgentEditForm';
import SortableAgentRow from '@/components/SortableAgentRow';

// DnD Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // User Action Modal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: null,
        userId: null,
        message: ''
    });

    // Agent Edit State
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);

    useEffect(() => {
        fetchUsers();
        fetchAgents();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/admin/agents');
            if (res.ok) {
                const data = await res.json();
                setAgents(data.agents);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
        }
    };

    // --- Agent Reordering (Drag End) ---
    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setAgents((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);

                const newAgents = arrayMove(items, oldIndex, newIndex);

                // Update indices
                newAgents.forEach((agent, i) => agent.order_index = i);

                // Save to DB
                saveAgentOrder(newAgents);

                return newAgents;
            });
        }
    };

    const saveAgentOrder = async (updatedAgents) => {
        try {
            await fetch('/api/admin/agents/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agents: updatedAgents.map(({ id, order_index }) => ({ id, order_index })) })
            });
        } catch (error) {
            console.error('Failed to save order:', error);
            alert('순서 저장 실패');
            fetchAgents();
        }
    };

    // --- Agent Editing (SlideOver) ---
    const handleEditAgent = (agent) => {
        setSelectedAgent(agent);
        setIsSlideOverOpen(true);
    };

    const handleSaveAgent = async (updatedAgent) => {
        // Optimistic Update
        setAgents(agents.map(a => a.id === updatedAgent.id ? updatedAgent : a));
        setIsSlideOverOpen(false); // Close immediately

        try {
            // Update Basic Info
            const res1 = await fetch('/api/admin/agents/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: updatedAgent.id,
                    name: updatedAgent.name,
                    description: updatedAgent.description,
                    features: updatedAgent.features
                })
            });

            // If visibility changed
            const res2 = await fetch('/api/admin/agents/toggle', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: updatedAgent.id,
                    isActive: updatedAgent.is_active
                })
            });

            if (!res1.ok || !res2.ok) {
                throw new Error('Failed to update agent');
            }
        } catch (error) {
            console.error('Update failed:', error);
            alert('업데이트 실패: ' + error.message);
            fetchAgents(); // Revert
        }
    };

    // --- User Actions ---
    const handleUpdateRole = async (userId, newRole) => {
        try {
            const res = await fetch('/api/admin/update-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole }),
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                const data = await res.json();
                alert(data.error || '권한 변경 실패');
            }
        } catch (error) {
            console.error(error);
            alert('오류 발생');
        }
    };

    const requestDeleteUser = (userId) => {
        setConfirmModal({
            isOpen: true,
            type: 'DELETE',
            userId,
            message: '정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        });
    };

    const requestResetPassword = (userId) => {
        setConfirmModal({
            isOpen: true,
            type: 'RESET',
            userId,
            message: '비밀번호를 "1234"로 초기화하시겠습니까?'
        });
    };

    const executeAction = async () => {
        const { type, userId } = confirmModal;

        try {
            if (type === 'DELETE') {
                const res = await fetch('/api/admin/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId }),
                });

                if (res.ok) {
                    setUsers(users.filter(u => u.id !== userId));
                } else {
                    const data = await res.json();
                    alert(data.error || '삭제 실패');
                }
            } else if (type === 'RESET') {
                const res = await fetch('/api/admin/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId }),
                });

                if (res.ok) {
                    alert('비밀번호가 초기화되었습니다.');
                } else {
                    alert('초기화 실패');
                }
            }
        } catch (error) {
            console.error(error);
            alert('오류 발생');
        } finally {
            setConfirmModal({ isOpen: false, type: null, userId: null, message: '' });
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>관리자 대시보드</h1>

            {/* Agent Management Section */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 12px', padding: '24px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>에이전트 관리</h2>
                <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
                    사이드바에 표시될 LLM Agent를 관리합니다. 왼쪽의 '≡' 아이콘을 드래그하여 순서를 변경할 수 있습니다.
                </p>

                <div style={{ overflowX: 'auto' }}> {/* Mobile Scroll */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ background: '#f2f4f6', textAlign: 'left' }}>
                                    <th style={{ padding: '12px', width: '80px', borderRadius: '8px 0 0 0', whiteSpace: 'nowrap', textAlign: 'center' }}>순서</th>
                                    <th style={{ padding: '12px', whiteSpace: 'nowrap' }}>Name / Description</th>
                                    <th style={{ padding: '12px', whiteSpace: 'nowrap' }}>ID</th>
                                    <th style={{ padding: '12px', whiteSpace: 'nowrap' }}>주요 기능</th>
                                    <th style={{ padding: '12px', whiteSpace: 'nowrap' }}>상태</th>
                                    <th style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap', borderRadius: '0 8px 0 0' }}>수정</th>
                                </tr>
                            </thead>
                            <tbody style={{ background: 'white' }}>
                                <SortableContext
                                    items={agents.map(a => a.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {agents.map((agent) => (
                                        <SortableAgentRow key={agent.id} agent={agent}>
                                            {/* Name & Desc */}
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontWeight: '600', color: '#333' }}>{agent.name}</div>
                                                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {agent.description}
                                                </div>
                                            </td>

                                            {/* ID */}
                                            <td style={{ padding: '12px', fontFamily: 'monospace', color: '#666', fontSize: '13px' }}>
                                                {agent.id}
                                            </td>

                                            {/* Features Count */}
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}>
                                                {agent.features?.length || 0}개 등록됨
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '12px' }}>
                                                <div style={{
                                                    display: 'inline-block',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    backgroundColor: agent.is_active ? '#e3f2fd' : '#f5f5f5',
                                                    color: agent.is_active ? '#2196f3' : '#9e9e9e',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {agent.is_active ? '사용 중' : '숨김'}
                                                </div>
                                            </td>

                                            {/* Edit Button */}
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleEditAgent(agent)}
                                                    style={{
                                                        padding: '6px 14px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #d1d6db',
                                                        background: 'white',
                                                        color: '#333',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = '#f8f9fa';
                                                        e.target.style.borderColor = '#c0c4c7';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'white';
                                                        e.target.style.borderColor = '#d1d6db';
                                                    }}
                                                >
                                                    편집
                                                </button>
                                            </td>
                                        </SortableAgentRow>
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                    </DndContext>
                </div>
            </div>

            {/* User Management Section */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 12px', padding: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>사용자 관리</h2>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ background: '#f2f4f6', textAlign: 'left' }}>
                                <th style={{ padding: '12px', borderRadius: '8px 0 0 8px' }}>User ID</th>
                                <th style={{ padding: '12px' }}>Name</th>
                                <th style={{ padding: '12px' }}>Username</th>
                                <th style={{ padding: '12px' }}>Role</th>
                                <th style={{ padding: '12px' }}>비밀번호</th>
                                <th style={{ padding: '12px', borderRadius: '0 8px 8px 0' }}>계정 관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #e5e8eb' }}>
                                    <td style={{ padding: '12px' }}>{user.id}</td>
                                    <td style={{ padding: '12px' }}>{user.name}</td>
                                    <td style={{ padding: '12px' }}>{user.username}</td>
                                    <td style={{ padding: '12px' }}>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #e5e8eb',
                                                fontSize: '14px',
                                                backgroundColor: user.role === 'admin' ? '#e8f3ff' : 'white',
                                                color: user.role === 'admin' ? '#3182f6' : '#333',
                                                fontWeight: '500'
                                            }}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <button
                                            onClick={() => requestResetPassword(user.id)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                borderRadius: '6px',
                                                border: '1px solid #e5e8eb',
                                                background: 'white',
                                                cursor: 'pointer',
                                                color: '#333'
                                            }}
                                        >
                                            초기화
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <button
                                            onClick={() => requestDeleteUser(user.id)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                borderRadius: '6px',
                                                border: '1px solid #e5e8eb',
                                                background: '#fff5f5',
                                                cursor: 'pointer',
                                                color: '#e93e2f'
                                            }}
                                        >
                                            계정 삭제
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p style={{ marginTop: '16px', fontSize: '13px', color: '#8b95a1' }}>
                    * 비밀번호 초기화 버튼을 누르면 해당 계정의 비밀번호가 <strong>"1234"</strong>로 변경됩니다.
                </p>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button onClick={() => router.push('/')} className="btn-primary" style={{ width: 'auto' }}>메인으로 돌아가기</button>
            </div>

            {/* SlideOver for Editing */}
            <SlideOver
                isOpen={isSlideOverOpen}
                onClose={() => setIsSlideOverOpen(false)}
                title="에이전트 수정"
            >
                <AgentEditForm
                    agent={selectedAgent}
                    onSave={handleSaveAgent}
                    onCancel={() => setIsSlideOverOpen(false)}
                />
            </SlideOver>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000 // Higher than SlideOver
                }}>
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        width: '400px',
                        maxWidth: '90%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>확인</h3>
                        <p style={{ marginBottom: '24px', color: '#4e5968', lineHeight: '1.5' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d6db',
                                    background: 'white',
                                    cursor: 'pointer',
                                    color: '#333'
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={executeAction}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: confirmModal.type === 'DELETE' ? '#e93e2f' : '#3182f6',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {confirmModal.type === 'DELETE' ? '삭제' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
