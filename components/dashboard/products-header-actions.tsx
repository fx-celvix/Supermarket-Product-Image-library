"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload, Download, Trash2, AlertTriangle } from "lucide-react";
import { BulkUploadModal } from "./bulk-upload-modal";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cacheDB } from "@/utils/cache";

export function ProductsHeaderActions() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSuccess = () => {
        router.refresh();
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // 1. Fetch Categories for Images
            const { data: categoryData } = await supabase.from('categories').select('*');
            const catMap: Record<string, string> = {};

            // Create Lookup Map: "parent:name" -> image_url
            // For Root categories: "root:CategoryName"
            // For Subcategories: "CategoryName:SubName"
            categoryData?.forEach((c: any) => {
                const parent = c.parent_name ? c.parent_name.trim() : 'root';
                const name = c.name.trim();
                const key = `${parent}:${name}`.toLowerCase(); // normalize
                if (c.image_url) {
                    catMap[key] = c.image_url;
                }
            });

            // 2. Fetch Products Recursively
            let allProducts: any[] = [];
            let page = 0;
            let hasMore = true;
            const pageSize = 1000;

            while (hasMore) {
                const { data, error } = await supabase
                    .from("products")
                    .select("*")
                    .range(page * pageSize, (page + 1) * pageSize - 1)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                if (data && data.length > 0) {
                    allProducts = [...allProducts, ...data];
                    if (data.length < pageSize) hasMore = false;
                } else {
                    hasMore = false;
                }
                page++;
            }

            if (allProducts.length === 0) {
                toast.error("No products to export");
                return;
            }

            // 3. Map Data with Specific Columns
            const exportData = allProducts.map(p => {
                const catKey = `root:${p.category || ''}`.trim().toLowerCase();
                const subKey = `${p.category || ''}:${p.subcategory || ''}`.trim().toLowerCase();

                return {
                    "category": p.category,          // Column A
                    "subcategory": p.subcategory,    // Column B
                    "name": p.name,                  // Column C
                    "size": p.size,                  // Column D
                    "price": p.price,                // Column E
                    "image_url": p.image_url,        // Column F
                    "Category_image_url": catMap[catKey] || '',    // Column G
                    "subcategory_image_url": catMap[subKey] || '' // Column H
                };
            });

            // Generate Excel
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Products");
            XLSX.writeFile(wb, `Products_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Export successful!");

        } catch (error: any) {
            console.error("Export failed:", error);
            toast.error("Export failed: " + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteAll = async () => {
        setIsDeleting(true);
        try {
            // Delete all products using a filter that matches all rows
            const { error } = await supabase
                .from("products")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (error) {
                console.error("Supabase delete error:", JSON.stringify(error, null, 2));
                throw new Error(error.message || "Permission denied. Make sure you are logged in as admin.");
            }

            // Clear cache
            await cacheDB.clear();

            toast.success("All products deleted successfully");
            setIsDeleteModalOpen(false);
            router.refresh();
        } catch (error: any) {
            console.error("Delete all failed:", error);
            toast.error(error.message || "Failed to delete. Check console for details.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium justify-center flex-1 sm:flex-none"
                >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export'}
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium justify-center flex-1 sm:flex-none"
                >
                    <Upload className="h-4 w-4" />
                    Import
                </button>
                <Link
                    href="/dashboard/new"
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark transition-all transform hover:scale-[1.02] active:scale-95 font-medium justify-center flex-1 sm:flex-none"
                >
                    <Plus className="h-4 w-4" />
                    New Product
                </Link>
                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 hover:border-red-500/40 transition-all font-medium justify-center flex-1 sm:flex-none"
                    title="Delete all products"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete All
                </button>
            </div>

            <BulkUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />

            {/* Delete All Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 text-red-500 shrink-0">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete All Products</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
                            Are you sure you want to permanently delete <strong>all products</strong> from the database? This will remove every product entry and clear the local cache.
                        </p>

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAll}
                                disabled={isDeleting}
                                className="px-4 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" />
                                        Yes, Delete All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
