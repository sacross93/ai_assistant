
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { createConversation, saveMessage } from '@/lib/chat-service';

export async function POST(request) {
    try {
        const body = await request.json();
        const { current_input, previous_context, agentId, conversationId } = body;

        // Auto-assign user
        let user = await getUserFromSession();
        const userId = user ? user.id : 1;

        // 1. Conversation ID Handling
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            const title = current_input.length > 30 ? current_input.substring(0, 30) + '...' : current_input;
            const newConv = createConversation(userId, title);
            currentConversationId = newConv.id;
        }

        // 2. Save User Message
        saveMessage(currentConversationId, 'user', current_input);

        console.log("Spell Check Request Received:");
        console.log(`- Agent: ${agentId}`);
        console.log(`- Input Length: ${current_input.length}`);

        if (agentId === 'spellcheck') {
            const formData = new FormData();
            formData.append('text', current_input);
            if (previous_context) {
                formData.append('previous_context', JSON.stringify(previous_context));
            }

            const response = await fetch('http://192.168.120.101:18016/playground/mail/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Spell Check API Error:", response.status, errorText);
                return NextResponse.json({ error: 'Spell Check API failed', details: errorText }, { status: response.status });
            }

            const data = await response.json();

            // Assuming the API returns the result in a field, possibly 'result' or just the body
            // Since we don't know the exact output format, let's check for likely candidates
            // or return the whole data stringified if it's an object.
            // However, usually these agents return a specific key.
            // Let's assume 'result' or 'text' or 'refined_text'. 
            // If the user didn't specify, I will try to find a text field.

            let resultText = "";
            if (typeof data === 'string') resultText = data;
            else if (data.corrected) resultText = data.corrected;
            else if (data.result) resultText = data.result;
            else if (data.text) resultText = data.text;
            else if (data.refined_text) resultText = data.refined_text;
            else if (data.message) resultText = data.message;
            else resultText = JSON.stringify(data); // Fallback

            // 3. Save Assistant Response
            saveMessage(currentConversationId, 'assistant', resultText, agentId);

            return NextResponse.json({ result: resultText, raw: data, conversationId: currentConversationId });
        }

        return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
