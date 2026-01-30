"use client";

import Link from 'next/link';
import { ShoppingBasket, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TextRevealCard, TextRevealCardTitle, TextRevealCardDescription } from '@/components/ui/text-reveal-card';

import { toast } from 'sonner';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
            toast.success('Successfully logged in!');
        } catch (error: any) {
            // console.error(error); // Suppressed as per user request (toast is sufficient)
            // Handle Supabase errors gracefully
            if (error.message.includes("Email not confirmed")) {
                toast.warning('Please confirm your email address.', {
                    description: "We've sent you a confirmation link.",
                    action: {
                        label: "Resend",
                        onClick: () => console.log("Resend implementation needed") // Optional: Implement resend
                    }
                });
            } else if (error.message.includes("Invalid login credentials")) {
                toast.error('Invalid email or password.');
            } else {
                toast.error('Login failed.', { description: error.message });
            }
        }
    };

    return (
        <main className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Left Side - App Information */}
            <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-center items-center relative">
                {/* Content */}
                <div className="max-w-lg text-center space-y-8">
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-green to-brand-green-dark text-white shadow-xl shadow-brand-green/30">
                            <ShoppingBasket className="h-8 w-8" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">
                            Grocery<span className="text-brand-green">Lib</span>
                        </span>
                    </div>

                    <TextRevealCard
                        text="You know the business"
                        revealText="We know the technology"
                        className="w-full max-w-lg"
                    >
                        <TextRevealCardTitle>
                            Product Image Library for Grocery Store
                        </TextRevealCardTitle>
                        <TextRevealCardDescription>
                            Hover to reveal our partnership
                        </TextRevealCardDescription>
                    </TextRevealCard>

                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-green/10 border border-brand-green/20">
                        <span className="text-brand-green font-bold text-lg">30,000+</span>
                        <span className="text-slate-600 dark:text-slate-400">pre-loaded products</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none">
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                            Designed by{' '}
                            <a
                                href="https://celvix.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-brand-green hover:underline"
                            >
                                Celvix
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 group mb-6 lg:hidden">
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-green to-brand-green-dark text-white shadow-lg shadow-brand-green/20 group-hover:scale-105 transition-transform duration-200">
                                <ShoppingBasket className="h-6 w-6" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Grocery<span className="text-brand-green">Lib</span>
                            </span>
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h1>
                        <p className="text-slate-500 dark:text-slate-400">Sign in to your account to continue</p>
                    </div>

                    {/* Email Form */}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                <Link href="#" className="text-xs font-medium text-brand-green hover:underline">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="w-full btn-primary py-2.5 shadow-md flex items-center justify-center gap-2 mt-2">
                            Sign in
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Or continue with</span>
                        </div>
                    </div>

                    {/* Social Auth */}
                    <button className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-medium py-2.5 rounded-xl transition-all mb-6 group">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>Continue with Google</span>
                    </button>

                    {/* Footer */}
                    <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                        Don't have an account?{' '}
                        <Link href="/signup" className="font-semibold text-brand-green hover:underline">
                            Sign up
                        </Link>
                    </p>

                    {/* Mobile-only Celvix credit */}
                    <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 lg:hidden">
                        Designed by{' '}
                        <a
                            href="https://celvix.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-brand-green hover:underline"
                        >
                            Celvix
                        </a>
                    </p>
                </div>
            </div>
        </main>
    );
}
