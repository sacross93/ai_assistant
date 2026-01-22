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
        const { agents } = await request.json(); // Array of { id, order_index }

        const updateOrder = db.prepare('UPDATE agents SET order_index = ? WHERE id = ?');

        const updateTransaction = db.transaction((agentsList) => {
            agentsList.forEach((agent) => {
                updateOrder.run(agent.order_index, agent.id);
            });
        });

        updateTransaction(agents);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reorder failed:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
