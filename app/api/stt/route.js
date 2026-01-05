
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { createConversation, saveMessage } from '@/lib/chat-service';

export async function POST(request) {
    try {
        const body = await request.json();
        const { urls, config, conversationId, agentId } = body;

        console.log("STT Request Received:");
        console.log(`- URLs: ${urls}`);
        console.log(`- Config:`, config);

        if (!urls || urls.length === 0) {
            return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
        }

        // 1. Auth & Conversation
        let user = await getUserFromSession();
        const userId = user ? user.id : 1;

        let currentConversationId = conversationId;
        if (!currentConversationId) {
            const title = `VIDEO ANALYSIS: ${urls[0].substring(0, 20)}...`;
            const newConv = createConversation(userId, title);
            currentConversationId = newConv.id;
        }

        // 2. User Message Save
        // 여러 URL일 경우 문자열로 합쳐서 저장
        const userContent = `[URL 분석 요청] ${urls.join(', ')}`;
        saveMessage(currentConversationId, 'user', userContent);

        const results = [];

        for (const url of urls) {
            try {
                // FormData 생성
                const formData = new FormData();
                formData.append('input_source', url);
                formData.append('config', JSON.stringify(config));

                const apiResponse = await fetch('http://192.168.120.101:18018/playground/video/', {
                    method: 'POST',
                    body: formData,
                });

                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    results.push({ url, error: errorText });
                    continue;
                }

                const data = await apiResponse.json();
                console.log(`STT Success for ${url}:`, data);

                // 큐에 추가된 결과를 반환
                results.push({ url, output: data });

                // Note: 여기서는 "작업 시작됨" 메시지를 굳이 DB에 저장할 필요는 없음. 
                // 나중에 완료되면 result API에서 저장하거나, 프론트가 polling 완료 후 처리.
                // 하지만 polling API에서 저장하려면 conversationId를 넘겨야 함.

            } catch (err) {
                console.error(`Processing Error for ${url}:`, err);
                results.push({ url, error: err.message });
            }
        }

        return NextResponse.json({ results, conversationId: currentConversationId });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
