import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('request_id');

        if (!requestId) {
            return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
        }

        console.log(`Polling STT result for: ${requestId}`);

        const apiResponse = await fetch(`http://192.168.120.101:18018/playground/video/result?request_id=${requestId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (apiResponse.status === 404) {
            // 아직 결과가 없음 (처리 중)
            return NextResponse.json({ status: 'processing', detail: '결과를 찾을 수 없습니다' });
        }

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            // console.error(`STT Result Error for ${requestId}:`, errorText);
            // 404 외의 에러는 진짜 에러로 처리
            return NextResponse.json({ error: 'Failed to fetch result', details: errorText }, { status: apiResponse.status });
        }

        // 결과 성공 (200 OK)
        const data = await apiResponse.json();
        return NextResponse.json({ status: 'completed', data: data });

    } catch (error) {
        console.error("Server Result Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
