"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { FolderIcon, ChevronDown, ChevronRight, Edit2, Upload, Link as LinkIcon, Save, X, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Product {
    category: string;
    subcategory: string | null;
}

interface CategoryMeta {
    id?: string;
    name: string;
    parent_name: string | null;
    image_url: string | null;
    link: string | null;
}

interface MergedCategory {
    name: string;
    parent_name: string | null;
    image_url: string | null;
    link: string | null;
    subcategories: MergedCategory[];
    hasMeta: boolean; // true if exists in categories table
}

export default function CategoriesPage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<MergedCategory[]>([]);
    const [editingCategory, setEditingCategory] = useState<MergedCategory | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit Form State
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editLink, setEditLink] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all products to derive categories (Pagination Loop)
            let products: any[] = [];
            let page = 0;
            let hasMore = true;
            const pageSize = 1000;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('products')
                    .select('category, subcategory')
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    products = [...products, ...data];
                    if (data.length < pageSize) hasMore = false;
                } else {
                    hasMore = false;
                }
                page++;
            }

            // 2. Fetch all metadata from categories table
            const { data: meta, error: metaError } = await supabase
                .from('categories')
                .select('*');

            if (metaError && metaError.code !== '42P01') { // Ignore if table missing initially
                console.error(metaError);
            }

            // 3. Merge Data
            const metaMap = new Map<string, CategoryMeta>();
            (meta || []).forEach((m: CategoryMeta) => {
                const key = `${m.name}:${m.parent_name || 'root'}`;
                metaMap.set(key, m);
            });

            const hierarchy = new Map<string, Set<string>>(); // Main -> Set<Sub>

            products?.forEach(p => {
                if (p.category) {
                    if (!hierarchy.has(p.category)) {
                        hierarchy.set(p.category, new Set());
                    }
                    if (p.subcategory) {
                        hierarchy.get(p.category)?.add(p.subcategory);
                    }
                }
            });

            // Build result structure
            const merged: MergedCategory[] = Array.from(hierarchy.entries()).map(([mainName, subSet]) => {
                const mainKey = `${mainName}:root`;
                const mainMeta = metaMap.get(mainKey);

                return {
                    name: mainName,
                    parent_name: null,
                    image_url: mainMeta?.image_url || null,
                    link: mainMeta?.link || null,
                    hasMeta: !!mainMeta,
                    subcategories: Array.from(subSet).map(subName => {
                        const subKey = `${subName}:${mainName}`;
                        const subMeta = metaMap.get(subKey);
                        return {
                            name: subName,
                            parent_name: mainName,
                            image_url: subMeta?.image_url || null,
                            link: subMeta?.link || null,
                            subcategories: [],
                            hasMeta: !!subMeta
                        };
                    }).sort((a, b) => a.name.localeCompare(b.name))
                };
            }).sort((a, b) => a.name.localeCompare(b.name));

            setCategories(merged);

        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Failed to load categories");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (cat: MergedCategory) => {
        setEditingCategory(cat);
        setEditImageUrl(cat.image_url || '');
        setEditLink(cat.link || '');
    };

    const handleSave = async () => {
        if (!editingCategory) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('categories')
                .upsert({
                    name: editingCategory.name,
                    parent_name: editingCategory.parent_name,
                    image_url: editImageUrl || null,
                    link: editLink || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'name, parent_name' });

            if (error) throw error;

            toast.success("Category updated");
            setEditingCategory(null);
            fetchData(); // Refresh to show changes
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.message || "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        try {
            // Use merged categories state to include derived ones
            const flatData: any[] = [];

            categories.forEach(main => {
                flatData.push({
                    name: main.name,
                    parent_name: null,
                    image_url: main.image_url,
                    link: main.link
                });

                main.subcategories.forEach(sub => {
                    flatData.push({
                        name: sub.name,
                        parent_name: main.name,
                        image_url: sub.image_url,
                        link: sub.link
                    });
                });
            });

            // Convert to Worksheet
            const ws = XLSX.utils.json_to_sheet(flatData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Categories");

            // Write and Download
            XLSX.writeFile(wb, `categories-export-${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Categories exported as Excel");

        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Export failed");
        }
    };

    const handleImportTrigger = () => {
        setShowImportModal(true);
    };

    const handleConfirmImport = () => {
        setShowImportModal(false);
        fileInputRef.current?.click();
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (!Array.isArray(json)) throw new Error("Invalid format");

                // 1. Fetch existing categories to resolve IDs (safest way to prevent duplicates)
                //    This handles cases where unique constraints might be missing or tricky with NULLs
                const { data: existingDocs } = await supabase
                    .from('categories')
                    .select('id, name, parent_name');

                const existingMap = new Map<string, string>(); // "name|parent" -> id
                existingDocs?.forEach((doc: any) => {
                    const key = `${doc.name}|${doc.parent_name || 'null'}`;
                    existingMap.set(key, doc.id);
                });

                // 2. Prepare Payload
                const updates = json.map((c: any) => {
                    const name = c.name?.trim();
                    const parent = c.parent_name?.trim() || null;
                    const key = `${name}|${parent || 'null'}`;
                    const existingId = existingMap.get(key);

                    return {
                        id: existingId, // If ID exists, Supabase will update. If undefined, it handles insert/confilct.
                        name: name,
                        parent_name: parent,
                        image_url: c.image_url || null,
                        link: c.link || null,
                        updated_at: new Date().toISOString()
                    };
                }).filter(r => r.name); // Filter out empty rows

                if (updates.length === 0) throw new Error("No valid data found");

                // 3. Upsert
                // We typically upsert. If we have IDs, it updates by PK.
                // If we don't have IDs, we rely on the unique constraint (name, parent_name).
                const { error } = await supabase
                    .from('categories')
                    .upsert(updates, { onConflict: 'name, parent_name' });
                // Note: onConflict is still good to have, but providing IDs ensures we target correctly if known.

                if (error) throw error;

                toast.success(`Processed ${updates.length} categories`);
                fetchData();
            } catch (error: any) {
                console.error("Import error:", error);
                toast.error("Failed to import: " + error.message);
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Category Manager</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage category images and links.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportFile}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <button
                        onClick={handleImportTrigger}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
                    >
                        <Upload className="w-4 h-4" />
                        {isImporting ? 'Importing...' : 'Import'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {categories.map(main => (
                        <div key={main.name} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                                        {main.image_url ? (
                                            <Image src={main.image_url} alt={main.name} fill className="object-cover" />
                                        ) : (
                                            <FolderIcon className="w-6 h-6 m-auto text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                            {main.name}
                                            {main.hasMeta && <span className="px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold">CUSTOM</span>}
                                        </h3>
                                        <p className="text-sm text-slate-500">{main.subcategories.length} subcategories</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleEdit(main)}
                                    className="p-2 text-slate-500 hover:text-brand-green hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Subcategories */}
                            {main.subcategories.length > 0 && (
                                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/50">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 ml-2">Subcategories</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {main.subcategories.map(sub => (
                                            <div key={sub.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                                <div className="relative w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                                                    {sub.image_url ? (
                                                        <Image src={sub.image_url} alt={sub.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                                                            {sub.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{sub.name}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleEdit(sub)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-brand-green bg-white dark:bg-slate-700 shadow-sm rounded-md transition-all"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Edit {editingCategory.parent_name ? 'Subcategory' : 'Category'}
                            </h2>
                            <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingCategory.name}
                                    disabled
                                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="relative w-12 h-10 rounded bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border">
                                            {editImageUrl ? (
                                                <Image src={editImageUrl} alt="Preview" fill className="object-cover" />
                                            ) : (
                                                <span className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={editImageUrl}
                                            onChange={(e) => setEditImageUrl(e.target.value)}
                                            placeholder="https://... or upload image"
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-green focus:border-transparent outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            Upload Image
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    setIsSaving(true); // Reuse saving state for loading indicator
                                                    try {
                                                        const fileExt = file.name.split('.').pop();
                                                        const fileName = `category-${Date.now()}.${fileExt}`;
                                                        const filePath = `categories/${fileName}`;

                                                        const { error: uploadError } = await supabase.storage
                                                            .from('product-images')
                                                            .upload(filePath, file);

                                                        if (uploadError) throw uploadError;

                                                        const { data: { publicUrl } } = supabase.storage
                                                            .from('product-images')
                                                            .getPublicUrl(filePath);

                                                        setEditImageUrl(publicUrl);
                                                        toast.success("Image uploaded successfully");
                                                    } catch (error: any) {
                                                        console.error("Upload error:", error);
                                                        toast.error("Failed to upload image");
                                                    } finally {
                                                        setIsSaving(false);
                                                    }
                                                }}
                                            />
                                        </label>
                                        <span className="text-xs text-slate-400">
                                            Recommended: 500x500px, max 2MB
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custom Link (Optional)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={editLink}
                                        onChange={(e) => setEditLink(e.target.value)}
                                        placeholder="/collection/custom-slug"
                                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-green focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setEditingCategory(null)}
                                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-2.5 px-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2"
                            >
                                {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Instruction Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Upload className="w-5 h-5 text-brand-green" />
                                Import Categories
                            </h2>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                Export the current listed category/subcategory and update the image url in the excel and then import here.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                className="flex-1 py-2.5 px-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Select File
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
