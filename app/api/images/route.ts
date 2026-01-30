import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Force dynamic processing since we're handling arbitrary query params
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const width = parseInt(searchParams.get('w') || '0', 10);
    const quality = parseInt(searchParams.get('q') || '75', 10);

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    // 1. Source Fetching Strategy
    let imageBuffer: Buffer | null = null;
    let contentType: string | null = null;

    try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Remote Image
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    // Fallback for 403 Forbidden or other errors: Redirect to original URL
                    console.warn(`Failed to fetch remote image: ${url}, Status: ${response.status}`);
                    return NextResponse.redirect(url, 307);
                }

                const arrayBuffer = await response.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
                contentType = response.headers.get('content-type');

            } catch (fetchError) {
                // Fallback for Network/Timeout errors: Redirect to original URL
                console.warn(`Network error fetching remote image: ${url}`, fetchError);
                return NextResponse.redirect(url, 307);
            }

        } else {
            // Local Image (filesystem)
            // Remove leading slash if present to resolve path correctly relative to public/
            const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
            const filePath = path.join(process.cwd(), 'public', cleanUrl);

            if (fs.existsSync(filePath)) {
                imageBuffer = fs.readFileSync(filePath);
                // Basic MIME type detection based on extension could be improved, 
                // but sharp handles buffer irrespective of extension usually.
            } else {
                // Fallback: If not found locally (maybe Vercel serverless env structure looks different?),
                // try fetching via HTTP from the deployment URL itself? 
                // Actually, for now, let's treat ENOENT as a 404 condition.
                console.warn(`Local image not found: ${filePath}`);
                // Return SVG placeholder below
            }
        }

        // 2. Error Resilience (404 Placeholder)
        if (!imageBuffer) {
            const svg = `
        <svg width="${width || 300}" height="${width || 300}" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#eee"/>
          <text x="50%" y="50%" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#aaa">Image n/a</text>
        </svg>
      `;
            return new NextResponse(svg, {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=3600, immutable'
                }
            });
        }

        // 3. Optimization using Sharp
        let pipeline = sharp(imageBuffer);

        // Resize if width provided
        if (width > 0) {
            pipeline = pipeline.resize(width, null, {
                withoutEnlargement: true,
                fit: 'inside' // Maintain aspect ratio
            });
        }

        // Convert to WebP (standard)
        // We could check Accept header here, but WebP is widely supported. 
        // Fallback logic for ancient browsers (e.g. IE11) isn't critical for this app scope usually.
        // Let's optimize to WebP, quality 75, effort 3 (fast)
        const optimizedBuffer = await pipeline
            .webp({ quality, effort: 3 })
            .toBuffer();

        // 4. Response with Caching
        return new NextResponse(optimizedBuffer as any, {
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Vary': 'Accept' // Good practice even if we force WebP for now
            }
        });

    } catch (error) {
        console.error(`Image optimization critical error for ${url}:`, error);
        // Ultimate fallback: Redirect to original if processing dies
        return NextResponse.redirect(url, 307);
    }
}
