
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { createConversation, saveMessage, getConversation } from '@/lib/chat-service';

export async function POST(request) {
    try {
        const body = await request.json();
        // 클라이언트에서 conversationId도 받을 수 있음
        const { current_input, previous_context, agentId, target_lang, conversationId } = body;

        // Auto-assign user (Default to admin (1) if not logged in for development convenience)
        let user = await getUserFromSession();
        const userId = user ? user.id : 1;

        // 1. Conversation ID 처리
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            // 제목은 첫 메시지 내용으로 (최대 30자)
            const title = current_input.length > 30 ? current_input.substring(0, 30) + '...' : current_input;
            const newConv = createConversation(userId, title);
            currentConversationId = newConv.id;
        }

        // 2. User Message 저장
        saveMessage(currentConversationId, 'user', current_input);

        console.log("Translation Request Received:");
        console.log(`- Agent: ${agentId}`);
        console.log(`- Input: ${current_input}`);
        console.log(`- Conversation ID: ${currentConversationId}`);

        if (agentId === 'translate_language') {
            const response = await fetch('http://192.168.120.101:18014/playground/translate_language/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // 외부 API는 단순 텍스트 번역기이므로 현재 입력값만 전달함.
                    // (만약 외부 API가 문맥을 지원한다면 여기서 previous_context를 활용하여 프롬프트를 구성할 수 있음)
                    text: current_input,
                    target_lang: target_lang || 'ko',
                    previous_context: previous_context || []
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Translation API Error:", response.status, errorText);
                return NextResponse.json({ error: 'Translation API failed', details: errorText }, { status: response.status });
            }

            const data = await response.json();

            // 3. AI Response 저장
            // 외부 API 응답 형식이 { translated: "..." } 라고 가정
            if (data.translated) {
                saveMessage(currentConversationId, 'assistant', data.translated, agentId);
            }

            // 응답에 conversationId 포함
            return NextResponse.json({ ...data, conversationId: currentConversationId });
        }

        return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
