import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        // 1. 인증 확인
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. 사용자 문서 목록 조회
        const stmt = db.prepare(`
            SELECT id, doc_id, filename, pages, chunks, uploaded_at
            FROM rag_documents
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
        `);
        const documents = stmt.all(user.username);

        return NextResponse.json({
            success: true,
            documents
        });

    } catch (error) {
        console.error('Doc list error:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        // 1. 인증 확인
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. 요청 파라미터 확인
        const { searchParams } = new URL(request.url);
        const docId = searchParams.get('doc_id');

        if (!docId) {
            return NextResponse.json({ error: 'doc_id is required' }, { status: 400 });
        }

        // 3. DB에서 문서 삭제 (해당 사용자의 문서만)
        const stmt = db.prepare(`
            DELETE FROM rag_documents
            WHERE user_id = ? AND doc_id = ?
        `);
        const result = stmt.run(user.username, docId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Doc delete error:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}
