"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Copy, Download, Check, ChevronRight, ChevronLeft, FileImage, ArrowDown, Info, FileSpreadsheet, CheckSquare, Square, RotateCcw } from "lucide-react";

const stepsMeta = [
    { title: "Search any product", description: "Instantly find from 30,000+ grocery items" },
    { title: "Browse results", description: "High-quality images, organized by category" },
    { title: "Copy or Download", description: "One click — ready to use anywhere" },
    { title: "Bulk Export", description: "Select multiple products and export as Excel" },
];

const products = [
    { emoji: "🧈", name: "Amul Butter" },
    { emoji: "🥛", name: "Amul Milk" },
    { emoji: "🧀", name: "Amul Cheese" },
];

const bulkProducts = [
    { emoji: "🧈", name: "Butter" },
    { emoji: "🥛", name: "Milk" },
    { emoji: "🧀", name: "Cheese" },
    { emoji: "🍫", name: "Chocolate" },
    { emoji: "🧴", name: "Cream" },
    { emoji: "�", name: "Bread" },
];

// Excel mockup rows
const excelRows = [
    { name: "Amul Butter 500g", category: "Dairy", price: "₹270" },
    { name: "Amul Gold Milk 1L", category: "Dairy", price: "₹34" },
    { name: "Amul Cheese Slices", category: "Dairy", price: "₹120" },
    { name: "Amul Dark Chocolate", category: "Snacks", price: "₹100" },
    { name: "Amul Fresh Cream", category: "Dairy", price: "₹45" },
    { name: "Amul Bread", category: "Bakery", price: "₹40" },
];

