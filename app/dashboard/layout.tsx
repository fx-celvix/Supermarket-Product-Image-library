"use client";

import Link from "next/link";
import { ShoppingBasket, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { logout, user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
                <div className="container-custom h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-green to-brand-green-dark text-white shadow-md shadow-brand-green/20 group-hover:scale-105 transition-transform duration-200">
                            <ShoppingBasket className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Grocery<span className="text-brand-green">Lib</span>
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-6 ml-10">
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green transition-colors"
                        >
                            Overview
                        </Link>
                        <Link
                            href="/dashboard/products"
                            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green transition-colors"
                        >
                            Products
                        </Link>
                        <Link
                            href="/dashboard/categories"
                            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green transition-colors"
                        >
                            Categories
                        </Link>
                        <Link
                            href="/dashboard/users"
                            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green transition-colors"
                        >
                            Users
                        </Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-medium text-sm">
                                    {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
                                    {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                                </span>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="text-slate-500 hover:text-red-500 transition-colors bg-slate-100 dark:bg-slate-900 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Sign Out"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container-custom py-8">
                {children}
            </main>
        </div>
    );
}
