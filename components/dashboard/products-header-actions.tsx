"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload, Download } from "lucide-react";
import { BulkUploadModal } from "./bulk-upload-modal";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export function ProductsHeaderActions() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
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
            </div>

            <BulkUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </>
    );
}
