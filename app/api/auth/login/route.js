import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create JWT
        const token = await new SignJWT({ id: user.id, username: user.username, role: user.role, name: user.name })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('24h')
            .sign(SECRET_KEY);

        const response = NextResponse.json({ success: true, user: { username: user.username, name: user.name, role: user.role } });

        response.cookies.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
