import './globals.css';

export const metadata = {
    title: 'AI Assistant',
    description: 'Personal AI Assistant with Auth',
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                {/* <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" /> */}
            </head>
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
