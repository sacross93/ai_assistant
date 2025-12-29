'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '', name: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                alert('회원가입이 완료되었습니다. 로그인해주세요.');
                router.push('/login');
            } else {
                const data = await res.json();
                setError(data.error || 'Signup failed');
            }
        } catch (err) {
            setError('An error occurred');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
            <div style={{ width: '400px', padding: '32px', background: 'white', borderRadius: '16px', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 8px 16px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>회원가입</h1>
                <p style={{ textAlign: 'center', color: '#8b95a1', marginBottom: '24px' }}>새로운 계정을 생성합니다.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="이름 (실명)"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={{ padding: '12px', border: '1px solid #e5e8eb', borderRadius: '8px', fontSize: '15px' }}
                        required
                    />
                    <input
                        type="text"
                        placeholder="아이디"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        style={{ padding: '12px', border: '1px solid #e5e8eb', borderRadius: '8px', fontSize: '15px' }}
                        required
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={{ padding: '12px', border: '1px solid #e5e8eb', borderRadius: '8px', fontSize: '15px' }}
                        required
                    />

                    {error && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</p>}

                    <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>가입하기</button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
                    이미 계정이 있으신가요? <Link href="/login" style={{ color: '#3182f6', textDecoration: 'none', fontWeight: '600' }}>로그인</Link>
                </div>
            </div>
        </div>
    );
}
