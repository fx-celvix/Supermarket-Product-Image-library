"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function SearchInput() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Get search from URL
    const urlSearch = searchParams.get('search') || '';

    // Local state for immediate input responsiveness
    const [text, setText] = useState(urlSearch);

    // Track if we're the source of the change to avoid sync loops
    const isTypingRef = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync FROM URL to input (when URL changes externally, e.g., category switch clears it)
    useEffect(() => {
        if (!isTypingRef.current) {
            setText(urlSearch);
        }
    }, [urlSearch]);

    // Handle input change with debounce
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setText(value);
        isTypingRef.current = true;

        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set('search', value);
            } else {
                params.delete('search');
            }
            router.replace(`${pathname}?${params.toString()}`);
            isTypingRef.current = false;
        }, 300);
    }, [searchParams, pathname, router]);

    // Clear search instantly
    const clearSearch = useCallback(() => {
        setText('');
        isTypingRef.current = true;

        // Clear any pending debounce
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Update URL immediately
        const params = new URLSearchParams(searchParams.toString());
        params.delete('search');
        router.replace(`${pathname}?${params.toString()}`);
        isTypingRef.current = false;
    }, [searchParams, pathname, router]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="relative w-full">
            <input
                type="text"
                placeholder="Search products..."
                onChange={handleChange}
                value={text}
                className="w-full pl-10 pr-10 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-sm"
            />
            {text && (
                <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

