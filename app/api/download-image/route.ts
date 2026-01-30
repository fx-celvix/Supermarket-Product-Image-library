import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'image.jpg';

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const blob = await response.blob();
        const headers = new Headers();
        headers.set('Content-Type', blob.type);
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(blob, { headers });
    } catch (error: any) {
        console.error("Proxy download error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
