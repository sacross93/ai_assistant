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

export async function POST(request) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { userId, role } = await request.json();

        // Prevent changing own role or removing final admin usually, but for now simple update
        // Prevent changing 'admin' user's role to prevent lockout if it's the only admin
        const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        if (targetUser.username === 'admin' && role !== 'admin') {
            return NextResponse.json({ error: 'Cannot remove admin role from the main admin user' }, { status: 400 });
        }

        const update = db.prepare('UPDATE users SET role = ? WHERE id = ?');
        update.run(role, userId);

        return NextResponse.json({ success: true, message: 'Role updated successfully' });
    } catch (error) {
        console.error('Role update error:', error);
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}
