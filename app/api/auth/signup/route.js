import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password, name } = body;

        if (!username || !password || !name) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insert = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
        insert.run(username, hashedPassword, name, 'user');

        return NextResponse.json({ success: true, message: 'User created' });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
