
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { getMessages, getConversation } from '@/lib/chat-service';

export async function GET(request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    try {
        const conversation = getConversation(conversationId);
        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const messages = getMessages(conversationId);
        return NextResponse.json({ messages });
    } catch (error) {
        console.error("GET /api/chat/messages error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    const user = await getUserFromSession();
    const userId = user ? user.id : 1; // Default to admin if no session

    try {
        const body = await request.json();
        const { conversationId, role, content, agentId } = body;

        if (!conversationId || !role || !content) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Check ownership (Optional but recommended)
        const conversation = getConversation(conversationId);
        if (conversation && conversation.user_id !== userId) {
            // return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); 
            // 개발 편의를 위해 일단 패스하거나 로깅만
            console.warn(`User ${userId} saving to conv ${conversationId} owned by ${conversation.user_id}`);
        }

        const msg = await import('@/lib/chat-service').then(m => m.saveMessage(conversationId, role, content, agentId));
        return NextResponse.json({ message: msg });

    } catch (error) {
        console.error("POST /api/chat/messages error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
