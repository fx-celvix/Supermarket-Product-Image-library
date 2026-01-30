export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
    // If it's already an absolute URL (e.g. from an external CDN), we still route it through our API 
    // unless specific conditions are met (which we don't have yet).
    // For local images (starting with /), we definitely route them.

    // Construct the API URL
    return `/api/images?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
}
