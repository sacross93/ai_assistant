import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();

        // 클라이언트에서 보낸 구조: { current_input, previous_context, agentId, target_lang }
        const { current_input, previous_context, agentId, target_lang } = body;

        console.log("Translation Request Received:");
        console.log(`- Agent: ${agentId}`);
        console.log(`- Input: ${current_input}`);
        console.log(`- Context Length: ${previous_context ? previous_context.length : 0}`);

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
                    target_lang: target_lang || 'ko'
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Translation API Error:", response.status, errorText);
                return NextResponse.json({ error: 'Translation API failed', details: errorText }, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
