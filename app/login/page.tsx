"use client";

import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Play } from 'lucide-react';
import { SparklesText } from '@/components/ui/sparkles-text';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import HowItWorksModal from '@/components/HowItWorksModal';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const { login, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showHowItWorks, setShowHowItWorks] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
            toast.success('Successfully logged in!');
        } catch (error: any) {
            if (error.message.includes("Email not confirmed")) {
                toast.warning('Please confirm your email address.', {
                    description: "We've sent you a confirmation link.",
                });
            } else if (error.message.includes("Invalid login credentials")) {
                toast.error('Invalid email or password.');
            } else {
                toast.error('Login failed.', { description: error.message });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error: any) {
            toast.error('Google sign-in failed', { description: error.message });
        }
    };

    return (
        <>
            <main className="min-h-screen flex bg-[#060B16] relative overflow-hidden">
                {/* Single ambient glow */}
                <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-emerald-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

                {/* Left - Brand */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-20 relative z-10">
                    <div className="max-w-lg">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-16">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-semibold text-white tracking-tight">
                                Celvix <span className="text-emerald-400">Studio</span>
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight mb-6">
                            Product <SparklesText className="inline-block text-[3.5rem]" sparklesCount={10}>images</SparklesText>,<br />
                            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">ready to use.</span>
                        </h1>

                        <p className="text-lg text-slate-400 leading-relaxed mb-12 max-w-sm">
                            30,000+ high-quality grocery product images. Search, download, done.
                        </p>

                        {/* Minimal stats */}
                        <div className="flex gap-10">
                            <div>
                                <p className="text-2xl font-bold text-white">30K+</p>
                                <p className="text-xs text-slate-500 mt-1">Products</p>
                            </div>
                            <div className="w-px bg-white/10" />
                            <div>
                                <p className="text-2xl font-bold text-white">50+</p>
                                <p className="text-xs text-slate-500 mt-1">Categories</p>
                            </div>
                            <div className="w-px bg-white/10" />
                            <div>
                                <p className="text-2xl font-bold text-white">Free</p>
                                <p className="text-xs text-slate-500 mt-1">Downloads</p>
                            </div>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => setShowHowItWorks(true)}
                            className="mt-12 flex items-center gap-2.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors group"
                        >
                            <span className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                <Play className="h-3.5 w-3.5 text-emerald-400 ml-0.5" />
                            </span>
                            See how it works
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="absolute bottom-8 left-20 flex flex-col gap-1">
                        <a href="https://celvix.in" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                            © 2026 Celvix Technologies
                        </a>
                        <span className="text-[10px] text-slate-600">
                            Designed by <a href="https://celvix.in" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Celvix</a>
                        </span>
                    </div>
                </div>

                {/* Right - Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
                    <div className="w-full max-w-[400px]">
                        {/* Mobile logo */}
                        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <Sparkles className="h-4.5 w-4.5 text-white" />
                            </div>
                            <span className="text-lg font-semibold text-white">
                                Celvix <span className="text-emerald-400">Studio</span>
                            </span>
                        </div>

                        {/* Form card */}
                        <div className="relative rounded-2xl">
                            <GlowingEffect
                                spread={40}
                                glow={true}
                                disabled={false}
                                proximity={64}
                                inactiveZone={0.01}
                                borderWidth={2}
                            />
                            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 relative z-10 bg-[#060B16]">
                                <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
                                <p className="text-sm text-slate-500 mb-7">Access your product library</p>

                                {/* Form */}
                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-1.5">
                                            <label className="text-xs font-medium text-slate-400">Password</label>
                                            <Link href="#" className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">Forgot?</Link>
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                                    >
                                        {isLoading ? (
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                Sign in
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Divider */}
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/[0.06]" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-[#0a0f1c] px-3 text-xs text-slate-600 uppercase tracking-widest">or</span>
                                    </div>
                                </div>

                                {/* Google */}
                                <button
                                    onClick={handleGoogleLogin}
                                    className="w-full flex items-center justify-center gap-2.5 bg-white text-slate-800 font-medium py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continue with Google
                                </button>

                                <p className="mt-6 text-center text-sm text-slate-500">
                                    No account?{' '}
                                    <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                                        Sign up
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {/* Mobile footer */}
                        <div className="mt-8 text-center text-xs text-slate-600 lg:hidden flex flex-col gap-1 items-center">
                            <p>
                                © 2026{' '}
                                <a href="https://celvix.in" target="_blank" rel="noopener noreferrer" className="text-emerald-500/60 hover:text-emerald-400 transition-colors">
                                    Celvix Technologies
                                </a>
                            </p>
                            <span className="text-[10px]">
                                Designed by <a href="https://celvix.in" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Celvix</a>
                            </span>
                        </div>
                    </div>
                </div>
            </main>

            {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
        </>
    );
}
