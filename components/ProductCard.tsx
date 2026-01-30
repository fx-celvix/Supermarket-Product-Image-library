"use client";

import { useState } from 'react';
import { Copy, Download, Check, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    size?: string;
}

import { GlowingEffect } from "@/components/ui/glowing-effect";

export default function ProductCard({
    product,
    isSelectionMode = false,
    isSelected = false,
    onToggle
}: {
    product: Product;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggle?: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(product.imageUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloading(true);
        try {
            const extension = product.imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const filename = `${product.name.replace(/\s+/g, '-').toLowerCase()}.${extension}`;

            // Use our own API proxy to bypass CORS
            const response = await fetch(`/api/download-image?url=${encodeURIComponent(product.imageUrl)}&filename=${encodeURIComponent(filename)}`);

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download image. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            className={`group relative bg-transparent rounded-2xl border transition-all duration-300 flex flex-col h-full ${isSelected
                ? 'border-brand-green ring-2 ring-brand-green ring-offset-2 dark:ring-offset-slate-950 shadow-md transform scale-[1.02]'
                : 'border-slate-100 dark:border-slate-800 shadow-sm'
                } ${isSelectionMode ? 'cursor-pointer' : ''}`}
            onClick={isSelectionMode && onToggle ? onToggle : undefined}
        >
            <GlowingEffect
                spread={40}
                glow={!isSelectionMode} // Disable glow in selection mode to avoid visual clutter
                disabled={isSelectionMode}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
                className="z-20"
            />

            <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden bg-white dark:bg-slate-900 relative z-10 transition-colors duration-300">
                {/* Selection Checkbox Overlay */}
                {isSelectionMode && (
                    <div className="absolute top-3 right-3 z-30 pointer-events-none">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                            ? 'bg-brand-green border-brand-green text-white'
                            : 'bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-600'
                            }`}>
                            {isSelected && <Check className="w-4 h-4" />}
                        </div>
                    </div>
                )}

                {/* Image Area with Actions Overlay */}
                <div className="relative aspect-square p-6 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden transition-colors duration-300">
                    <div className="relative w-full h-full transition-transform duration-500 group-hover:scale-105">
                        {/* Using a regular img tag for external generic URLs to avoid Next.js config complexity, 
                but normally would use Image with configured domains */}
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain drop-shadow-md"
                            loading="lazy"
                        />
                    </div>

                    {/* Overlay Actions (Only show if NOT in selection mode) */}
                    {!isSelectionMode && (
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-3">
                            <button
                                onClick={handleCopyLink}
                                className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-lg hover:bg-brand-green hover:text-white dark:hover:bg-brand-green dark:hover:text-white text-slate-700 dark:text-slate-200 transition-all transform hover:scale-110 active:scale-95"
                                title="Copy Image Link"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-lg hover:bg-brand-green hover:text-white dark:hover:bg-brand-green dark:hover:text-white text-slate-700 dark:text-slate-200 transition-all transform hover:scale-110 active:scale-95"
                                title="Download Image"
                            >
                                {downloading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Download className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="p-4 flex flex-col gap-1 z-10 bg-white dark:bg-slate-900 transition-colors duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-brand-orange bg-brand-orange/10 px-2 py-1 rounded-md">
                            {product.category}
                        </span>
                        {product.size && <span className="text-xs text-slate-400">{product.size}</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight group-hover:text-brand-green dark:group-hover:text-brand-green transition-colors mt-2">
                        {product.name}
                    </h3>
                </div>
            </div>
        </div>
    );
}