export default function HowItWorksModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(0);
    const [typedText, setTypedText] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const [actionState, setActionState] = useState(0);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [bulkSelected, setBulkSelected] = useState<number[]>([]);
    // bulk: 0=info, 1=selecting, 2=exporting, 3=downloading, 4=openExcel, 5=done
    const [bulkPhase, setBulkPhase] = useState(0);
    const [excelProgress, setExcelProgress] = useState(0);
    const [excelRowsVisible, setExcelRowsVisible] = useState(0);
    const [demoEnded, setDemoEnded] = useState(false);

    const query = "Amul";
    const totalSteps = stepsMeta.length;

    const reset = useCallback(() => {
        setTypedText(""); setShowResults(false); setHighlight(-1);
        setActionState(0); setDownloadProgress(0);
        setBulkSelected([]); setBulkPhase(0); setExcelProgress(0);
        setExcelRowsVisible(0); setDemoEnded(false);
    }, []);

    // Step 0: typing
    useEffect(() => {
        if (step !== 0) return;
        reset();
        let i = 0;
        const iv = setInterval(() => {
            if (i <= query.length) { setTypedText(query.slice(0, i)); i++; }
            else { clearInterval(iv); setTimeout(() => setShowResults(true), 300); }
        }, 120);
        return () => clearInterval(iv);
    }, [step, reset]);

    // Step 1: browse
    useEffect(() => {
        if (step !== 1) return;
        reset(); setShowResults(true); setTypedText(query);
        let idx = 0;
        const iv = setInterval(() => { setHighlight(idx); idx++; if (idx >= 3) clearInterval(iv); }, 500);
        return () => clearInterval(iv);
    }, [step, reset]);

    // Step 2: copy → info → download
    useEffect(() => {
        if (step !== 2) return;
        reset(); setShowResults(true); setTypedText(query); setHighlight(0);
        const timers: NodeJS.Timeout[] = [];
        timers.push(setTimeout(() => setActionState(1), 800));
        timers.push(setTimeout(() => setActionState(2), 2200));
        timers.push(setTimeout(() => {
            setActionState(3);
            let prog = 0;
            const progIv = setInterval(() => {
                prog += Math.random() * 18 + 5;
                if (prog >= 100) { prog = 100; clearInterval(progIv); setTimeout(() => setActionState(4), 300); }
                setDownloadProgress(Math.min(prog, 100));
            }, 150);
        }, 4000));
        return () => timers.forEach(clearTimeout);
    }, [step, reset]);

    // Step 3: bulk flow
    useEffect(() => {
        if (step !== 3) return;
        reset();
        const timers: NodeJS.Timeout[] = [];

        // Phase 0: info screen (already default)
        // Phase 1: show grid and start selecting
        timers.push(setTimeout(() => { setBulkPhase(1); setShowResults(true); }, 2200));

        // Select products one by one
        [0, 1, 2, 3, 4, 5].forEach((idx, i) => {
            timers.push(setTimeout(() => setBulkSelected(prev => [...prev, idx]), 2800 + i * 350));
        });

        // Phase 2: export button
        timers.push(setTimeout(() => setBulkPhase(2), 5200));

        // Phase 3: downloading xlsx
        timers.push(setTimeout(() => {
            setBulkPhase(3);
            let prog = 0;
            const progIv = setInterval(() => {
                prog += Math.random() * 15 + 8;
                if (prog >= 100) { prog = 100; clearInterval(progIv); }
                setExcelProgress(Math.min(prog, 100));
            }, 120);
        }, 5800));

        // Phase 4: open excel
        timers.push(setTimeout(() => {
            setBulkPhase(4);
            let row = 0;
            const rowIv = setInterval(() => {
                row++;
                setExcelRowsVisible(row);
                if (row >= excelRows.length) clearInterval(rowIv);
            }, 200);
        }, 7500));

        // Phase 5: done
        timers.push(setTimeout(() => { setBulkPhase(5); setDemoEnded(true); }, 9500));

        return () => timers.forEach(clearTimeout);
    }, [step, reset]);

    // Auto advance (except on last step when demo ends)
    useEffect(() => {
        if (demoEnded) return;
        const delays = [3500, 3500, 7000, 12000];
        const t = setTimeout(() => {
            if (step < totalSteps - 1) setStep(s => s + 1);
        }, delays[step]);
        return () => clearTimeout(t);
    }, [step, totalSteps, demoEnded]);

    const restartDemo = () => {
        setDemoEnded(false);
        setStep(0);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-[#0d1321] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
                <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                    <X className="h-4 w-4" />
                </button>

                <div className="p-6">
                    {/* Step indicator */}
                    <div className="flex items-center gap-1.5 mb-4">
                        {stepsMeta.map((_, i) => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? "w-5 bg-emerald-400" : "w-1.5 bg-white/15"}`} />
                        ))}
                    </div>

                    <h3 className="text-base font-semibold text-white mb-0.5">{stepsMeta[step].title}</h3>
                    <p className="text-xs text-slate-500 mb-5">{stepsMeta[step].description}</p>

                    {/* Animation area */}
                    <div className="rounded-xl bg-[#080c18] border border-white/[0.06] p-4 h-[260px] relative overflow-hidden">

                        {/* ===== STEPS 0–2 ===== */}
                        {step <= 2 && (
                            <>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all duration-400 mb-3 ${step === 0 ? "border-emerald-500/30 bg-emerald-500/[0.06] shadow-[0_0_12px_rgba(16,185,129,0.1)]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                                    <Search className={`h-3 w-3 shrink-0 ${step === 0 ? "text-emerald-400" : "text-slate-600"}`} />
                                    <span className="text-white/80">{typedText}</span>
                                    {step === 0 && <span className="w-px h-3 bg-emerald-400 animate-pulse" />}
                                    {!typedText && <span className="text-slate-600">Search...</span>}
                                </div>

                                <div className={`space-y-1.5 transition-all duration-500 ${showResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                                    {products.map((p, i) => {
                                        const isActive = highlight === i;
                                        const showAction = step === 2 && isActive;
                                        return (
                                            <div key={i} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-300 ${isActive ? "border-emerald-500/30 bg-emerald-500/[0.06] scale-[1.02] shadow-[0_0_16px_rgba(16,185,129,0.08)]" : "border-transparent bg-white/[0.02]"} ${highlight >= 0 && !isActive ? "opacity-40" : ""}`} style={{ transitionDelay: showResults && step !== 2 ? `${i * 80}ms` : "0ms" }}>
                                                <div className="h-8 w-8 rounded-md bg-white/[0.04] flex items-center justify-center text-base shrink-0">{p.emoji}</div>
                                                <span className="text-xs text-white/80 font-medium flex-1 truncate">{p.name}</span>
                                                {showAction && (
                                                    <div className="flex items-center gap-1">
                                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 ${actionState >= 1 ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30" : "bg-white/10 text-slate-400"}`}>
                                                            {actionState >= 1 ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                                        </div>
                                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 ${actionState >= 3 ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30" : "bg-white/10 text-slate-400"}`}>
                                                            {actionState >= 4 ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {actionState === 1 && step === 2 && (
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-medium shadow-lg shadow-emerald-500/30 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                        <Check className="h-3 w-3" /> Link copied!
                                    </div>
                                )}

                                {step === 2 && actionState >= 3 && (
                                    <div className="absolute bottom-0 left-0 right-0 p-3 animate-in slide-in-from-bottom duration-300">
                                        <div className="rounded-lg bg-[#111827] border border-white/[0.08] p-2.5 shadow-xl shadow-black/40">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${actionState >= 4 ? "bg-emerald-500/20" : "bg-blue-500/20"}`}>
                                                    {actionState >= 4 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <FileImage className="h-3.5 w-3.5 text-blue-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[11px] text-white font-medium truncate">amul-butter.png</span>
                                                        <span className="text-[10px] text-slate-500 ml-2 shrink-0">{actionState >= 4 ? "Done" : `${Math.round(downloadProgress)}%`}</span>
                                                    </div>
                                                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-200 ${actionState >= 4 ? "bg-emerald-400" : "bg-blue-400"}`} style={{ width: `${downloadProgress}%` }} />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-[10px] text-slate-600">{actionState >= 4 ? "245 KB — Saved" : `${Math.round(245 * downloadProgress / 100)} KB / 245 KB`}</span>
                                                        {actionState >= 4 && <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5"><ArrowDown className="h-2.5 w-2.5" /> Ready</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ===== STEP 3: Bulk Export ===== */}
                        {step === 3 && (
                            <>
                                {/* Phase 0: Info */}
                                {bulkPhase === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center p-6 animate-in fade-in duration-300">
                                        <div className="text-center space-y-3">
                                            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mx-auto">
                                                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                Instead of downloading 1 by 1,<br />
                                                <span className="text-emerald-400 font-medium">select multiple products</span> and<br />export as an Excel file
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Phase 1-2: Grid selection */}
                                {(bulkPhase === 1 || bulkPhase === 2) && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {bulkProducts.map((p, i) => {
                                                const sel = bulkSelected.includes(i);
                                                return (
                                                    <div key={i} className={`relative rounded-lg border p-2 flex flex-col items-center gap-1.5 transition-all duration-300 ${sel ? "border-emerald-500/40 bg-emerald-500/[0.06]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                                                        {/* Checkbox */}
                                                        <div className={`absolute top-1 right-1 transition-all duration-300 ${sel ? "text-emerald-400 scale-100 opacity-100" : "text-slate-700 scale-75 opacity-50"}`}>
                                                            {sel ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                                                        </div>
                                                        <div className={`h-10 w-10 rounded-md flex items-center justify-center text-xl transition-all duration-300 ${sel ? "bg-emerald-500/10 scale-110" : "bg-white/[0.03]"}`}>
                                                            {p.emoji}
                                                        </div>
                                                        <span className="text-[10px] text-white/70 font-medium text-center leading-tight">{p.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Export button */}
                                        {bulkPhase === 2 && (
                                            <div className="animate-in slide-in-from-bottom duration-200">
                                                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20">
                                                    <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                                                    <span className="text-[11px] text-white font-medium">Export {bulkSelected.length} products as Excel</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Phase 3: Downloading xlsx */}
                                {bulkPhase === 3 && (
                                    <div className="absolute inset-0 flex items-center justify-center p-6 animate-in fade-in duration-300">
                                        <div className="w-full max-w-[240px]">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${excelProgress >= 100 ? "bg-emerald-500/20" : "bg-green-600/20"}`}>
                                                    <FileSpreadsheet className={`h-5 w-5 ${excelProgress >= 100 ? "text-emerald-400" : "text-green-500"}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white font-medium mb-0.5">products-export.xlsx</p>
                                                    <p className="text-[10px] text-slate-500">{excelProgress >= 100 ? "Download complete" : "Downloading..."}</p>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                                                <div className={`h-full rounded-full transition-all duration-200 ${excelProgress >= 100 ? "bg-emerald-400" : "bg-green-500"}`} style={{ width: `${excelProgress}%` }} />
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[10px] text-slate-600">{Math.round(12 * excelProgress / 100)} KB / 12 KB</span>
                                                <span className="text-[10px] text-slate-500">{Math.round(excelProgress)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Phase 4: Excel spreadsheet mockup */}
                                {bulkPhase >= 4 && !demoEnded && (
                                    <div className="animate-in fade-in zoom-in-95 duration-300 h-full">
                                        {/* Mini spreadsheet header */}
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <FileSpreadsheet className="h-3 w-3 text-green-500" />
                                            <span className="text-[10px] text-white/70 font-medium">products-export.xlsx</span>
                                        </div>
                                        {/* Spreadsheet */}
                                        <div className="rounded-md border border-white/[0.08] overflow-hidden text-[9px]">
                                            {/* Header row */}
                                            <div className="grid grid-cols-[1.2fr_0.7fr_0.5fr] bg-green-600/20 border-b border-white/[0.08]">
                                                <div className="px-2 py-1.5 text-green-400 font-semibold border-r border-white/[0.06]">Product Name</div>
                                                <div className="px-2 py-1.5 text-green-400 font-semibold border-r border-white/[0.06]">Category</div>
                                                <div className="px-2 py-1.5 text-green-400 font-semibold">Price</div>
                                            </div>
                                            {/* Data rows */}
                                            {excelRows.map((row, i) => (
                                                <div
                                                    key={i}
                                                    className={`grid grid-cols-[1.2fr_0.7fr_0.5fr] border-b border-white/[0.04] transition-all duration-200 ${i < excelRowsVisible ? "opacity-100" : "opacity-0"} ${i % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.03]"}`}
                                                >
                                                    <div className="px-2 py-1 text-white/70 border-r border-white/[0.04] truncate">{row.name}</div>
                                                    <div className="px-2 py-1 text-white/50 border-r border-white/[0.04]">{row.category}</div>
                                                    <div className="px-2 py-1 text-white/50">{row.price}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Phase 5: Done */}
                                {demoEnded && (
                                    <div className="absolute inset-0 flex items-center justify-center animate-in fade-in duration-300">
                                        <div className="text-center space-y-3">
                                            <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                                                <Check className="h-6 w-6 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium mb-1">That&apos;s it!</p>
                                                <p className="text-[11px] text-slate-500">Search, select, and export — simple.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Info tip for step 2 */}
                    <div className={`overflow-hidden transition-all duration-500 ${step === 2 && actionState === 2 ? "max-h-20 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"}`}>
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20">
                            <Info className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-emerald-300/90 leading-relaxed">You can also download the PNG file for a specific product</p>
                        </div>
                    </div>

                    {/* Nav */}
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => setStep(Math.max(0, step - 1))}
                            disabled={step === 0}
                            className="h-7 w-7 rounded-md border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all disabled:opacity-20"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>

                        {demoEnded ? (
                            <button
                                onClick={restartDemo}
                                className="h-7 px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                                <RotateCcw className="h-3 w-3" /> Show Again
                            </button>
                        ) : (
                            <button
                                onClick={() => step < totalSteps - 1 ? setStep(step + 1) : onClose()}
                                className="h-7 px-3 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                                {step === totalSteps - 1 ? "Got it!" : "Next"} {step < totalSteps - 1 && <ChevronRight className="h-3 w-3" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
