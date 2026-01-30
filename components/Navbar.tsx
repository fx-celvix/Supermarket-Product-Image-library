"use client";

import Link from 'next/link';
import { ShoppingBasket, Search, User, LogOut, LayoutDashboard, LifeBuoy } from 'lucide-react';
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SupportModal } from "@/components/SupportModal";

export default function Navbar() {
    const { setTheme, theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const { user, logout } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);



    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors duration-300">
            <div className="container-custom flex h-16 items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-2 group shrink-0">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-green to-brand-green-dark text-white shadow-lg shadow-brand-green/20 group-hover:scale-105 transition-transform duration-200">
                        <ShoppingBasket className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
                        Grocery<span className="text-brand-green">Lib</span>
                    </span>
                </Link>

                {/* Search Bar - Desktop */}
                <div className="hidden md:block flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        onChange={(e) => handleSearch(e.target.value)}
                        defaultValue={searchParams.get('search')?.toString()}
                        className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-sm"
                    />
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <button
                        onClick={() => setIsSupportOpen(true)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green transition-colors"
                    >
                        <LifeBuoy className="h-5 w-5" />
                        <span className="hidden md:inline">Support</span>
                    </button>
                    <ThemeToggle />

                    {user ? (
                        <div className="flex items-center gap-4">
                            {user.email === 'team.celvix@gmail.com' && (
                                <Link
                                    href="/dashboard"
                                    className="p-2 text-slate-500 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                                    title="Go to Dashboard"
                                >
                                    <LayoutDashboard className="h-5 w-5" />
                                </Link>
                            )}

                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-medium">
                                    {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:block">
                                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="text-slate-500 hover:text-red-500 transition-colors"
                                title="Log out"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand-green transition-colors">
                                Log in
                            </Link>
                            <Link href="/signup" className="btn-primary py-2 px-6 shadow-md">
                                Sign up
                            </Link>
                        </div>
                    )}

                </div>
            </div>
            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
        </nav>
    );
}
