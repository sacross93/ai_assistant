
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function getUserFromSession() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
        return null; // Not authenticated
    }

    try {
        const { payload } = await jwtVerify(sessionToken, SECRET_KEY);
        // payload should contain { id, username, role, ... }
        return payload;
    } catch (error) {
        console.error("JWT Verification failed:", error);
        return null;
    }
}
