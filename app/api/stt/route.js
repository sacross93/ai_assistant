import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { urls, config } = body;

        console.log("STT Request Received:");
        console.log(`- URLs: ${urls}`);
        console.log(`- Config:`, config);

        if (!urls || urls.length === 0) {
            return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
        }

        const results = [];

        for (const url of urls) {
            try {
                // FormData 생성 (multipart/form-data 전송용)
                const formData = new FormData();
                formData.append('input_source', url);
                formData.append('config', JSON.stringify(config)); // config 객체를 문자열로 변환하여 전송

                const apiResponse = await fetch('http://192.168.120.101:18018/playground/video/', {
                    method: 'POST',
                    // 헤더에 Content-Type을 명시하지 않음 -> 내장 FormData가 자동으로 boundary 설정
                    body: formData,
                });

                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    // console.error(`STT Error for ${url}:`, errorText);
                    results.push({ url, error: errorText });
                    continue;
                }

                const data = await apiResponse.json();
                console.log(`STT Success for ${url}:`, data);

                // 큐에 추가된 결과를 반환
                results.push({ url, output: data });

            } catch (err) {
                console.error(`Processing Error for ${url}:`, err);
                results.push({ url, error: err.message });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
