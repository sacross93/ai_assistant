import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import db from '@/lib/db';
import { saveMessage, getOrCreateConversation } from '@/lib/chat-service';

const RAG_BASE_URL = 'http://192.168.120.101:18021/playground/rag';

export async function POST(request) {
    try {
        // 1. 인증 확인
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. 요청 바디 파싱
        const body = await request.json();
        const { question, doc_id, doc_ids, all_docs, top_k = 6, max_docs = 20, conversationId } = body;

        if (!question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        // 3. Conversation 처리
        let convId = conversationId;
        if (!convId) {
            convId = getOrCreateConversation(user.id, 'doc-chat', question);
        }

        // 4. 사용자 메시지 저장
        saveMessage(convId, 'user', question, 'doc-chat');

        // 5. RAG API 요청 구성
        let ragPayload = {
            question,
            top_k
        };

        if (all_docs) {
            ragPayload.all_docs = true;
            ragPayload.max_docs = max_docs;
        } else if (doc_ids && doc_ids.length > 0) {
            ragPayload.doc_ids = doc_ids;
        } else if (doc_id) {
            ragPayload.doc_id = doc_id;
        } else {
            // 문서 지정이 없으면 전체 문서 검색
            ragPayload.all_docs = true;
            ragPayload.max_docs = max_docs;
        }

        // 6. RAG API 호출
        const ragResponse = await fetch(`${RAG_BASE_URL}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': user.username
            },
            body: JSON.stringify(ragPayload)
        });

        if (!ragResponse.ok) {
            const errorText = await ragResponse.text();
            console.error('RAG ask error:', errorText);
            return NextResponse.json({ error: 'RAG API failed', details: errorText }, { status: 500 });
        }

        const ragData = await ragResponse.json();

        // 7. 응답 구성 (sources 정보 포함)
        let responseContent = ragData.answer || '답변을 생성하지 못했습니다.';

        // sources 정보가 있으면 포맷팅
        // sources 정보가 있으면 포맷팅
        let sources = [];
        if (ragData.sources && ragData.sources.length > 0) {
            // DB에서 파일명 조회하여 매핑
            try {
                // 중복 제거된 doc_id 목록 추출
                const docIds = [...new Set(ragData.sources.map(s => s.doc_id))].filter(id => id);

                let fileMap = {};
                if (docIds.length > 0) {
                    const placeholders = docIds.map(() => '?').join(',');
                    const stmt = db.prepare(`SELECT doc_id, filename FROM rag_documents WHERE doc_id IN (${placeholders})`);
                    const docs = stmt.all(...docIds);
                    docs.forEach(d => {
                        fileMap[d.doc_id] = d.filename;
                    });
                }

                sources = ragData.sources.map(s => {
                    // DB 파일명 > RAG 반환 파일명 > 기본 '문서'
                    let realFilename = fileMap[s.doc_id] || s.filename;
                    if (!realFilename || realFilename === '문서') {
                        realFilename = fileMap[s.doc_id] || '문서';
                    }

                    return {
                        doc_id: s.doc_id,
                        page: s.page,
                        filename: realFilename,
                        score: s.score
                    };
                });
            } catch (e) {
                console.error("Failed to map source filenames:", e);
                // Fallback
                sources = ragData.sources.map(s => ({
                    doc_id: s.doc_id,
                    page: s.page,
                    filename: s.filename || '문서',
                    score: s.score
                }));
            }
        }

        // 8. 어시스턴트 메시지 저장
        const assistantContent = JSON.stringify({
            answer: responseContent,
            sources: sources
        });
        saveMessage(convId, 'assistant', assistantContent, 'doc-chat');

        return NextResponse.json({
            success: true,
            conversationId: convId,
            answer: responseContent,
            sources: sources,
            doc_ids: ragData.doc_ids || []
        });

    } catch (error) {
        console.error('Doc chat ask error:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}
