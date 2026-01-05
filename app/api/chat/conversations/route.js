
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { getConversations, createConversation } from '@/lib/chat-service';

export async function GET(request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const conversations = getConversations(user.id);
        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("GET /api/chat/conversations error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title } = body;

        const conversation = createConversation(user.id, title);
        return NextResponse.json({ conversation });
    } catch (error) {
        console.error("POST /api/chat/conversations error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    try {
        // Ownership check
        const { getConversation, deleteConversation } = await import('@/lib/chat-service');
        const conversation = getConversation(id);

        if (!conversation) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (conversation.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        deleteConversation(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/chat/conversations error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
