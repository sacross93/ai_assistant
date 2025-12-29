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

export async function GET(request) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = db.prepare('SELECT id, username, name, role FROM users').all();
    return NextResponse.json({ users });
}
