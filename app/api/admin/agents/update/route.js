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
        const { agentId, name, description, features } = await request.json();

        // Validation
        if (!agentId) {
            return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
        }

        // Build dynamic SQL
        const updates = [];
        const values = [];

        // Handle name update
        if (name !== undefined) {
            const trimmedName = name?.trim();
            if (!trimmedName) {
                return NextResponse.json({ error: 'Name is required' }, { status: 400 });
            }

            if (trimmedName.length > 100) {
                return NextResponse.json({ error: 'Name must be less than 100 characters' }, { status: 400 });
            }

            updates.push('name = ?');
            values.push(trimmedName);
        }

        // Handle description update
        if (description !== undefined) {
            const trimmedDescription = description?.trim() || '';
            if (trimmedDescription.length > 500) {
                return NextResponse.json({ error: 'Description must be less than 500 characters' }, { status: 400 });
            }

            updates.push('description = ?');
            values.push(trimmedDescription);
        }

        // Handle features update
        if (features !== undefined) {
            // Validation
            if (!Array.isArray(features)) {
                return NextResponse.json({ error: 'Features must be an array' }, { status: 400 });
            }

            // Clean and validate
            const cleaned = features.map(f => String(f).trim()).filter(f => f.length > 0);

            if (cleaned.length > 10) {
                return NextResponse.json({ error: 'Maximum 10 features allowed' }, { status: 400 });
            }

            const tooLong = cleaned.find(f => f.length > 100);
            if (tooLong) {
                return NextResponse.json({ error: 'Each feature must be less than 100 characters' }, { status: 400 });
            }

            updates.push('features = ?');
            values.push(JSON.stringify(cleaned));
        }

        // If no updates, return error
        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Add agentId to values for WHERE clause
        values.push(agentId);

        // Execute update - ID is only used in WHERE clause, never in SET
        const sql = `UPDATE agents SET ${updates.join(', ')} WHERE id = ?`;
        const result = db.prepare(sql).run(...values);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Return updated agent
        const updatedAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);

        // Parse features if it's a JSON string
        if (updatedAgent && updatedAgent.features) {
            try {
                updatedAgent.features = JSON.parse(updatedAgent.features);
            } catch (e) {
                // Keep as string if parsing fails
            }
        }

        return NextResponse.json({ success: true, agent: updatedAgent });
    } catch (error) {
        console.error('Update failed:', error);
        return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }
}
