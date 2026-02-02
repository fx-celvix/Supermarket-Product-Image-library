"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

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

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <input
            type="text"
            placeholder="Search products..."
            onChange={handleChange}
            value={text}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-sm"
        />
    );
}

