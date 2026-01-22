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

    try {
        const agents = db.prepare('SELECT * FROM agents ORDER BY order_index ASC').all();

        const parsedAgents = agents.map(agent => ({
            ...agent,
            features: JSON.parse(agent.features || '[]')
        }));

        return NextResponse.json({ agents: parsedAgents });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
}
