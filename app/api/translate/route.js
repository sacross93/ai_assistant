
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
            const requestBody = {
                // curl 성공 예시와 동일하게 구성하되, text 필드도 안전하게 추가
                text: current_input,
                current_input: current_input,
                target_lang: target_lang || 'ko',
                // 자바스크립트에서 빈 배열 []은 truthy이므로 명시적으로 체크하여 빈 문자열로 변환해야 함
                previous_context: (Array.isArray(previous_context) && previous_context.length === 0) ? "" : (previous_context || "")
            };

            console.log("Sending to External API:", JSON.stringify(requestBody, null, 2));

            const response = await fetch('http://192.168.120.101:18014/playground/translate_language/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
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
