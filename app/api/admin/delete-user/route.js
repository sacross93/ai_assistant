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
        const { userId } = await request.json();

        const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        if (targetUser.username === 'admin') {
            return NextResponse.json({ error: 'Cannot delete the main admin user' }, { status: 400 });
        }

        const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
        deleteUser.run(userId);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
