"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2, Link as LinkIcon, X } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface ProductFormProps {
    initialData?: {
        id?: string;
        name: string;
        category: string;
        subcategory: string | null;
        price: number | null;
        size: string | null;
        image_url: string;
    };
    isEditMode?: boolean;
}

export function ProductForm({ initialData, isEditMode = false }: ProductFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.image_url || null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        category: initialData?.category || "",
        subcategory: initialData?.subcategory || "",
        price: initialData?.price?.toString() || "",
        size: initialData?.size || "",
    });

    const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
    const [externalUrl, setExternalUrl] = useState("");

    // Fetch Categories
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            // Get unique main categories (parent_name is null)
            const { data } = await supabase
                .from('categories')
                .select('name')
                .is('parent_name', null)
                .order('name');

            if (data) {
                setCategories(data.map(c => c.name));
            }
        };
        fetchCategories();
    }, []);

    // Also handle case where initial data has a category not in the list (e.g. from older products)
    useEffect(() => {
        if (initialData?.category && categories.length > 0 && !categories.includes(initialData.category)) {
            setCategories(prev => [...prev, initialData.category].sort());
        }
    }, [initialData, categories]);

    // Handle External URL Change
    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setExternalUrl(url);
        setPreviewUrl(url);
        setImageFile(null); // Clear file if switching to URL
    };

    // Handle Image Selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setExternalUrl(""); // Clear URL if picking file
        }
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setImageFile(null);
        setExternalUrl("");
        setPreviewUrl(null);
    };

    // Handle Form Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!formData.category) throw new Error("Please select a category");

            let publicUrl = initialData?.image_url;

            if (imageMode === 'url') {
                if (externalUrl) {
                    publicUrl = externalUrl;
                } else if (isEditMode && initialData?.image_url) {
                    publicUrl = initialData.image_url;
                } else {
                    throw new Error("Please enter an image URL");
                }
            } else {
                // Upload Mode
                if (!imageFile && !initialData?.image_url) throw new Error("Please select an image");

                if (imageFile) {
                    const fileExt = imageFile.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(fileName, imageFile);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl: newUrl } } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(fileName);

                    publicUrl = newUrl;
                }
            }

            if (!publicUrl) throw new Error("Image URL missing");

            const productData = {
                name: formData.name,
                category: formData.category,
                subcategory: formData.subcategory || null,
                price: formData.price ? parseFloat(formData.price) : null,
                image_url: publicUrl,
                size: formData.size || null,
            };

            if (isEditMode && initialData?.id) {
                // Update
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', initialData.id);

                if (error) throw error;
                toast.success("Product updated successfully!");
            } else {
                // Create
                const { error } = await supabase
                    .from('products')
                    .insert(productData);

                if (error) throw error;
                toast.success("Product created successfully!");
            }

            router.push('/dashboard/products');
            router.refresh();

        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/products"
                    className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isEditMode ? "Edit Product" : "Add New Product"}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isEditMode ? "Update product details." : "Add a new item to your catalogue."}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">
                            Product Image
                        </label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setImageMode('upload');
                                    setExternalUrl("");
                                    setPreviewUrl(imageFile ? URL.createObjectURL(imageFile) : (initialData?.image_url || null));
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${imageMode === 'upload'
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                            >
                                <Upload className="h-3 w-3" />
                                Upload File
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setImageMode('url');
                                    setImageFile(null);
                                    setPreviewUrl(externalUrl || (isEditMode && initialData?.image_url ? initialData.image_url : null));
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${imageMode === 'url'
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                            >
                                <LinkIcon className="h-3 w-3" />
                                Image URL
                            </button>
                        </div>
                    </div>

                    {imageMode === 'upload' ? (
                        <div className={
                            `relative flex flex-col items-center justify-center w-full h-64 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                            ${previewUrl
                                ? "border-brand-green/50 bg-brand-green/5"
                                : "border-slate-300 dark:border-slate-700 hover:border-brand-green/50 dark:hover:border-brand-green/50 hover:bg-slate-50 dark:hover:bg-slate-900"
                            }`
                        }>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />

                            {previewUrl ? (
                                <>
                                    <Image
                                        src={previewUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <Upload className="h-4 w-4" />
                                            Change Image
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm z-20 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                                        <Upload className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            PNG, JPG or WEBP (MAX. 2MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <input
                                type="url"
                                placeholder="https://example.com/image.jpg"
                                value={externalUrl || ""}
                                onChange={handleUrlChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                            />
                            {previewUrl ? (
                                <div className="relative w-full h-64 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-contain p-2"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-full backdrop-blur-sm transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full h-64 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                                    <span className="text-sm">Image preview will appear here</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">
                            Product Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Fresh Organic Bananas"
                            value={formData.name || ""}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                        />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">
                            Price <span className="text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.price || ""}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                        />
                    </div>

                    {/* Size */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">
                            Size/Quantity <span className="text-slate-500 font-normal">(e.g. 1kg, 500ml)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 1 bunch"
                            value={formData.size || ""}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">
                            Category
                        </label>
                        <select
                            required
                            value={formData.category || ""}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: "" })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all appearance-none"
                        >
                            <option value="">Select a category</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategory */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">
                            Subcategory <span className="text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Citrus"
                            value={formData.subcategory || ""}
                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                        />
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                    <Link
                        href="/dashboard/products"
                        className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-xl bg-brand-green text-white font-medium hover:bg-brand-green-dark transition-colors shadow-lg shadow-brand-green/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isEditMode ? "Updating..." : "Creating..."}
                            </>
                        ) : (
                            isEditMode ? "Update Product" : "Create Product"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
