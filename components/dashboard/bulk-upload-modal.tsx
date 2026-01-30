"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, X } from "lucide-react";
import * as XLSX from "xlsx";

interface ProductRow {
    name: string;
    category: string;
    subcategory?: string;
    price?: number;
    size?: string;
    image_url: string;
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewData, setPreviewData] = useState<ProductRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const supabase = createClient();

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json<ProductRow>(ws);

                // Basic Validation
                const validData: ProductRow[] = [];
                const validationErrors: string[] = [];

                data.forEach((row, index) => {
                    // Relaxed validation: Image URL is no longer strictly required
                    if (!row.name || !row.category) {
                        validationErrors.push(`Row ${index + 2}: Missing required fields (Name or Category)`);
                    } else {
                        validData.push({
                            name: row.name,
                            category: row.category,
                            subcategory: row.subcategory || undefined,
                            price: row.price ? parseFloat(row.price.toString().replace(/[^0-9.]/g, '')) : undefined,
                            size: row.size || undefined,
                            // Use provided URL or a clean fallback placeholder
                            image_url: row.image_url || "https://placehold.co/600x400/png?text=No+Image"
                        });
                    }
                });

                if (validationErrors.length > 0) {
                    setErrors(validationErrors);
                    toast.error(`Found ${validationErrors.length} issues in file.`);
                } else {
                    setErrors([]);
                }

                setPreviewData(validData);
            } catch (error) {
                console.error(error);
                toast.error("Failed to parse Excel file");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleUpload = async () => {
        if (previewData.length === 0) return;

        setIsUploading(true);
        try {
            const BATCH_SIZE = 100;
            const totalBatches = Math.ceil(previewData.length / BATCH_SIZE);

            for (let i = 0; i < totalBatches; i++) {
                const start = i * BATCH_SIZE;
                const end = start + BATCH_SIZE;
                const batch = previewData.slice(start, end);

                const { error } = await supabase
                    .from("products")
                    .insert(batch);

                if (error) throw error;
            }

            toast.success(`Successfully uploaded ${previewData.length} products`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Upload Error:", error);
            toast.error(error.message || "Failed to upload products");
        } finally {
            setIsUploading(false);
        }
    };

    const downloadSample = () => {
        const sampleData = [
            {
                category: "Fruits",
                subcategory: "Tropical",
                name: "Organic Bananas",
                size: "1 kg",
                price: 40,
                image_url: "https://images.unsplash.com/photo-1603833665858-e61d17a8622e"
            },
            {
                category: "Dairy",
                subcategory: "Milk",
                name: "Whole Milk",
                size: "1 L",
                price: 60,
                image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Products");
        XLSX.writeFile(wb, "product_upload_template.xlsx");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bulk Upload Products</h2>
                        <p className="text-sm text-slate-500 mt-1">Upload multiple products via Excel</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Step 1: Download Template */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-blue-900 dark:text-blue-100">Need a template?</h3>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Download our sample Excel file to get started.</p>
                            </div>
                        </div>
                        <button
                            onClick={downloadSample}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Download Sample
                        </button>
                    </div>

                    {/* Step 2: Upload File */}
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-brand-green/50 hover:bg-brand-green/5 transition-all group cursor-pointer relative">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:text-brand-green transition-colors">
                                <Upload className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">Click or drag Excel file here</p>
                                <p className="text-xs text-slate-500 mt-1">Supports .xlsx and .xls</p>
                            </div>
                        </div>
                    </div>

                    {/* Preview Area */}
                    {errors.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Validation Errors ({errors.length})
                            </h4>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-xs text-red-700 dark:text-red-300 max-h-32 overflow-y-auto">
                                <ul className="list-disc pl-4 space-y-1">
                                    {errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {previewData.length > 0 && errors.length === 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-green-600 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Ready to upload {previewData.length} products
                            </h4>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Name</th>
                                            <th className="px-3 py-2">Category</th>
                                            <th className="px-3 py-2">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {previewData.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 truncate max-w-[150px]">{row.name}</td>
                                                <td className="px-3 py-2">{row.category}</td>
                                                <td className="px-3 py-2">{row.price}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || previewData.length === 0 || errors.length > 0}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-green/20"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Upload Products
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
