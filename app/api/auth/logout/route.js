import { NextResponse } from 'next/server';

export async function POST(request) {
    const response = NextResponse.json({ success: true, message: 'Logged out' });

    response.cookies.delete('session');

    return response;
}
