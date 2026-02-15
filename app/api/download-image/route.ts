import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge runtime for better performance

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    let url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'image.jpg';

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Decode URL if it's double-encoded
    try {
        if (url.includes('%25')) {
            url = decodeURIComponent(url);
        }
    } catch { }

    // Handle relative URLs (e.g., /uploads/image.png)
    if (url.startsWith('/')) {
        url = `${req.nextUrl.origin}${url}`;
    }

    console.log(`[Proxy] Downloading: ${url}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.statusText}` },
                { status: response.status }
            );
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
            console.error('Proxy: Empty response from origin');
            return NextResponse.json({ error: 'Empty response from origin' }, { status: 502 });
        }

        // Determine proper file extension from content-type
        const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
            : contentType.includes('png') ? 'png'
                : contentType.includes('webp') ? 'webp'
                    : contentType.includes('svg') ? 'svg'
                        : contentType.includes('gif') ? 'gif'
                            : 'png'; // Default to png

        const finalFilename = `${filename.replace(/\.[^.]+$/, '')}.${ext}`;

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
        headers.set('Content-Length', String(arrayBuffer.byteLength));
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        headers.set('Cache-Control', 'public, max-age=86400');

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers
        });

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error("Proxy download timeout");
            return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
        }
        console.error("Proxy download error:", error.message);
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
