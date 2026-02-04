
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { createConversation, saveMessage } from '@/lib/chat-service';

const OCR_BASE_URL = 'http://192.168.120.101:18017/playground/ocr/extract';

export async function POST(request) {
    try {
        // 1. Auth
        let user = await getUserFromSession();
        const userId = user ? user.id : 1;

        // 2. Parse FormData
        const formData = await request.formData();
        const files = formData.getAll('files');
        const mode = formData.get('mode') || 'markdown';
        const maxPages = formData.get('max_pages') || '';
        const dpi = formData.get('dpi') || '150';
        let currentConversationId = formData.get('conversationId');
        if (currentConversationId === 'null' || currentConversationId === '') {
            currentConversationId = null;
        }

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        console.log(`OCR Request: ${files.length} file(s), mode=${mode}, max_pages=${maxPages}, dpi=${dpi}`);

        // 3. Create conversation if needed
        if (!currentConversationId) {
            const firstFileName = files[0]?.name || 'OCR';
            const title = `OCR: ${firstFileName.substring(0, 25)}${firstFileName.length > 25 ? '...' : ''}`;
            const newConv = createConversation(userId, title);
            currentConversationId = newConv.id;
        }

        // 4. Save user message
        const fileNames = files.map(f => f.name).join(', ');
        const userContent = `[OCR 텍스트 추출 요청] ${fileNames}`;
        saveMessage(currentConversationId, 'user', userContent);

        // 5. Build query params for external API
        const params = new URLSearchParams();
        params.set('mode', mode);
        if (maxPages) params.set('max_pages', maxPages);
        params.set('dpi', dpi);

        // 6. Build FormData for external API
        const externalFormData = new FormData();
        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const blob = new Blob([buffer], { type: file.type });
            externalFormData.append('files', blob, file.name);
        }

        // 7. Call external OCR service
        const apiUrl = `${OCR_BASE_URL}?${params.toString()}`;
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            body: externalFormData,
            duplex: 'half'
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('OCR API Error:', apiResponse.status, errorText);
            const errorMsg = `OCR 처리 중 오류가 발생했습니다: ${errorText}`;
            saveMessage(currentConversationId, 'assistant', errorMsg, 'ocr');
            return NextResponse.json({
                error: 'OCR API failed',
                details: errorText,
                conversationId: currentConversationId
            }, { status: apiResponse.status });
        }

        const data = await apiResponse.json();

        // 8. Format response
        let assistantContent = '';

        if (data.success && data.items && data.items.length > 0) {
            if (data.items.length === 1) {
                const item = data.items[0];
                assistantContent = `**OCR 결과** — ${item.filename}\n\n${item.text}`;
            } else {
                assistantContent = `**OCR 결과** (${data.items.length}개 파일)\n\n`;
                data.items.forEach((item, idx) => {
                    assistantContent += `### ${idx + 1}. ${item.filename}\n\n`;
                    assistantContent += `${item.text}\n\n`;
                    if (idx < data.items.length - 1) {
                        assistantContent += `---\n\n`;
                    }
                });
            }

            if (data.total_ms) {
                const seconds = (data.total_ms / 1000).toFixed(1);
                assistantContent += `\n\n---\n_처리 시간: ${seconds}초_`;
            }
        } else {
            assistantContent = 'OCR 처리 결과가 없습니다. 파일을 확인해주세요.';
        }

        // 9. Save assistant message to DB
        saveMessage(currentConversationId, 'assistant', assistantContent, 'ocr');

        // 10. Return response
        return NextResponse.json({
            result: assistantContent,
            items: data.items || [],
            conversationId: currentConversationId,
            mode: data.mode,
            total_ms: data.total_ms
        });

    } catch (error) {
        console.error('OCR Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
