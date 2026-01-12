import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { createConversation, saveMessage } from '@/lib/chat-service';

export async function POST(request) {
    try {
        const body = await request.json();
        const { current_input, previous_context, agentId, conversationId } = body;

        // Auto-assign user (Default to admin (1) if not logged in for development convenience)
        let user = await getUserFromSession();
        const userId = user ? user.id : 1;

        // 1. Conversation ID handling
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            // Title is first message (max 30 chars)
            const title = current_input.length > 30 ? current_input.substring(0, 30) + '...' : current_input;
            const newConv = createConversation(userId, title);
            currentConversationId = newConv.id;
        }

        // 2. Save User Message
        saveMessage(currentConversationId, 'user', current_input);

        console.log("Report Generation Request Received:");
        console.log(`- Agent: ${agentId}`);
        console.log(`- Input: ${current_input}`);
        console.log(`- Conversation ID: ${currentConversationId}`);

        if (agentId === 'report-gen') {
            const formData = new FormData();
            formData.append('fmt', 'md');
            formData.append('current_input', '');
            formData.append('text', current_input);
            // Convert previous_context to string as requested
            formData.append('previous_context', JSON.stringify(previous_context || []));

            console.log("Sending Report Request (FormData):", {
                fmt: 'md',
                text_len: current_input.length,
                prev_context_len: JSON.stringify(previous_context || []).length
            });

            // Added trailing slash as per curl example
            const response = await fetch('http://192.168.120.101:18015/playground/report/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Report API Error:", response.status, errorText);
                return NextResponse.json({ error: 'Report API failed', details: errorText }, { status: response.status });
            }

            // The curl example -o out.md suggests the response is the raw markdown text
            const responseText = await response.text();
            let reportContent = responseText;

            // Try to parse as JSON just in case it is a JSON wrap
            try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.report || jsonResponse.text || jsonResponse.content || jsonResponse.result) {
                    reportContent = jsonResponse.report || jsonResponse.text || jsonResponse.content || jsonResponse.result;
                }
            } catch (e) {
                // Not JSON, so it's raw text. Keep reportContent as responseText.
            }

            // 3. Save AI Response
            saveMessage(currentConversationId, 'assistant', reportContent, agentId);

            return NextResponse.json({ report: reportContent, conversationId: currentConversationId });
        }

        return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
