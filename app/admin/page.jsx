'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: null,
        userId: null,
        message: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            } else {
                // Unauthorized or error
                router.push('/');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const res = await fetch('/api/admin/update-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole }),
            });

            if (res.ok) {
                // Optimistic UI update
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
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>관리자 대시보드</h1>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 12px', padding: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>사용자 관리</h2>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                <p style={{ marginTop: '16px', fontSize: '13px', color: '#8b95a1' }}>
                    * 비밀번호 초기화 버튼을 누르면 해당 계정의 비밀번호가 <strong>"1234"</strong>로 변경됩니다.
                </p>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button onClick={() => router.push('/')} className="btn-primary" style={{ width: 'auto' }}>메인으로 돌아가기</button>
            </div>

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
                    zIndex: 1000
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
