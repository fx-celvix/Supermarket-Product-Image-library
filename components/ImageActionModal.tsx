"use client";

import { useState, useEffect } from 'react';
import { Copy, Download, Check, X, Link2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ImageActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    title: string;
    subtitle?: string;
}

export default function ImageActionModal({
    isOpen,
    onClose,
    imageUrl,
    title,
    subtitle
}: ImageActionModalProps) {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(imageUrl);
            setCopied(true);
            toast.success('Image link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
            toast.error('Failed to copy link');
        }
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const filename = `${title.replace(/\s+/g, '-').toLowerCase()}.${extension}`;

            // STRATEGY 1: Proxy Download (Preferred)
            try {
                const response = await fetch(`/api/download-image?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`);

                if (response.ok) {
                    const blob = await response.blob();
                    downloadBlob(blob, filename);
                    toast.success('Download started');
                    onClose();
                    return;
                }

                console.warn(`Proxy download failed with status ${response.status}. Falling back.`);
            } catch (proxyError) {
                console.warn("Proxy download error. Falling back.", proxyError);
            }

            // STRATEGY 2: Client Direct Fetch (CORS)
            try {
                const response = await fetch(imageUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    downloadBlob(blob, filename);
                    toast.success('Download started');
                    onClose();
                    return;
                }
            } catch (clientError) {
                console.warn("Client fetch failed. Falling back to new tab.", clientError);
            }

            // STRATEGY 3: Last Resort (New Tab)
            window.open(imageUrl, '_blank');
            toast('Image opened in new tab', {
                description: 'Right-click and "Save Image As" to save it.'
            });

        } catch (error: any) {
            console.error('All download strategies failed:', error);
            toast.error('Failed to download image');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
                className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Image Preview */}
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-contain p-8"
                    />
                </div>

                {/* Info & Actions */}
                <div className="p-6">
                    {/* Title */}
                    <div className="mb-5 text-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCopyLink}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-all active:scale-95"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5 text-green-500" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Link2 className="w-5 h-5" />
                                    <span>Copy Link</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-green hover:bg-brand-green-dark text-white rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
                        >
                            {downloading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Downloading...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5" />
                                    <span>Download</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
