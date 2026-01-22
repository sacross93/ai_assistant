import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const agents = db.prepare('SELECT * FROM agents WHERE is_active = 1 ORDER BY order_index ASC').all();

        // Parse JSON features back to array
        const parsedAgents = agents.map(agent => ({
            ...agent,
            features: JSON.parse(agent.features || '[]')
        }));

        return NextResponse.json({ agents: parsedAgents });
    } catch (error) {
        console.error('Failed to fetch agents:', error);
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
}
