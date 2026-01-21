import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import db from '@/lib/db';

const RAG_BASE_URL = 'http://192.168.120.101:18021/playground/rag';

export async function POST(request) {
    try {
        // 1. 인증 확인
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. FormData 파싱
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 3. RAG API로 파일 업로드
        const ragFormData = new FormData();
        ragFormData.append('file', file);

        const ragResponse = await fetch(`${RAG_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'X-User-Id': user.username
            },
            body: ragFormData
        });

        if (!ragResponse.ok) {
            const errorText = await ragResponse.text();
            console.error('RAG upload error:', errorText);
            return NextResponse.json({ error: 'RAG upload failed', details: errorText }, { status: 500 });
        }

        const ragData = await ragResponse.json();

        // 4. DB에 문서 정보 저장
        if (ragData.success && ragData.doc_id) {
            const stmt = db.prepare(`
                INSERT INTO rag_documents (user_id, doc_id, filename, pages, chunks)
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(user.username, ragData.doc_id, file.name, ragData.pages || 0, ragData.chunks || 0);
        }

        return NextResponse.json({
            success: true,
            doc_id: ragData.doc_id,
            filename: file.name,
            pages: ragData.pages,
            chunks: ragData.chunks,
            request_id: ragData.request_id
        });

    } catch (error) {
        console.error('Doc upload error:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}
