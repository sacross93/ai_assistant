
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { createConversation, saveMessage } from '@/lib/chat-service';

export async function POST(request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        let results = [];
        let currentConversationId = null;
        let config = {};
        let urls = [];
        let files = [];
        let agentId = '';
        let userId = 1; // Default user

        // Auth
        let user = await getUserFromSession();
        if (user) userId = user.id;

        // 1. Parse Request Body (JSON or FormData)
        if (contentType.includes('application/json')) {
            const body = await request.json();
            urls = body.urls || [];
            config = body.config || {};
            currentConversationId = body.conversationId;
            agentId = body.agentId;
        } else if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            files = formData.getAll('files'); // Expecting multiple files with key 'files'
            const configString = formData.get('config');
            if (configString) {
                try {
                    config = JSON.parse(configString);
                } catch (e) {
                    console.error("Config Parse Error:", e);
                }
            }
            currentConversationId = formData.get('conversationId');
            if (currentConversationId === 'null') currentConversationId = null;
            agentId = formData.get('agentId');

            // Handle mixed content (URLs in FormData if needed, though usually separated)
            // If the frontend sends URLs in FormData, parse them here.
        }

        console.log(`STT Request Received [${contentType}]:`);
        console.log(`- URLs: ${urls.length}`);
        console.log(`- Files: ${files.length}`);
        console.log(`- Config:`, config);

        if (urls.length === 0 && files.length === 0) {
            return NextResponse.json({ error: 'No URLs or files provided' }, { status: 400 });
        }

        // 2. Conversation & Message Saving
        if (!currentConversationId) {
            const titleSource = files.length > 0 ? files[0].name : urls[0];
            const title = `VIDEO ANALYSIS: ${titleSource.substring(0, 20)}...`;
            const newConv = createConversation(userId, title);
            currentConversationId = newConv.id;
        }

        // Save User Message
        let userContent = "";
        if (files.length > 0) {
            const fileNames = files.map(f => f.name).join(', ');
            userContent = `[파일 분석 요청] ${fileNames}`;
        } else {
            userContent = `[URL 분석 요청] ${urls.join(', ')}`;
        }

        // If there are both (rare case implementation), append
        if (files.length > 0 && urls.length > 0) {
            userContent += `\n[URL 분석 요청] ${urls.join(', ')}`;
        }

        saveMessage(currentConversationId, 'user', userContent);

        // 3. Process URLs
        for (const url of urls) {
            try {
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
                results.push({ url, output: data });

            } catch (err) {
                console.error(`Processing Error for URL ${url}:`, err);
                results.push({ url, error: err.message });
            }
        }

        // 4. Process Files
        for (const file of files) {
            try {
                console.log(`Processing file: ${file.name} (${file.size} bytes)`);

                // Convert File to Buffer -> Blob to ensure node-fetch/undici compatibility
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileBlob = new Blob([buffer], { type: file.type });

                const formData = new FormData();
                formData.append('video_file', fileBlob, file.name);
                formData.append('config', JSON.stringify(config));

                console.log(`Sending file to Python backend: ${file.name}`);

                const apiResponse = await fetch('http://192.168.120.101:18018/playground/video/', {
                    method: 'POST',
                    body: formData,
                    duplex: 'half'
                });

                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    console.error(`Python Backend Error for ${file.name}:`, errorText);
                    results.push({ url: file.name, error: errorText });
                    continue;
                }

                const data = await apiResponse.json();
                console.log(`STT Success for File ${file.name}:`, data);
                results.push({ url: file.name, output: data });

            } catch (err) {
                console.error(`Processing Error for File ${file.name}:`, err);
                results.push({ url: file.name, error: err.message });
            }
        }

        return NextResponse.json({ results, conversationId: currentConversationId });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
