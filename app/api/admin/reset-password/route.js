import db from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
        const { userId, newPassword } = await request.json();
        const hashedPassword = await bcrypt.hash(newPassword || '1234', 10);

        const update = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        update.run(hashedPassword, userId);

        return NextResponse.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
