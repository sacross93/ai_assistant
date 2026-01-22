import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

async function isAdmin(request) {
    const session = request.cookies.get('session');
    if (!session) return false;

    try {
        const { payload } = await jwtVerify(session.value, SECRET_KEY);
        return payload.role === 'admin';
    } catch (e) {
        return false;
    }
}

export async function PUT(request) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { agentId, isActive } = await request.json();

        // 0 or 1
        const statusValue = isActive ? 1 : 0;

        db.prepare('UPDATE agents SET is_active = ? WHERE id = ?').run(statusValue, agentId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Toggle failed:', error);
        return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
    }
}
